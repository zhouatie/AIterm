import { app, BrowserWindow, ipcMain, shell, nativeTheme, Notification } from 'electron';
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
  type PtyNotificationEnv,
} from './pty-manager';
import {
  TERMINAL_ATTENTION_AGENTS,
  type TerminalAttention,
  type TerminalAttentionAgent,
} from './terminal-attention';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let attentionServer: http.Server | null = null;
let attentionNotifyUrl = '';
let attentionNotifyToken = '';
const attentionSessionIds = new Set<string>();

function getAttentionNotificationEnv(): PtyNotificationEnv | undefined {
  if (!attentionNotifyUrl || !attentionNotifyToken) return undefined;
  return {
    url: attentionNotifyUrl,
    token: attentionNotifyToken,
  };
}

function isTerminalAttentionAgent(value: unknown): value is TerminalAttentionAgent {
  return typeof value === 'string'
    && TERMINAL_ATTENTION_AGENTS.includes(value as TerminalAttentionAgent);
}

function getAgentDisplayName(agent: TerminalAttentionAgent): string {
  if (agent === 'claude-code') return 'Claude Code';
  if (agent === 'opencode') return 'OpenCode';
  return 'Codex';
}

function sendTerminalAttention(attention: TerminalAttention): void {
  attentionSessionIds.add(attention.id);

  try {
    if (Notification.isSupported()) {
      new Notification({
        title: `${getAgentDisplayName(attention.agent)} 需要处理`,
        body: attention.message || '请回到 GUI 终端继续处理。',
      }).show();
    }
  } catch (error) {
    console.error('[terminal-attention] Failed to show notification:', error);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:attention', attention);
  }
}

function clearTerminalAttention(id: string): void {
  if (!attentionSessionIds.delete(id)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:attentionCleared', { id });
  }
}

function parseAttentionPayload(payload: unknown): TerminalAttention | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;

  if (data.token !== attentionNotifyToken) return null;
  if (typeof data.id !== 'string' || !hasSession(data.id)) return null;
  if (!isTerminalAttentionAgent(data.agent)) return null;
  if (typeof data.event !== 'string' || data.event.trim() === '') return null;

  const message = typeof data.message === 'string' && data.message.trim()
    ? data.message.trim()
    : `${getAgentDisplayName(data.agent)} 等待处理`;

  return {
    id: data.id,
    agent: data.agent,
    event: data.event,
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
    const attention = parseAttentionPayload(payload);
    if (!attention) {
      writeHttpResponse(response, 403, 'forbidden');
      return;
    }

    sendTerminalAttention(attention);
    writeHttpResponse(response, 204);
  } catch (error) {
    console.error('[terminal-attention] Failed to handle request:', error);
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
      console.error('[terminal-attention] Failed to start server:', error);
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
  attentionSessionIds.clear();
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
    },
  });

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// --- IPC Handlers ---

// terminal:create — create a PTY session and return the session ID
ipcMain.handle(
  'terminal:create',
  (_event, { cols, rows, cwd }: { cols: number; rows: number; cwd?: string }) => {
    const session = createSession(cols, rows, cwd, getAttentionNotificationEnv());

    // Push PTY stdout to renderer
    session.ptyProcess.onData((data: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:output', {
          id: session.id,
          data,
        });
      }
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
        clearTerminalAttention(session.id);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:exit', {
            id: session.id,
            exitCode,
            signal,
          });
        }
      },
    );

    return { id: session.id };
  },
);

// terminal:input — write user input to PTY stdin
ipcMain.on(
  'terminal:input',
  (_event, { id, data }: { id: string; data: string }) => {
    clearTerminalAttention(id);
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
  clearTerminalAttention(id);
  disposeSession(id);
});

// terminal:getSessionInfo — return the latest PTY session info
ipcMain.handle('terminal:getSessionInfo', async (_event, { id }: { id: string }) => {
  return await getSessionInfo(id);
});

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
        children: await readTreeDirectory(dirPath),
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
function scanAllWithFd(rootPath: string): Promise<ScanTreeNode[]> {
  return new Promise((resolve, reject) => {
    const fd = fdPath as string;
    const excludeArgs = getExcludedDirNames(rootPath).flatMap((d) => ['--exclude', d]);
    execFile(
      fd,
      ['--type', 'f', '--no-hidden', ...excludeArgs],
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
async function scanAllWithNodeFs(rootPath: string): Promise<ScanTreeNode[]> {
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

async function scanAllTree(rootPath: string): Promise<ScanTreeNode[]> {
  if (fdPath) {
    try {
      return await scanAllWithFd(rootPath);
    } catch {
      // fd failed for this directory, fall back to Node.js
    }
  }

  return scanAllWithNodeFs(rootPath);
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
        children: await scanAllTree(dirPath),
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
        : await scanAllTree(resolved);

      return { tree };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// --- App Lifecycle ---

// theme:set — sync Electron native theme with renderer
ipcMain.on('theme:set', (_event, { mode }: { mode: 'light' | 'dark' | 'system' }) => {
  nativeTheme.themeSource = mode;
});

app.on('ready', async () => {
  fdPath = detectFd();
  await startAttentionServer();
  createWindow();
});

// macOS: keep app alive when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    disposeAllSessions();
    app.quit();
  }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up all PTY sessions before quitting
app.on('before-quit', () => {
  stopAttentionServer();
  disposeAllSessions();
});
