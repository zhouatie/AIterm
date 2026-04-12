import { contextBridge, ipcRenderer } from 'electron';

export interface TerminalApi {
  create(cols: number, rows: number): Promise<{ id: string }>;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  dispose(id: string): Promise<void>;
  onOutput(callback: (data: { id: string; data: string }) => void): () => void;
  onExit(
    callback: (data: { id: string; exitCode: number; signal?: number }) => void,
  ): () => void;
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
