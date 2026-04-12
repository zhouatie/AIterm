import { contextBridge, ipcRenderer } from 'electron';

export interface TerminalApi {
  create(cols: number, rows: number): Promise<{ id: string }>;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  dispose(id: string): Promise<void>;
  getCwd(id: string): Promise<{ cwd: string | null }>;
  onOutput(callback: (data: { id: string; data: string }) => void): () => void;
  onExit(
    callback: (data: { id: string; exitCode: number; signal?: number }) => void,
  ): () => void;
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
  children?: ScanTreeNode[];
}

export interface FileApi {
  readDir(dirPath: string): Promise<{ entries?: DirEntry[]; error?: string }>;
  readFile(filePath: string): Promise<{ content?: string; error?: string }>;
  scanMdFiles(rootPath: string): Promise<{ tree?: ScanTreeNode[]; error?: string }>;
}

contextBridge.exposeInMainWorld('terminalApi', {
  create: (cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:create', { cols, rows }),

  input: (id: string, data: string) =>
    ipcRenderer.send('terminal:input', { id, data }),

  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', { id, cols, rows }),

  dispose: (id: string) =>
    ipcRenderer.invoke('terminal:dispose', { id }),

  getCwd: (id: string) =>
    ipcRenderer.invoke('terminal:getCwd', { id }),

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
} satisfies TerminalApi);

contextBridge.exposeInMainWorld('fileApi', {
  readDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:readdir', { dirPath }),

  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readfile', { filePath }),

  scanMdFiles: (rootPath: string) =>
    ipcRenderer.invoke('fs:scan-md-files', { rootPath }),
} satisfies FileApi);
