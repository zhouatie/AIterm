import type { TerminalApi, FileApi, ThemeApi } from './preload';

declare global {
  interface Window {
    terminalApi: TerminalApi;
    fileApi: FileApi;
    themeApi: ThemeApi;
  }
}
