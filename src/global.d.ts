import type { TerminalApi, FileApi } from './preload';

declare global {
  interface Window {
    terminalApi: TerminalApi;
    fileApi: FileApi;
  }
}
