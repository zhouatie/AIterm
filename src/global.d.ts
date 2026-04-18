import type {
  TerminalApi,
  FileApi,
  ThemeApi,
  TabStateApi,
  LiveViewApi,
  BrowserApi,
  GitApi,
  TerminalAgentStatus,
  TerminalAgentStatusCleared,
} from './preload';

export type {
  TerminalAgentStatus,
  TerminalAgentStatusCleared,
};

declare global {
  interface Window {
    terminalApi: TerminalApi;
    fileApi: FileApi;
    themeApi: ThemeApi;
    tabStateApi: TabStateApi;
    liveViewApi: LiveViewApi;
    browserApi: BrowserApi;
    gitApi: GitApi;
  }
}
