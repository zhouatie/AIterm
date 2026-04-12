import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import started from 'electron-squirrel-startup';
import {
  createSession,
  writeToSession,
  resizeSession,
  disposeSession,
  disposeAllSessions,
  getSessionLiveCwd,
} from './pty-manager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

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

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// --- IPC Handlers ---

// terminal:create — create a PTY session and return the session ID
ipcMain.handle(
  'terminal:create',
  (_event, { cols, rows }: { cols: number; rows: number }) => {
    const session = createSession(cols, rows);

    // Push PTY stdout to renderer
    session.ptyProcess.onData((data: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:output', {
          id: session.id,
          data,
        });
      }
    });

    // Notify renderer when PTY exits
    session.ptyProcess.onExit(
      ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
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
  disposeSession(id);
});

// terminal:getCwd — return the live cwd of a PTY session
ipcMain.handle('terminal:getCwd', async (_event, { id }: { id: string }) => {
  const cwd = await getSessionLiveCwd(id);
  return { cwd: cwd ?? null };
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

// --- App Lifecycle ---

app.on('ready', createWindow);

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
  disposeAllSessions();
});
