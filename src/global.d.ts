import type {
  TerminalApi,
  FileApi,
  ThemeApi,
  TabStateApi,
  LiveViewApi,
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
  }
}
