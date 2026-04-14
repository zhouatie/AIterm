import type {
  TerminalApi,
  FileApi,
  ThemeApi,
  TabStateApi,
  LiveViewApi,
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
    tabStateApi: TabStateApi;
    liveViewApi: LiveViewApi;
  }
}
