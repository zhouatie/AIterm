import { contextBridge, ipcRenderer } from 'electron';
import type {
  TerminalAgentStatus,
  TerminalAgentStatusCleared,
  TerminalAgentStatusState,
} from './terminal-attention';

export interface TerminalApi {
  create(cols: number, rows: number, cwd?: string): Promise<{ id: string }>;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  dispose(id: string): Promise<void>;
  getSessionInfo(id: string): Promise<TerminalSessionInfo | null>;
  attachOutput(id: string): Promise<{ bufferedData: string }>;
  detachOutput(id: string): void;
  onOutput(id: string, callback: (data: string) => void): () => void;
  onExit(
    id: string,
    callback: (data: { exitCode: number; signal?: number }) => void,
  ): () => void;
  onSessionInfoChanged(callback: (data: TerminalSessionInfo) => void): () => void;
  onAgentStatus(callback: (data: TerminalAgentStatus) => void): () => void;
  onAgentStatusCleared(callback: (data: TerminalAgentStatusCleared) => void): () => void;
  onActivateSession(callback: (data: { id: string }) => void): () => void;
  saveBuffer(sessionId: string, content: string): void;
  loadBuffer(sessionId: string): Promise<string | null>;
  cleanupBuffers(activeSessionIds: string[]): void;
}

export type {
  TerminalAgentStatus,
  TerminalAgentStatusCleared,
  TerminalAgentStatusState,
} from './terminal-attention';

export interface TerminalSessionInfo {
  id: string;
  cwd: string;
  isGitRepo: boolean;
  branchName: string | null;
  gitRoot: string | null;
  displayLabel: string;
}

export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  containsMarkdown?: boolean;
}

export interface ScanTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
  children?: ScanTreeNode[];
}

export interface SpecTreeOptions {
  specRootPath?: string;
  specDirectoryNames?: string[];
  hiddenFolderNames?: string[];
}

export interface FileApi {
  readDir(dirPath: string): Promise<{ entries?: DirEntry[]; error?: string }>;
  readFile(filePath: string): Promise<{ content?: string; error?: string }>;
  writeFile(filePath: string, content: string): Promise<{ success?: boolean; error?: string }>;
  readTreeDirectory(
    dirPath: string,
    options?: SpecTreeOptions,
  ): Promise<{ tree?: ScanTreeNode[]; error?: string }>;
  scanMdFiles(rootPath: string): Promise<{ tree?: ScanTreeNode[]; error?: string }>;
  scanAllFiles(
    rootPath: string,
    options?: SpecTreeOptions,
  ): Promise<{ tree?: ScanTreeNode[]; error?: string }>;
  showInFolder(filePath: string): void;
  fileExists(filePath: string): Promise<boolean>;
  openFilePreview(filePath: string, line?: number, col?: number): void;
  ensureDir(dirPath: string): Promise<{ success?: boolean; error?: string }>;
  deleteFile(filePath: string): Promise<{ success?: boolean; error?: string }>;
  rename(oldPath: string, newPath: string): Promise<{ success?: boolean; error?: string }>;
  scanNotes(rootPath: string): Promise<{ tree?: ScanTreeNode[]; error?: string }>;
  getUserDataPath(): Promise<{ path: string }>;
}

contextBridge.exposeInMainWorld('terminalApi', {
  create: (cols: number, rows: number, cwd?: string) =>
    ipcRenderer.invoke('terminal:create', { cols, rows, cwd }),

  input: (id: string, data: string) =>
    ipcRenderer.send('terminal:input', { id, data }),

  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', { id, cols, rows }),

  dispose: (id: string) =>
    ipcRenderer.invoke('terminal:dispose', { id }),

  getSessionInfo: (id: string) =>
    ipcRenderer.invoke('terminal:getSessionInfo', { id }),

  attachOutput: (id: string) =>
    ipcRenderer.invoke('terminal:output:attach', { id }),

  detachOutput: (id: string) =>
    ipcRenderer.send('terminal:output:detach', { id }),

  onOutput: (id: string, callback: (data: string) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: string,
    ) => callback(data);
    ipcRenderer.on(`terminal:output:${id}`, listener);
    return () => {
      ipcRenderer.removeListener(`terminal:output:${id}`, listener);
    };
  },

  onExit: (
    id: string,
    callback: (data: {
      exitCode: number;
      signal?: number;
    }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { exitCode: number; signal?: number },
    ) => callback(data);
    ipcRenderer.on(`terminal:exit:${id}`, listener);
    return () => {
      ipcRenderer.removeListener(`terminal:exit:${id}`, listener);
    };
  },

  onSessionInfoChanged: (callback: (data: TerminalSessionInfo) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: TerminalSessionInfo,
    ) => callback(data);
    ipcRenderer.on('terminal:sessionInfoChanged', listener);
    return () => {
      ipcRenderer.removeListener('terminal:sessionInfoChanged', listener);
    };
  },

  onAgentStatus: (callback: (data: TerminalAgentStatus) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: TerminalAgentStatus,
    ) => callback(data);
    ipcRenderer.on('terminal:agentStatus', listener);
    return () => {
      ipcRenderer.removeListener('terminal:agentStatus', listener);
    };
  },

  onAgentStatusCleared: (callback: (data: TerminalAgentStatusCleared) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: TerminalAgentStatusCleared,
    ) => callback(data);
    ipcRenderer.on('terminal:agentStatusCleared', listener);
    return () => {
      ipcRenderer.removeListener('terminal:agentStatusCleared', listener);
    };
  },

  onActivateSession: (callback: (data: { id: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { id: string },
    ) => callback(data);
    ipcRenderer.on('terminal:activateSession', listener);
    return () => {
      ipcRenderer.removeListener('terminal:activateSession', listener);
    };
  },

  saveBuffer: (sessionId: string, content: string) =>
    ipcRenderer.send('terminal:saveBuffer', { sessionId, content }),

  loadBuffer: (sessionId: string) =>
    ipcRenderer.invoke('terminal:loadBuffer', { sessionId }),

  cleanupBuffers: (activeSessionIds: string[]) =>
    ipcRenderer.send('terminal:cleanupBuffers', { activeSessionIds }),
} satisfies TerminalApi);

contextBridge.exposeInMainWorld('fileApi', {
  readDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:readdir', { dirPath }),

  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readfile', { filePath }),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writefile', { filePath, content }),

  readTreeDirectory: (
    dirPath: string,
    options?: SpecTreeOptions,
  ) =>
    ipcRenderer.invoke('fs:read-tree-directory', { dirPath, options }),

  scanMdFiles: (rootPath: string) =>
    ipcRenderer.invoke('fs:scan-md-files', { rootPath }),

  scanAllFiles: (rootPath: string, options?: SpecTreeOptions) =>
    ipcRenderer.invoke('fs:scan-all-files', { rootPath, options }),

  showInFolder: (filePath: string) =>
    ipcRenderer.send('fs:show-in-folder', { filePath }),

  fileExists: (filePath: string) =>
    ipcRenderer.invoke('fs:file-exists', { filePath }),

  openFilePreview: (filePath: string, line?: number, col?: number) =>
    ipcRenderer.send('fs:open-file-preview', { filePath, line, col }),
  ensureDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:ensure-dir', { dirPath }),

  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('fs:delete-file', { filePath }),

  rename: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('fs:rename', { oldPath, newPath }),

  scanNotes: (rootPath: string) =>
    ipcRenderer.invoke('fs:scan-notes', { rootPath }),

  getUserDataPath: () =>
    ipcRenderer.invoke('app:get-user-data-path'),
} satisfies FileApi);

export interface ThemeApi {
  setNativeTheme(mode: 'light' | 'dark' | 'system'): void;
}

export interface LiveViewApi {
  start(): Promise<{ url: string } | { error: string }>;
  stop(): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendEvent(event: any): void;
  /** Register a callback invoked when the server needs a fresh FullSnapshot.
   *  Returns an unsubscribe function. */
  onForceCheckout(cb: () => void): () => void;
}

export interface TabStateApi {
  save(json: string): void;
  saveSync(json: string): void;
  load(): Promise<string | null>;
}

contextBridge.exposeInMainWorld('themeApi', {
  setNativeTheme: (mode: 'light' | 'dark' | 'system') =>
    ipcRenderer.send('theme:set', { mode }),
} satisfies ThemeApi);

contextBridge.exposeInMainWorld('liveViewApi', {
  start: () => ipcRenderer.invoke('live-view:start'),
  stop: () => ipcRenderer.send('live-view:stop'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendEvent: (event: any) => ipcRenderer.send('rrweb:event', event),
  onForceCheckout: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('live-view:force-checkout', listener);
    return () => ipcRenderer.removeListener('live-view:force-checkout', listener);
  },
} satisfies LiveViewApi);

contextBridge.exposeInMainWorld('tabStateApi', {
  save: (json: string) =>
    ipcRenderer.send('tab-state:save', json),
  saveSync: (json: string) =>
    ipcRenderer.sendSync('tab-state:save-sync', json),
  load: () =>
    ipcRenderer.invoke('tab-state:load'),
} satisfies TabStateApi);

export interface BrowserApi {
  onOpenUrl(callback: (data: { url: string }) => void): () => void;
  onShortcutCommand(callback: (data: { command: BrowserShortcutCommand }) => void): () => void;
  setOpenState(isOpen: boolean): void;
}

export type BrowserShortcutCommand =
  | 'toggle-browser'
  | 'new-tab'
  | 'close-tab'
  | 'select-previous-tab'
  | 'select-next-tab'
  | 'select-tab-1'
  | 'select-tab-2'
  | 'select-tab-3'
  | 'select-tab-4'
  | 'select-tab-5'
  | 'select-tab-6'
  | 'select-tab-7'
  | 'select-tab-8'
  | 'select-tab-9'
  | 'reload'
  | 'go-back'
  | 'go-forward';

contextBridge.exposeInMainWorld('browserApi', {
  onOpenUrl: (callback: (data: { url: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { url: string },
    ) => callback(data);
    ipcRenderer.on('browser:open-url', listener);
    return () => {
      ipcRenderer.removeListener('browser:open-url', listener);
    };
  },
  onShortcutCommand: (callback: (data: { command: BrowserShortcutCommand }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { command: BrowserShortcutCommand },
    ) => callback(data);
    ipcRenderer.on('browser:shortcut', listener);
    return () => {
      ipcRenderer.removeListener('browser:shortcut', listener);
    };
  },
  setOpenState: (isOpen: boolean) => {
    ipcRenderer.send('browser:set-open-state', { isOpen });
  },
} satisfies BrowserApi);

export interface GitStatusSummary {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
  files: Array<{ status: string; path: string }>;
}

export interface GitApi {
  diff(cwd: string): Promise<{ diff?: string; error?: string }>;
  statusSummary(cwd: string): Promise<{ summary?: GitStatusSummary; error?: string }>;
}

contextBridge.exposeInMainWorld('gitApi', {
  diff: (cwd: string) =>
    ipcRenderer.invoke('git:diff', { cwd }),

  statusSummary: (cwd: string) =>
    ipcRenderer.invoke('git:status-summary', { cwd }),
} satisfies GitApi);
