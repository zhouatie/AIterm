import type {
  TerminalApi,
  FileApi,
  MarkdownCommentApi,
  OpenSpecWorkflowApi,
  AppInfoApi,
  AppUpdateApi,
  ExternalLinkApi,
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
    openspecWorkflowApi: OpenSpecWorkflowApi;
    appInfoApi: AppInfoApi;
    appUpdateApi: AppUpdateApi;
    externalLinkApi: ExternalLinkApi;
    themeApi: ThemeApi;
    tabStateApi: TabStateApi;
    liveViewApi: LiveViewApi;
  }
}
