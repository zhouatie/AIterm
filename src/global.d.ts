import type {
  TerminalApi,
  FileApi,
  MarkdownCommentApi,
  AppInfoApi,
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
    markdownCommentApi: MarkdownCommentApi;
    appInfoApi: AppInfoApi;
    themeApi: ThemeApi;
    tabStateApi: TabStateApi;
    liveViewApi: LiveViewApi;
  }
}
