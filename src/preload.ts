import { contextBridge, ipcRenderer } from 'electron';
import type { TerminalAttention, TerminalAttentionCleared } from './terminal-attention';

export interface TerminalApi {
  create(cols: number, rows: number, cwd?: string): Promise<{ id: string }>;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  dispose(id: string): Promise<void>;
  getSessionInfo(id: string): Promise<TerminalSessionInfo | null>;
  onOutput(callback: (data: { id: string; data: string }) => void): () => void;
  onExit(
    callback: (data: { id: string; exitCode: number; signal?: number }) => void,
  ): () => void;
  onSessionInfoChanged(callback: (data: TerminalSessionInfo) => void): () => void;
  onAttention(callback: (data: TerminalAttention) => void): () => void;
  onAttentionCleared(callback: (data: TerminalAttentionCleared) => void): () => void;
  onActivateSession(callback: (data: { id: string }) => void): () => void;
}

export type { TerminalAttention, TerminalAttentionCleared } from './terminal-attention';

export interface TerminalSessionInfo {
  id: string;
  cwd: string;
  isGitRepo: boolean;
  branchName: string | null;
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

  onOutput: (callback: (data: { id: string; data: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; data: string },
    ) => callback(data);
    ipcRenderer.on('terminal:output', listener);
    return () => {
      ipcRenderer.removeListener('terminal:output', listener);
    };
  },

  onExit: (
    callback: (data: {
      id: string;
      exitCode: number;
      signal?: number;
    }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; exitCode: number; signal?: number },
    ) => callback(data);
    ipcRenderer.on('terminal:exit', listener);
    return () => {
      ipcRenderer.removeListener('terminal:exit', listener);
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

  onAttention: (callback: (data: TerminalAttention) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: TerminalAttention,
    ) => callback(data);
    ipcRenderer.on('terminal:attention', listener);
    return () => {
      ipcRenderer.removeListener('terminal:attention', listener);
    };
  },

  onAttentionCleared: (callback: (data: TerminalAttentionCleared) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: TerminalAttentionCleared,
    ) => callback(data);
    ipcRenderer.on('terminal:attentionCleared', listener);
    return () => {
      ipcRenderer.removeListener('terminal:attentionCleared', listener);
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
}

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
} satisfies BrowserApi);
