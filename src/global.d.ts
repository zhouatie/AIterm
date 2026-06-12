import type {
  TerminalApi,
  FileApi,
  MarkdownCommentApi,
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
    themeApi: ThemeApi;
    tabStateApi: TabStateApi;
    liveViewApi: LiveViewApi;
  }
}
