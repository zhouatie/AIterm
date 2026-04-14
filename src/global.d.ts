import type {
  TerminalApi,
  FileApi,
  ThemeApi,
  TabStateApi,
  LiveViewApi,
  BrowserApi,
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
    browserApi: BrowserApi;
  }
}
