import { app, BrowserWindow, ipcMain, shell, nativeTheme, Notification, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import started from 'electron-squirrel-startup';
import {
  createSession,
  writeToSession,
  resizeSession,
  disposeSession,
  disposeAllSessions,
  getSessionInfo,
  checkAndUpdateSessionInfo,
  hasSession,
  hasActiveSessions,
  type PtyNotificationEnv,
} from './pty-manager';
import {
  TERMINAL_AGENT_STATUS_AGENTS,
  TERMINAL_AGENT_STATUS_STATES,
  type TerminalAgentStatus,
  type TerminalAgentStatusAgent,
  type TerminalAgentStatusState,
} from './terminal-attention';
import {
  startLiveViewServer,
  stopLiveViewServer,
  broadcastEvent,
  setCheckoutTrigger,
} from './live-view-server';

// Register checkout trigger: when the server needs a fresh FullSnapshot
// (stale buffer + new client connected), it calls this to tell the renderer
// to stop and restart rrweb recording, which emits a fresh Meta+FullSnapshot.
setCheckoutTrigger(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('live-view:force-checkout');
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let attentionServer: http.Server | null = null;
let attentionNotifyUrl = '';
let attentionNotifyToken = '';
const agentStatusBySessionId = new Map<string, TerminalAgentStatus>();
const manualInterruptBySessionId = new Map<string, number>();
const TERMINAL_OUTPUT_FLUSH_MS = 16;
const TERMINAL_CLOSE_CONFIRM_BUTTON_INDEX = 1;
const MANUAL_INTERRUPT_SUPPRESS_MS = 2500;

interface TerminalStreamState {
  attached: boolean;
  pendingOutput: string;
  liveBatch: string;
  flushTimer: ReturnType<typeof setTimeout> | null;
}

const terminalStreamStates = new Map<string, TerminalStreamState>();

function getTerminalOutputChannel(id: string): string {
  return `terminal:output:${id}`;
}

function getTerminalExitChannel(id: string): string {
  return `terminal:exit:${id}`;
}

function ensureTerminalStreamState(id: string): TerminalStreamState {
  const existing = terminalStreamStates.get(id);
  if (existing) return existing;

  const created: TerminalStreamState = {
    attached: false,
    pendingOutput: '',
    liveBatch: '',
    flushTimer: null,
  };
  terminalStreamStates.set(id, created);
  return created;
}

function flushTerminalOutput(id: string): void {
  const state = terminalStreamStates.get(id);
  if (!state) return;

  const data = state.liveBatch;
  state.liveBatch = '';
  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }

  if (!data) return;

  if (state.attached && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(getTerminalOutputChannel(id), data);
    return;
  }

  state.pendingOutput += data;
}

function queueTerminalOutput(id: string, data: string): void {
  if (!data) return;

  const state = ensureTerminalStreamState(id);
  state.liveBatch += data;
  if (state.flushTimer) return;

  state.flushTimer = setTimeout(() => {
    flushTerminalOutput(id);
  }, TERMINAL_OUTPUT_FLUSH_MS);
}

function attachTerminalOutput(id: string): string {
  const state = ensureTerminalStreamState(id);
  flushTerminalOutput(id);
  state.attached = true;
  const bufferedData = state.pendingOutput;
  state.pendingOutput = '';
  return bufferedData;
}

function detachTerminalOutput(id: string): void {
  const state = terminalStreamStates.get(id);
  if (!state) return;
  state.attached = false;
}

function clearTerminalStreamState(id: string): void {
  const state = terminalStreamStates.get(id);
  if (state?.flushTimer) {
    clearTimeout(state.flushTimer);
  }
  terminalStreamStates.delete(id);
}

function clearAllTerminalStreamStates(): void {
  for (const id of terminalStreamStates.keys()) {
    clearTerminalStreamState(id);
  }
}

function disposeAllTerminalSessions(): void {
  agentStatusBySessionId.clear();
  manualInterruptBySessionId.clear();
  clearAllTerminalStreamStates();
  disposeAllSessions();
}

async function confirmCloseWindow(window: BrowserWindow): Promise<boolean> {
  const result = await dialog.showMessageBox(window, {
    type: 'warning',
    buttons: ['取消', '关闭 GUI'],
    defaultId: 0,
    cancelId: 0,
    title: '关闭 AIterm？',
    message: '关闭 GUI 会终止正在运行的终端进程。',
    detail: '所有终端中的命令以及 Codex、Claude Code、OpenCode 等会话都会被终止。重新打开后只恢复 tab 布局和工作目录。',
    noLink: true,
  });
  return result.response === TERMINAL_CLOSE_CONFIRM_BUTTON_INDEX;
}

function getAttentionNotificationEnv(): PtyNotificationEnv | undefined {
  if (!attentionNotifyUrl || !attentionNotifyToken) return undefined;
  return {
    url: attentionNotifyUrl,
    token: attentionNotifyToken,
  };
}

function isTerminalAgentStatusAgent(value: unknown): value is TerminalAgentStatusAgent {
  return typeof value === 'string'
    && TERMINAL_AGENT_STATUS_AGENTS.includes(value as TerminalAgentStatusAgent);
}

function isTerminalAgentStatusState(value: unknown): value is TerminalAgentStatusState {
  return typeof value === 'string'
    && TERMINAL_AGENT_STATUS_STATES.includes(value as TerminalAgentStatusState);
}

function getAgentDisplayName(agent: TerminalAgentStatusAgent): string {
  if (agent === 'claude-code') return 'Claude Code';
  if (agent === 'opencode') return 'OpenCode';
  return 'Codex';
}

function getAgentStatusFallbackMessage(agent: TerminalAgentStatusAgent, state: TerminalAgentStatusState): string {
  const displayName = getAgentDisplayName(agent);
  if (state === 'running') return `${displayName} 正在执行。`;
  if (state === 'completed') return `${displayName} 已完成当前回合。`;
  if (state === 'needs_user') return `${displayName} 等待处理。`;
  if (state === 'error') return `${displayName} 出现异常。`;
  return `${displayName} 当前空闲。`;
}

function getAgentStatusNotificationTitle(status: TerminalAgentStatus): string {
  const displayName = getAgentDisplayName(status.agent);
  if (status.state === 'completed') return `${displayName} 已完成`;
  if (status.state === 'error') return `${displayName} 出现异常`;
  return `${displayName} 需要处理`;
}

function shouldShowAgentStatusNotification(state: TerminalAgentStatusState): boolean {
  return state === 'needs_user' || state === 'completed' || state === 'error';
}

function clearTerminalAgentStatus(
  id: string,
  states?: readonly TerminalAgentStatusState[],
): void {
  const current = agentStatusBySessionId.get(id);
  if (!current) return;
  if (states && !states.includes(current.state)) return;

  agentStatusBySessionId.delete(id);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:agentStatusCleared', { id });
  }
}

function hasRecentManualInterrupt(id: string): boolean {
  const timestamp = manualInterruptBySessionId.get(id);
  if (!timestamp) return false;
  if (Date.now() - timestamp <= MANUAL_INTERRUPT_SUPPRESS_MS) return true;
  manualInterruptBySessionId.delete(id);
  return false;
}

function isManualInterruptInput(data: string): boolean {
  return data.includes('\u0003') || data.includes('\u0004') || data === '\u001b';
}

function markManualTerminalInterrupt(id: string): void {
  manualInterruptBySessionId.set(id, Date.now());
  clearTerminalAgentStatus(id);
}

function sendTerminalAgentStatus(status: TerminalAgentStatus): void {
  if (status.state === 'running') {
    manualInterruptBySessionId.delete(status.id);
  } else if (hasRecentManualInterrupt(status.id)) {
    return;
  }

  if (status.state === 'idle') {
    agentStatusBySessionId.delete(status.id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:agentStatusCleared', { id: status.id });
    }
    return;
  }

  agentStatusBySessionId.set(status.id, status);

  if (shouldShowAgentStatusNotification(status.state)) {
    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: getAgentStatusNotificationTitle(status),
          body: status.message || '请回到 GUI 终端继续处理。',
        });
        notification.on('click', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            clearTerminalAgentStatus(status.id, ['needs_user', 'completed', 'error']);
            mainWindow.webContents.send('terminal:activateSession', { id: status.id });
          }
        });
        notification.show();
      }
    } catch (error) {
      console.error('[terminal-agent-status] Failed to show notification:', error);
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:agentStatus', status);
  }
}

function parseAgentStatusPayload(payload: unknown): TerminalAgentStatus | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;

  if (data.token !== attentionNotifyToken) return null;
  if (typeof data.id !== 'string' || !hasSession(data.id)) return null;
  if (!isTerminalAgentStatusAgent(data.agent)) return null;
  if (typeof data.event !== 'string' || data.event.trim() === '') return null;
  if (!isTerminalAgentStatusState(data.state)) return null;

  const event = data.event.trim();
  const message = typeof data.message === 'string' && data.message.trim()
    ? data.message.trim()
    : getAgentStatusFallbackMessage(data.agent, data.state);

  return {
    id: data.id,
    agent: data.agent,
    state: data.state,
    event,
    message,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
  };
}

function writeHttpResponse(response: http.ServerResponse, statusCode: number, body = ''): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleAttentionRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  if (request.method !== 'POST' || request.url !== '/terminal-attention') {
    writeHttpResponse(response, 404, 'not found');
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body) as unknown;
    const status = parseAgentStatusPayload(payload);
    if (!status) {
      writeHttpResponse(response, 403, 'forbidden');
      return;
    }

    sendTerminalAgentStatus(status);
    writeHttpResponse(response, 204);
  } catch (error) {
    console.error('[terminal-agent-status] Failed to handle request:', error);
    if (!response.headersSent) {
      writeHttpResponse(response, 400, 'bad request');
    }
  }
}

function startAttentionServer(): Promise<void> {
  if (attentionServer) return Promise.resolve();

  attentionNotifyToken = randomBytes(24).toString('hex');

  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      void handleAttentionRequest(request, response);
    });

    server.on('error', (error) => {
      console.error('[terminal-agent-status] Failed to start server:', error);
      attentionNotifyUrl = '';
      attentionNotifyToken = '';
      resolve();
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        attentionNotifyUrl = `http://127.0.0.1:${address.port}/terminal-attention`;
        attentionServer = server;
      }
      resolve();
    });
  });
}

function stopAttentionServer(): void {
  attentionServer?.close();
  attentionServer = null;
  attentionNotifyUrl = '';
  attentionNotifyToken = '';
  agentStatusBySessionId.clear();
  manualInterruptBySessionId.clear();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  let allowNextClose = false;
  let closeConfirmationPending = false;

  // Retry loading if the Vite dev server isn't ready yet
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    let retryCount = 0;
    const maxRetries = 5;

    const loadDevServer = () => {
      mainWindow?.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    };

    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription) => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Failed to load dev server (${errorDescription}), retrying ${retryCount}/${maxRetries}...`,
          );
          setTimeout(loadDevServer, 1000);
        } else {
          console.error(
            `Failed to load dev server after ${maxRetries} retries: ${errorDescription}`,
          );
        }
      },
    );

    loadDevServer();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development (default closed, use Ctrl+Shift+I to open)
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('close', (event) => {
    if (allowNextClose || !hasActiveSessions()) {
      allowNextClose = false;
      return;
    }

    event.preventDefault();
    if (closeConfirmationPending) return;

    closeConfirmationPending = true;
    const window = mainWindow;
    if (!window || window.isDestroyed()) {
      closeConfirmationPending = false;
      return;
    }

    void confirmCloseWindow(window).then((confirmed) => {
      closeConfirmationPending = false;
      if (!confirmed || window.isDestroyed()) return;
      allowNextClose = true;
      window.close();
    });
  });

  mainWindow.on('closed', () => {
    allowNextClose = false;
    closeConfirmationPending = false;
    mainWindow = null;
  });
};

// --- IPC Handlers ---

// terminal:create — create a PTY session and return the session ID
ipcMain.handle(
  'terminal:create',
  (_event, { cols, rows, cwd }: { cols: number; rows: number; cwd?: string }) => {
    const session = createSession(cols, rows, cwd, getAttentionNotificationEnv());
    ensureTerminalStreamState(session.id);

    // Push PTY stdout to renderer
    session.ptyProcess.onData((data: string) => {
      queueTerminalOutput(session.id, data);
    });

    // Throttled CWD change detection on PTY output
    let cwdCheckScheduled = false;
    session.ptyProcess.onData(() => {
      if (cwdCheckScheduled) return;
      cwdCheckScheduled = true;
      setTimeout(async () => {
        cwdCheckScheduled = false;
        const nextInfo = await checkAndUpdateSessionInfo(session.id);
        if (nextInfo && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:sessionInfoChanged', nextInfo);
        }
      }, 1000);
    });

    setTimeout(async () => {
      const nextInfo = await getSessionInfo(session.id);
      if (nextInfo && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:sessionInfoChanged', nextInfo);
      }
    }, 0);

    // Notify renderer when PTY exits
    session.ptyProcess.onExit(
      ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        clearTerminalAgentStatus(session.id);
        manualInterruptBySessionId.delete(session.id);
        const streamState = terminalStreamStates.get(session.id);
        if (streamState) {
          flushTerminalOutput(session.id);
          if (streamState.attached && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(getTerminalExitChannel(session.id), {
              exitCode,
              signal,
            });
          } else {
            streamState.pendingOutput += `\r\n[Process exited with code ${exitCode}]`;
          }
        }
      },
    );

    return { id: session.id };
  },
);

ipcMain.handle('terminal:output:attach', (_event, { id }: { id: string }) => {
  return { bufferedData: attachTerminalOutput(id) };
});

ipcMain.on('terminal:output:detach', (_event, { id }: { id: string }) => {
  detachTerminalOutput(id);
});

// terminal:input — write user input to PTY stdin
ipcMain.on(
  'terminal:input',
  (_event, { id, data }: { id: string; data: string }) => {
    if (isManualInterruptInput(data)) {
      markManualTerminalInterrupt(id);
    } else {
      clearTerminalAgentStatus(id, ['needs_user']);
    }
    writeToSession(id, data);
  },
);

// terminal:resize — sync cols/rows to PTY
ipcMain.on(
  'terminal:resize',
  (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    resizeSession(id, cols, rows);
  },
);

// terminal:dispose — kill PTY and release resources
ipcMain.handle('terminal:dispose', (_event, { id }: { id: string }) => {
  clearTerminalAgentStatus(id);
  manualInterruptBySessionId.delete(id);
  clearTerminalStreamState(id);
  disposeSession(id);
});

// terminal:getSessionInfo — return the latest PTY session info
ipcMain.handle('terminal:getSessionInfo', async (_event, { id }: { id: string }) => {
  return await getSessionInfo(id);
});

// --- Terminal Buffer Persistence ---

const terminalBuffersDir = path.join(app.getPath('userData'), 'terminal-buffers');

function ensureBuffersDir(): void {
  try {
    fs.mkdirSync(terminalBuffersDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

// terminal:saveBuffer — save serialized terminal buffer to file
ipcMain.on(
  'terminal:saveBuffer',
  (_event, { sessionId, content }: { sessionId: string; content: string }) => {
    try {
      ensureBuffersDir();
      const filePath = path.join(terminalBuffersDir, `${sessionId}.txt`);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.warn('[main] Failed to save terminal buffer:', error);
    }
  },
);

// terminal:loadBuffer — load serialized terminal buffer from file
ipcMain.handle(
  'terminal:loadBuffer',
  (_event, { sessionId }: { sessionId: string }) => {
    try {
      const filePath = path.join(terminalBuffersDir, `${sessionId}.txt`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // File doesn't exist or is corrupted — silently skip
    }
    return null;
  },
);

// terminal:cleanupBuffers — delete orphaned buffer files
ipcMain.on(
  'terminal:cleanupBuffers',
  (_event, { activeSessionIds }: { activeSessionIds: string[] }) => {
    try {
      ensureBuffersDir();
      const activeSet = new Set(activeSessionIds);
      const files = fs.readdirSync(terminalBuffersDir);
      for (const file of files) {
        const sessionId = path.basename(file, '.txt');
        if (!activeSet.has(sessionId)) {
          try {
            fs.unlinkSync(path.join(terminalBuffersDir, file));
          } catch {
            // Ignore individual file deletion errors
          }
        }
      }
    } catch {
      // Directory may not exist yet
    }
  },
);

// --- File System IPC Handlers ---

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Use `git check-ignore` to find which entries in a directory are gitignored.
 * Returns a Set of ignored entry names. Returns empty set if not in a git repo.
 * Handles exit code 1 (nothing ignored) gracefully.
 */
function getGitIgnoredNames(dirPath: string, names: string[]): Promise<Set<string>> {
  if (names.length === 0) return Promise.resolve(new Set());

  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', dirPath, 'check-ignore', '--', ...names],
      { timeout: 3000 },
      (_error, stdout) => {
        // exit 0 = some ignored (listed in stdout)
        // exit 1 = nothing ignored (stdout empty)
        // exit 128 = not a git repo
        // Any other error = git not available
        // In all cases, just parse whatever stdout we got
        if (stdout && stdout.trim()) {
          resolve(new Set(stdout.trim().split('\n').filter(Boolean)));
        } else {
          resolve(new Set());
        }
      },
    );
  });
}

/** Recursively check if a directory contains any non-ignored .md files (depth-limited). */
async function directoryContainsMarkdown(dirPath: string, maxDepth = 5): Promise<boolean> {
  if (maxDepth <= 0) return false;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = entries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) return true;
      if (entry.isDirectory()) {
        if (await directoryContainsMarkdown(path.join(dirPath, entry.name), maxDepth - 1)) {
          return true;
        }
      }
    }
  } catch {
    // Permission denied or similar — treat as no markdown
  }
  return false;
}

// fs:readdir — read directory entries, filtering gitignored files
ipcMain.handle('fs:readdir', async (_event, { dirPath }: { dirPath: string }) => {
  try {
    const resolved = path.resolve(dirPath);
    const rawEntries = await fs.promises.readdir(resolved, { withFileTypes: true });

    // Filter out gitignored entries
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(resolved, names);

    const entries = [];
    for (const entry of rawEntries) {
      if (ignored.has(entry.name)) continue;

      const isDir = entry.isDirectory();
      const isFile = entry.isFile();

      // For directories, check if they contain any non-ignored markdown files
      let containsMarkdown: boolean | undefined;
      if (isDir) {
        containsMarkdown = await directoryContainsMarkdown(
          path.join(resolved, entry.name),
        );
      }

      entries.push({
        name: entry.name,
        isDirectory: isDir,
        isFile,
        containsMarkdown,
      });
    }

    return { entries };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:readfile — read file text content (max 1MB)
ipcMain.handle('fs:readfile', async (_event, { filePath }: { filePath: string }) => {
  try {
    const resolved = path.resolve(filePath);
    const stat = await fs.promises.stat(resolved);
    if (stat.size > MAX_FILE_SIZE) {
      return { error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Maximum is 1MB.` };
    }
    const content = await fs.promises.readFile(resolved, 'utf-8');
    return { content };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:writefile — write file text content (max 1MB)
ipcMain.handle(
  'fs:writefile',
  async (_event, { filePath, content }: { filePath: string; content: string }) => {
    try {
      const resolved = path.resolve(filePath);
      if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
        return { error: `File too large (${(Buffer.byteLength(content, 'utf-8') / 1024 / 1024).toFixed(1)}MB). Maximum is 1MB.` };
      }
      await fs.promises.writeFile(resolved, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// fs:read-tree-directory — read direct children for lazy file tree loading
ipcMain.handle(
  'fs:read-tree-directory',
  async (
    _event,
    {
      dirPath,
      options,
    }: {
      dirPath: string;
      options?: ReadTreeDirectoryOptions;
    },
  ) => {
    try {
      const resolved = path.resolve(dirPath);
      const tree = await readTreeDirectory(resolved, options);
      return { tree };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// --- fd availability detection (cached at startup) ---

let fdPath: string | null = null;

function detectFd(): string | null {
  try {
    const result = execFileSync('which', ['fd'], { timeout: 3000, encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}

// --- Tree node type for scan results ---

interface ScanTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
  children?: ScanTreeNode[];
}

/**
 * Build a nested tree structure from a list of relative file paths.
 * E.g. ["docs/a.md", "readme.md"] → tree with dirs and files.
 */
async function buildTreeFromPaths(rootPath: string, relativePaths: string[]): Promise<ScanTreeNode[]> {
  interface DirBucket {
    files: Set<string>;
    subdirs: Map<string, DirBucket>;
  }

  const root: DirBucket = { files: new Set(), subdirs: new Map() };

  for (const relPath of relativePaths) {
    const parts = relPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current.subdirs.has(dirName)) {
        current.subdirs.set(dirName, { files: new Set(), subdirs: new Map() });
      }
      current = current.subdirs.get(dirName) as DirBucket;
    }
    current.files.add(parts[parts.length - 1]);
  }

  async function bucketToNodes(bucket: DirBucket, parentPath: string): Promise<ScanTreeNode[]> {
    const nodes: ScanTreeNode[] = [];

    // Directories
    const dirEntries = [...bucket.subdirs.entries()];
    const dirNodes: ScanTreeNode[] = [];
    for (const [dirName, subBucket] of dirEntries) {
      const dirPath = `${parentPath}/${dirName}`;
      const children = await bucketToNodes(subBucket, dirPath);
      let mtime: number | undefined;
      try {
        const stat = await fs.promises.stat(dirPath);
        mtime = stat.mtimeMs;
      } catch { /* ignore stat errors */ }
      dirNodes.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime,
        children,
      });
    }

    // Files
    const fileNames = [...bucket.files];
    const fileNodes: ScanTreeNode[] = [];
    for (const fileName of fileNames) {
      const filePath = `${parentPath}/${fileName}`;
      let mtime: number | undefined;
      try {
        const stat = await fs.promises.stat(filePath);
        mtime = stat.mtimeMs;
      } catch { /* ignore stat errors */ }
      fileNodes.push({
        name: fileName,
        path: filePath,
        isDirectory: false,
        mtime,
      });
    }

    // Sort: mtime descending, name as tiebreaker
    dirNodes.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    fileNodes.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));

    return [...dirNodes, ...fileNodes];
  }

  return bucketToNodes(root, rootPath);
}

// Common large directories to exclude when scanning project trees.
const PROJECT_EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.cache',
  '__pycache__',
  '.tox',
  'target',
  'coverage',
  '.turbo',
  '.parcel-cache',
  '.vite',
  '.nuxt',
  '.svelte-kit',
];

const SYSTEM_ROOT_EXCLUDED_DIRS = [
  'Applications',
  'System',
  'Library',
  'private',
  'usr',
  'bin',
  'sbin',
  'etc',
  'var',
  'tmp',
  'dev',
  'Volumes',
  'Network',
  'cores',
];

const HOME_ROOT_EXCLUDED_DIRS = [
  'Library',
  '.Trash',
  '.cache',
  '.npm',
  '.pnpm-store',
  '.yarn',
  '.cargo',
  '.rustup',
  '.gradle',
  '.m2',
  '.docker',
  '.vscode',
  '.cursor',
  '.codex',
  '.local',
];

const SYSTEM_SCAN_BLOCKED_ROOTS = SYSTEM_ROOT_EXCLUDED_DIRS.map((dirName) => path.join(path.parse(process.cwd()).root, dirName));

function isSameOrInsidePath(targetPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, targetPath);
  return relative === '' || (relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function isFilesystemRoot(rootPath: string): boolean {
  return path.resolve(rootPath) === path.parse(path.resolve(rootPath)).root;
}

function isHomeRoot(rootPath: string): boolean {
  return path.resolve(rootPath) === path.resolve(os.homedir());
}

function shouldSkipScanningRoot(rootPath: string): boolean {
  const resolved = path.resolve(rootPath);
  return SYSTEM_SCAN_BLOCKED_ROOTS.some((blockedRoot) => isSameOrInsidePath(resolved, blockedRoot));
}

function getExcludedDirNames(rootPath: string): string[] {
  const excluded = new Set(PROJECT_EXCLUDED_DIRS);

  if (isFilesystemRoot(rootPath)) {
    SYSTEM_ROOT_EXCLUDED_DIRS.forEach((dirName) => excluded.add(dirName));
  }

  if (isHomeRoot(rootPath)) {
    HOME_ROOT_EXCLUDED_DIRS.forEach((dirName) => excluded.add(dirName));
  }

  return [...excluded];
}

interface ReadTreeDirectoryOptions {
  specRootPath?: string;
  specDirectoryNames?: string[];
  hiddenFolderNames?: string[];
}

function isSpecRootDirectory(dirPath: string, options?: ReadTreeDirectoryOptions): boolean {
  return !!options?.specRootPath && path.resolve(dirPath) === path.resolve(options.specRootPath);
}

function normalizeSpecDirectoryNames(names?: string[]): string[] {
  if (!names) return [];
  return [...new Set(
    names
      .map((name) => name.trim().replace(/^\/+|\/+$/g, ''))
      .filter((name) => name && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..'),
  )];
}

async function readSpecRootDirectory(
  rootPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  const specDirectoryNames = normalizeSpecDirectoryNames(options?.specDirectoryNames);
  const dirs: ScanTreeNode[] = [];

  for (const dirName of specDirectoryNames) {
    const dirPath = path.join(rootPath, dirName);
    if (shouldSkipScanningRoot(dirPath)) continue;

    try {
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) continue;

      dirs.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime: stat.mtimeMs,
      });
    } catch {
      // Missing or unreadable configured spec directories are simply omitted.
    }
  }

  return dirs;
}

async function readTreeDirectory(
  dirPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  if (shouldSkipScanningRoot(dirPath)) {
    return [];
  }

  if (isSpecRootDirectory(dirPath, options)) {
    return readSpecRootDirectory(dirPath, options);
  }

  const excludedSet = new Set(getExcludedDirNames(dirPath));
  const hiddenSet = new Set(options?.hiddenFolderNames ?? []);
  const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const names = rawEntries.map((e) => e.name);
  const ignored = await getGitIgnoredNames(dirPath, names);
  const dirs: ScanTreeNode[] = [];
  const files: ScanTreeNode[] = [];

  for (const entry of rawEntries) {
    if (entry.name.startsWith('.')) continue;
    if (ignored.has(entry.name)) continue;
    if (excludedSet.has(entry.name)) continue;
    if (entry.isDirectory() && hiddenSet.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (shouldSkipScanningRoot(entryPath)) continue;

    let mtime: number | undefined;
    try {
      const stat = await fs.promises.stat(entryPath);
      mtime = stat.mtimeMs;
    } catch {
      continue;
    }

    if (entry.isDirectory()) {
      dirs.push({
        name: entry.name,
        path: entryPath,
        isDirectory: true,
        mtime,
      });
    } else if (entry.isFile()) {
      files.push({
        name: entry.name,
        path: entryPath,
        isDirectory: false,
        mtime,
      });
    }
  }

  dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
  files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
  return [...dirs, ...files];
}

/**
 * Scan ALL files using `fd` — single subprocess, respects .gitignore automatically.
 * Excludes common large directories.
 */
function scanAllWithFd(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  return new Promise((resolve, reject) => {
    const fd = fdPath as string;
    const excludeArgs = getExcludedDirNames(rootPath).flatMap((d) => ['--exclude', d]);
    const hiddenExcludeArgs = (options?.hiddenFolderNames ?? []).flatMap((d) => ['--exclude', d]);
    execFile(
      fd,
      ['--type', 'f', '--no-hidden', ...excludeArgs, ...hiddenExcludeArgs],
      { cwd: rootPath, timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error && !stdout) {
          reject(error);
          return;
        }
        const lines = (stdout || '').trim().split('\n').filter(Boolean);
        buildTreeFromPaths(rootPath, lines).then(resolve, reject);
      },
    );
  });
}

/**
 * Fallback scan ALL files using Node.js fs — recursive traversal with git check-ignore.
 * Excludes hidden files, gitignored files, and common large directories.
 */
async function scanAllWithNodeFs(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  const excludedSet = new Set(getExcludedDirNames(rootPath));
  const hiddenSet = new Set(options?.hiddenFolderNames ?? []);

  async function scanDir(dirPath: string): Promise<ScanTreeNode[]> {
    const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    const dirs: ScanTreeNode[] = [];
    const files: ScanTreeNode[] = [];

    for (const entry of rawEntries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (excludedSet.has(entry.name)) continue;
      if (entry.isDirectory() && hiddenSet.has(entry.name)) continue;
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await scanDir(entryPath);
        if (children.length > 0) {
          const stat = await fs.promises.stat(entryPath);
          dirs.push({
            name: entry.name,
            path: entryPath,
            isDirectory: true,
            mtime: stat.mtimeMs,
            children,
          });
        }
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(entryPath);
        files.push({
          name: entry.name,
          path: entryPath,
          isDirectory: false,
          mtime: stat.mtimeMs,
        });
      }
    }

    dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  try {
    return await scanDir(rootPath);
  } catch {
    return [];
  }
}

async function scanAllTree(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  if (fdPath) {
    try {
      return await scanAllWithFd(rootPath, options);
    } catch {
      // fd failed for this directory, fall back to Node.js
    }
  }

  return scanAllWithNodeFs(rootPath, options);
}

async function scanAllSpecDirectories(
  rootPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  const specDirectoryNames = normalizeSpecDirectoryNames(options?.specDirectoryNames);
  const dirs: ScanTreeNode[] = [];

  for (const dirName of specDirectoryNames) {
    const dirPath = path.join(rootPath, dirName);
    if (shouldSkipScanningRoot(dirPath)) continue;

    try {
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) continue;

      dirs.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime: stat.mtimeMs,
        children: await scanAllTree(dirPath, options),
      });
    } catch {
      // Missing or unreadable configured spec directories are simply omitted.
    }
  }

  return dirs;
}

/**
 * Scan using `fd` — single subprocess, respects .gitignore automatically.
 */
function scanWithFd(rootPath: string): Promise<ScanTreeNode[]> {
  return new Promise((resolve, reject) => {
    const fd = fdPath as string;
    const excludeArgs = getExcludedDirNames(rootPath).flatMap((d) => ['--exclude', d]);
    execFile(
      fd,
      ['-e', 'md', '--type', 'f', '--no-hidden', ...excludeArgs],
      { cwd: rootPath, timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error && !stdout) {
          reject(error);
          return;
        }
        const lines = (stdout || '').trim().split('\n').filter(Boolean);
        buildTreeFromPaths(rootPath, lines).then(resolve, reject);
      },
    );
  });
}

/**
 * Fallback scan using Node.js fs — recursive traversal with git check-ignore.
 */
async function scanWithNodeFs(rootPath: string): Promise<ScanTreeNode[]> {
  const excludedSet = new Set(getExcludedDirNames(rootPath));

  async function scanDir(dirPath: string): Promise<ScanTreeNode[]> {
    const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    const dirs: ScanTreeNode[] = [];
    const files: ScanTreeNode[] = [];

    for (const entry of rawEntries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (excludedSet.has(entry.name)) continue;
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await scanDir(entryPath);
        // Only include directories that contain markdown (directly or nested)
        if (children.length > 0) {
          const stat = await fs.promises.stat(entryPath);
          dirs.push({
            name: entry.name,
            path: entryPath,
            isDirectory: true,
            mtime: stat.mtimeMs,
            children,
          });
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const stat = await fs.promises.stat(entryPath);
        files.push({
          name: entry.name,
          path: entryPath,
          isDirectory: false,
          mtime: stat.mtimeMs,
        });
      }
    }

    // Directories first, then files, both sorted by mtime descending (name as tiebreaker)
    dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  try {
    return await scanDir(rootPath);
  } catch {
    return [];
  }
}

// fs:scan-md-files — scan all .md files under a directory, return tree structure
ipcMain.handle('fs:scan-md-files', async (_event, { rootPath: dirPath }: { rootPath: string }) => {
  try {
    const resolved = path.resolve(dirPath);
    if (shouldSkipScanningRoot(resolved)) {
      return { tree: [] };
    }
    let tree: ScanTreeNode[];
    if (fdPath) {
      try {
        tree = await scanWithFd(resolved);
      } catch {
        // fd failed for this directory, fall back to Node.js
        tree = await scanWithNodeFs(resolved);
      }
    } else {
      tree = await scanWithNodeFs(resolved);
    }
    return { tree };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:show-in-folder — reveal a file/directory in the system file manager
ipcMain.on('fs:show-in-folder', (_event, { filePath: targetPath }: { filePath: string }) => {
  const resolved = path.resolve(targetPath);
  shell.showItemInFolder(resolved);
});

// fs:file-exists — check if a file exists on disk
ipcMain.handle('fs:file-exists', async (_event, { filePath }: { filePath: string }) => {
  try {
    const resolved = path.resolve(filePath);
    const stat = await fs.promises.stat(resolved);
    return stat.isFile();
  } catch {
    return false;
  }
});

// fs:open-file-preview — notify renderer to open a file in the preview panel
ipcMain.on(
  'fs:open-file-preview',
  (_event, { filePath, line, col }: { filePath: string; line?: number; col?: number }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fs:open-file-preview', {
        filePath: path.resolve(filePath),
        line,
        col,
      });
    }
  },
);

// fs:scan-all-files — scan all files under a directory (excluding common large dirs), return tree structure
ipcMain.handle(
  'fs:scan-all-files',
  async (
    _event,
    {
      rootPath: dirPath,
      options,
    }: {
      rootPath: string;
      options?: ReadTreeDirectoryOptions;
    },
  ) => {
    try {
      const resolved = path.resolve(dirPath);
      if (shouldSkipScanningRoot(resolved)) {
        return { tree: [] };
      }

      const tree = isSpecRootDirectory(resolved, options)
        ? await scanAllSpecDirectories(resolved, options)
        : await scanAllTree(resolved, options);

      return { tree };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// --- Git IPC Handlers ---

// git:diff — return raw `git diff HEAD` output for a given directory
ipcMain.handle('git:diff', async (_event, { cwd }: { cwd: string }) => {
  try {
    const resolved = path.resolve(cwd);
    return await new Promise<{ diff: string } | { error: string }>((resolve) => {
      execFile(
        'git',
        ['-C', resolved, 'diff', 'HEAD'],
        { timeout: 10_000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout) => {
          if (error && !stdout) {
            resolve({ error: error.message });
          } else {
            resolve({ diff: stdout ?? '' });
          }
        },
      );
    });
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// git:status-summary — return parsed `git status --porcelain` output
ipcMain.handle('git:status-summary', async (_event, { cwd }: { cwd: string }) => {
  try {
    const resolved = path.resolve(cwd);
    return await new Promise<{ summary: GitStatusSummary } | { error: string }>((resolve) => {
      execFile(
        'git',
        ['-C', resolved, 'status', '--porcelain'],
        { timeout: 5000 },
        (error, stdout) => {
          if (error && !stdout) {
            resolve({ error: error.message });
          } else {
            const lines = (stdout ?? '').trim().split('\n').filter(Boolean);
            let modified = 0;
            let added = 0;
            let deleted = 0;
            let untracked = 0;
            const files: Array<{ status: string; path: string }> = [];

            for (const line of lines) {
              const statusCode = line.substring(0, 2);
              const filePath = line.substring(3);
              files.push({ status: statusCode.trim(), path: filePath });

              if (statusCode === '??') {
                untracked++;
              } else if (statusCode.includes('D')) {
                deleted++;
              } else if (statusCode.includes('A')) {
                added++;
              } else {
                modified++;
              }
            }

            resolve({
              summary: { modified, added, deleted, untracked, files },
            });
          }
        },
      );
    });
  } catch (err) {
    return { error: (err as Error).message };
  }
});

interface GitStatusSummary {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
  files: Array<{ status: string; path: string }>;
}

// --- App Lifecycle ---

// theme:set — sync Electron native theme with renderer
ipcMain.on('theme:set', (_event, { mode }: { mode: 'light' | 'dark' | 'system' }) => {
  nativeTheme.themeSource = mode;
});

// --- Tab State Persistence (file-based) ---
// Renderer localStorage is unreliable in Electron (Chromium LevelDB may not
// flush to disk before process exit).  Use a plain JSON file in userData instead.

const tabStatePath = path.join(app.getPath('userData'), 'tab-state.json');

// Async fire-and-forget save (used during normal operation)
ipcMain.on('tab-state:save', (_event, json: string) => {
  try {
    fs.writeFileSync(tabStatePath, json, 'utf-8');
  } catch (error) {
    console.warn('[main] Failed to save tab state:', error);
  }
});

// Sync save (used in renderer beforeunload to guarantee write before exit)
ipcMain.on('tab-state:save-sync', (event, json: string) => {
  try {
    fs.writeFileSync(tabStatePath, json, 'utf-8');
    event.returnValue = true;
  } catch (error) {
    console.warn('[main] Failed to save tab state (sync):', error);
    event.returnValue = false;
  }
});

// Load saved tab state
ipcMain.handle('tab-state:load', () => {
  try {
    return fs.readFileSync(tabStatePath, 'utf-8');
  } catch {
    return null;
  }
});

// --- Live View IPC handlers ---
ipcMain.handle('live-view:start', () => startLiveViewServer());

ipcMain.on('live-view:stop', () => stopLiveViewServer());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ipcMain.on('rrweb:event', (_event, rrwebEvent: any) => broadcastEvent(rrwebEvent));

// --- Intercept new-window requests from browser-panel webviews ---
// Use the recommended setWindowOpenHandler API instead of the deprecated
// renderer-side 'new-window' event on <webview>.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      // Only intercept webviews belonging to the browser panel (persist:browser partition)
      const partition = contents.session?.storagePath;
      // session.storagePath is only set for persist: partitions; for non-persist partitions
      // it's undefined. We check via the partition property on the session.
      // A simpler and reliable check: the browser panel webviews use 'persist:browser'.
      // Electron exposes session via contents.session; we match by checking if this session
      // is the same object as the one obtained via session.fromPartition('persist:browser').
      // However, at this point the session module might not yet be imported.
      // Instead, since all our webviews use persist:browser partition and there are no other
      // webviews in the app, we can safely intercept all webview new-window requests.
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('browser:open-url', { url });
      }
      return { action: 'deny' };
    });
  }
});

app.on('ready', async () => {
  fdPath = detectFd();
  await startAttentionServer();
  createWindow();
});

// macOS: keep app alive when all windows are closed
app.on('window-all-closed', () => {
  disposeAllTerminalSessions();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Final process-exit cleanup. Window close confirmation must run before this.
app.on('will-quit', () => {
  stopAttentionServer();
  stopLiveViewServer();
  disposeAllTerminalSessions();
});
