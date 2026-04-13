import type {
  TerminalApi,
  FileApi,
  ThemeApi,
  TerminalAttention,
  TerminalAttentionCleared,
} from './preload';

export type {
  TerminalAttention,
  TerminalAttentionCleared,
};

declare global {
  interface Window {
    terminalApi: TerminalApi;
    fileApi: FileApi;
    themeApi: ThemeApi;
  }
}
