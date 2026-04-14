import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

// rrweb event types (minimal, for buffer management)
interface RrwebEvent {
  // EventType: 2 = FullSnapshot, 3 = IncrementalSnapshot, etc.
  type: number;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const FULL_SNAPSHOT_TYPE = 2;
const META_TYPE = 4; // rrweb Meta event carries viewport width/height
const PORT = 7778;
// If the buffer's FullSnapshot is older than this, we wait for a fresh one
// before serving the new client (to avoid multi-second replay delay).
const STALE_THRESHOLD_MS = 3_000;

// --- State ---
let httpServer: http.Server | null = null;

// SSE client list: each entry is the active ServerResponse for /events
const sseClients = new Set<http.ServerResponse>();

// Clients waiting for a fresh FullSnapshot before they can start playing.
// Keyed by ServerResponse so we can cancel their fallback timer on disconnect.
const pendingClients = new Map<http.ServerResponse, ReturnType<typeof setTimeout>>();

// Called when a fresh FullSnapshot is needed (stale buffer + new client).
// Registered by main.ts; triggers rrweb stop+restart in the renderer.
let checkoutTrigger: (() => void) | null = null;
let checkoutPending = false;

export function setCheckoutTrigger(fn: () => void): void {
  checkoutTrigger = fn;
}

// Heartbeat: send SSE comment every 15 s to keep connections alive on mobile
// (iOS Safari drops SSE connections that have no data for ~30-60 s)
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL_MS = 15_000;

// Ring buffer: [Meta?, FullSnapshot, ...Incrementals]
// The Meta event MUST precede the FullSnapshot so Replayer.handleResize fires
// and the iframe becomes visible.
let eventBuffer: RrwebEvent[] = [];
let lastMetaEvent: RrwebEvent | null = null;

// Root path of the project (resolved once at module load from __dirname)
// __dirname in the Vite build is .vite/build/, so go up two levels.
// Fallback to process.cwd() which is the project root in dev mode.
function getProjectRoot(): string {
  const fromCwd = path.join(process.cwd(), 'node_modules', 'rrweb');
  if (fs.existsSync(fromCwd)) return process.cwd();
  const fromDirname = path.resolve(__dirname, '../../');
  if (fs.existsSync(path.join(fromDirname, 'node_modules', 'rrweb'))) return fromDirname;
  return process.cwd();
}

const PROJECT_ROOT = getProjectRoot();

// --- IP detection ---
export function getLocalIpAddress(): string {
  const nets = os.networkInterfaces();
  const skipPrefixes = ['lo', 'utun', 'awdl', 'llw', 'tun', 'tap', 'veth', 'docker', 'br-'];

  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    const isVirtual = skipPrefixes.some((p) => name.toLowerCase().startsWith(p));
    if (isVirtual) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

// --- Viewer HTML (SSE version) ---
function buildViewerHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>AIterm Live View</title>
  <link rel="stylesheet" href="/rrweb.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #1a1a1a; overflow: hidden; }
    #status {
      position: fixed; top: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.75); color: #fff;
      font: 13px/36px -apple-system, sans-serif; text-align: center;
      z-index: 9999; transition: opacity 0.4s;
    }
    #status.hidden { opacity: 0; pointer-events: none; }
    #player-wrap {
      width: 100vw; height: 100vh;
      overflow: scroll;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x pan-y pinch-zoom;
    }
  </style>
</head>
<body>
  <div id="status">正在连接 AIterm…</div>
  <div id="player-wrap"></div>
  <script src="/rrweb.min.js"></script>
  <script>
    const wrap = document.getElementById('player-wrap');
    const statusEl = document.getElementById('status');

    let replayer = null;
    let es = null;
    // Queue events that arrive before the first FullSnapshot (type=2).
    // Includes Meta (type=4) which carries viewport size — without it the
    // Replayer never calls handleResize and the iframe stays display:none.
    let preSnapshotQueue = [];
    // Source viewport dimensions extracted from Meta event (type=4).
    // Used by scalePlayer to compute CSS transform — more reliable than
    // querying iframeEl.offsetWidth which may be 0 while iframe is hidden.
    let capturedWidth = 0;
    let capturedHeight = 0;
    // Clock offset: serverTime - clientTime (ms).
    // The server embeds its current Date.now() in a __clock__ message sent
    // right at SSE connection. We use this to align startLive() with the
    // server's timeline and eliminate replay delay caused by stale buffers.
    let clockOffset = 0;

    function connect() {
      if (es) { es.close(); es = null; }
      preSnapshotQueue = [];
      capturedWidth = 0;
      capturedHeight = 0;
      clockOffset = 0;

      es = new EventSource('/events');

      es.onopen = () => {
        statusEl.textContent = '已连接，等待画面…';
        statusEl.classList.remove('hidden');
      };

      es.onmessage = (e) => {
        let event;
        try { event = JSON.parse(e.data); } catch { return; }

        // Clock sync message from server — not an rrweb event
        if (event.__clock__ !== undefined) {
          clockOffset = event.__clock__ - Date.now();
          return;
        }

        if (!replayer) {
          // Accumulate ALL events until the first full snapshot arrives
          preSnapshotQueue.push(event);
          // Extract source viewport size from Meta event before Replayer is created
          if (event.type === 4 && event.data) {
            capturedWidth = event.data.width || 0;
            capturedHeight = event.data.height || 0;
          }
          if (event.type !== 2) return;

          try {
            replayer = new rrweb.Replayer(preSnapshotQueue, {
              root: wrap,
              liveMode: true,
            });
            // KEY FIX: use client's current time (adjusted by clock offset) as
            // the live baseline instead of event.timestamp.  This makes rrweb
            // treat all buffered events as "already past due" and new events as
            // "due now", eliminating the up-to-30 s replay delay caused by a
            // stale FullSnapshot in the buffer.
            replayer.startLive(Date.now() + clockOffset);
            preSnapshotQueue = [];
          } catch (err) {
            statusEl.textContent = '播放器初始化失败: ' + err.message;
            preSnapshotQueue = [];
            return;
          }

          statusEl.textContent = '实时查看中';
          requestAnimationFrame(scalePlayer);
          setTimeout(() => statusEl.classList.add('hidden'), 1500);
          return;
        }

        try { replayer.addEvent(event); } catch { /* ignore */ }
      };

      es.onerror = () => {
        statusEl.textContent = '连接断开，5 秒后重连…';
        statusEl.classList.remove('hidden');
        replayer = null;
        preSnapshotQueue = [];
        capturedWidth = 0;
        capturedHeight = 0;
        clockOffset = 0;
        wrap.innerHTML = '';
        es.close();
        es = null;
        setTimeout(connect, 5000);
      };
    }

    function scalePlayer() {
      // Wait for .replayer-wrapper to be inserted by rrweb Replayer
      const wrapperEl = wrap.querySelector('.replayer-wrapper');
      if (!wrapperEl) { requestAnimationFrame(scalePlayer); return; }
      // Use source dimensions from Meta event; fall back to sensible defaults
      const sourceWidth = capturedWidth || 1280;
      const sourceHeight = capturedHeight || 800;
      const scale = window.innerWidth / sourceWidth;
      wrapperEl.style.transform = 'scale(' + scale + ')';
      wrapperEl.style.transformOrigin = 'top left';
      wrap.style.height = (sourceHeight * scale) + 'px';
    }

    window.addEventListener('resize', () => { if (replayer) scalePlayer(); });
    connect();
  </script>
</body>
</html>`;
}

// --- Event Buffer ---
function addToBuffer(event: RrwebEvent): void {
  if (event.type === META_TYPE) {
    // Always track the latest Meta event; it must lead the next FullSnapshot
    lastMetaEvent = event;
    // Do not add to buffer standalone — it will be prepended on next FullSnapshot
    return;
  }

  if (event.type === FULL_SNAPSHOT_TYPE) {
    // Reset buffer, prepending the most recent Meta so Replayer.handleResize fires
    eventBuffer = lastMetaEvent ? [lastMetaEvent, event] : [event];

    // Fresh FullSnapshot arrived — flush any clients that were waiting for it
    checkoutPending = false;
    if (pendingClients.size > 0) {
      for (const [pendingRes, timer] of pendingClients) {
        clearTimeout(timer);
        // Send clock sync first so the viewer can align startLive()
        try { pendingRes.write('data: ' + JSON.stringify({ __clock__: Date.now() }) + '\n\n'); } catch { /* ignore */ }
        for (const e of eventBuffer) sseWrite(pendingRes, e);
        sseClients.add(pendingRes);
      }
      pendingClients.clear();
    }
  } else {
    eventBuffer.push(event);
    // Keep buffer bounded: [Meta?, FullSnapshot, last 500 incrementals]
    if (eventBuffer.length > 502) {
      const fsIdx = eventBuffer.findIndex((e) => e.type === FULL_SNAPSHOT_TYPE);
      if (fsIdx >= 0) {
        eventBuffer = [...eventBuffer.slice(0, fsIdx + 1), ...eventBuffer.slice(-500)];
      }
    }
  }
}

// --- SSE helpers ---
function sseWrite(res: http.ServerResponse, event: RrwebEvent): void {
  try {
    res.write('data: ' + JSON.stringify(event) + '\n\n');
  } catch {
    // client disconnected mid-write; will be cleaned up via 'close' event
  }
}

// --- Broadcast ---
export function broadcastEvent(event: RrwebEvent): void {
  // Always update the buffer so late-connecting clients get a fresh snapshot,
  // but skip the serialization + write cost when nobody is watching.
  const hasViewers = sseClients.size > 0 || pendingClients.size > 0;
  if (!hasViewers && event.type !== FULL_SNAPSHOT_TYPE && event.type !== META_TYPE) {
    // No active or pending clients — skip buffering incremental events entirely.
    // We still buffer Meta and FullSnapshot so the first connecting client
    // always gets a valid starting state.
    return;
  }
  addToBuffer(event);
  for (const res of sseClients) {
    sseWrite(res, event);
  }
}

// --- Gzip helper ---
function serveGzip(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  data: Buffer,
  contentType: string,
): void {
  const acceptEncoding = req.headers['accept-encoding'] ?? '';
  if (/gzip/.test(String(acceptEncoding))) {
    zlib.gzip(data, (err, compressed) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding',
      });
      res.end(compressed);
    });
  } else {
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  }
}

// --- Heartbeat helpers ---
function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const res of sseClients) {
      try {
        // SSE comment — ignored by onmessage, but keeps TCP alive and
        // prevents iOS Safari from closing the connection when the app is idle
        res.write(':ping\n\n');
      } catch {
        // client already disconnected; will be removed on 'close'
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// --- Start / Stop ---
export function startLiveViewServer(): Promise<{ url: string } | { error: string }> {
  return new Promise((resolve) => {
    if (httpServer) {
      resolve({ url: `http://${getLocalIpAddress()}:${PORT}` });
      return;
    }

    const rrwebMinJsPath = path.join(PROJECT_ROOT, 'node_modules', 'rrweb', 'dist', 'rrweb.min.js');
    const rrwebCssPath = path.join(PROJECT_ROOT, 'node_modules', 'rrweb', 'dist', 'rrweb.css');

    const requestHandler: http.RequestListener = (req, res) => {
      const url = req.url ?? '/';

      if (url === '/' || url === '/index.html') {
        const html = Buffer.from(buildViewerHtml(), 'utf-8');
        serveGzip(req, res, html, 'text/html; charset=utf-8');

      } else if (url === '/events') {
        // SSE endpoint — never gzip-compressed (streaming)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // disable nginx buffering if behind proxy
        });
        res.flushHeaders();

        // Always send a clock-sync message first so the viewer can align
        // startLive() with the server's clock, eliminating clock-drift delay.
        try {
          res.write('data: ' + JSON.stringify({ __clock__: Date.now() }) + '\n\n');
        } catch { /* ignore */ }

        // Clean up when the client disconnects
        req.on('close', () => {
          sseClients.delete(res);
          const timer = pendingClients.get(res);
          if (timer !== undefined) {
            clearTimeout(timer);
            pendingClients.delete(res);
          }
        });

        // Determine buffer freshness.  A fresh buffer means the FullSnapshot
        // was recorded less than STALE_THRESHOLD_MS ago — we can serve it
        // immediately and the client will see up-to-date state within ~100 ms.
        // A stale buffer (> threshold) would force the Replayer to replay
        // seconds of history before reaching "now"; instead we trigger a
        // checkout so rrweb emits a fresh Meta+FullSnapshot.
        const fsEvent = eventBuffer.find((e) => e.type === FULL_SNAPSHOT_TYPE);
        const bufferAge = fsEvent ? Date.now() - fsEvent.timestamp : Infinity;

        if (bufferAge < STALE_THRESHOLD_MS || !checkoutTrigger) {
          // Buffer is fresh (or no checkout mechanism available): serve immediately
          for (const event of eventBuffer) {
            sseWrite(res, event);
          }
          sseClients.add(res);
        } else {
          // Stale buffer: wait for a fresh FullSnapshot before starting playback
          const fallbackTimer = setTimeout(() => {
            // Timeout: checkout didn't arrive in time — serve stale buffer
            if (pendingClients.delete(res)) {
              for (const event of eventBuffer) sseWrite(res, event);
              sseClients.add(res);
            }
          }, 3_000);
          pendingClients.set(res, fallbackTimer);

          // Trigger rrweb checkpoint only once (debounce)
          if (!checkoutPending) {
            checkoutPending = true;
            checkoutTrigger();
          }
        }

      } else if (url === '/rrweb.min.js') {
        fs.readFile(rrwebMinJsPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('not found'); return; }
          serveGzip(req, res, data, 'application/javascript');
        });

      } else if (url === '/rrweb.css') {
        fs.readFile(rrwebCssPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('not found'); return; }
          serveGzip(req, res, data, 'text/css');
        });

      } else {
        res.writeHead(404);
        res.end();
      }
    };

    const newHttpServer = http.createServer(requestHandler);

    newHttpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ error: `端口 ${PORT} 已被占用，请先释放该端口` });
      } else {
        resolve({ error: err.message });
      }
    });

    newHttpServer.listen(PORT, () => {
      httpServer = newHttpServer;
      startHeartbeat();
      resolve({ url: `http://${getLocalIpAddress()}:${PORT}` });
    });
  });
}

export function stopLiveViewServer(): void {
  stopHeartbeat();

  // Close pending clients (waiting for fresh snapshot)
  for (const [res, timer] of pendingClients) {
    clearTimeout(timer);
    try { res.end(); } catch { /* ignore */ }
  }
  pendingClients.clear();
  checkoutPending = false;

  // Close all active SSE connections
  for (const res of sseClients) {
    try { res.end(); } catch { /* ignore */ }
  }
  sseClients.clear();
  eventBuffer = [];
  lastMetaEvent = null;

  httpServer?.close();
  httpServer = null;
}
