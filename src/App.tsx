import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Monitor, Cast, RefreshCw, ExternalLink } from 'lucide-react';
import TerminalPanel from './components/TerminalPanel';
import FilePreviewPanel from './components/FilePreviewPanel';
import SettingsPanel from './components/SettingsPanel';
import LiveViewPanel from './components/LiveViewPanel';
import SplitLayout from './components/SplitLayout';
import { ShortcutProvider, useKeyboardShortcuts } from './ShortcutContext';
import { useTheme } from './ThemeContext';
import {
  PanelManagerProvider,
  PanelContainer,
  usePanelManager,
} from './components/PanelManager';
import type { PanelDefinition } from './components/PanelManager';
import { TerminalUiContext } from './contexts/terminal-ui';
import {
  readSpecDirectoryNames,
  saveSpecDirectoryNames,
  getHiddenFolderNames,
  setHiddenFolderNames,
} from './utils/file-tree-settings';
import {
  readTerminalStartDirectory,
  saveTerminalStartDirectory,
  TERMINAL_START_DIRECTORY_CHANGED_EVENT,
  TERMINAL_RENDERER_CHANGED_EVENT,
  readTerminalRendererPreferWebgl,
  saveTerminalRendererPreferWebgl,
} from './utils/terminal-settings';
import { getIconButtonTooltip } from './utils/icon-button-tooltips';
import { startRecording, stopLiveRecording, forceCheckout } from './live-view-recorder';
import type { AppUpdateCheckResult } from './preload';

// --- Active Session Context ---
// Shared between TerminalPanel (writer) and FilePreviewPanel (reader)
interface ActiveSessionContextValue {
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue>({
  activeSessionId: null,
  setActiveSessionId: () => undefined,
});

export const useActiveSession = () => useContext(ActiveSessionContext);

// --- Terminal panel wrapper that connects to active session context ---
const ConnectedTerminalPanel: React.FC = () => {
  const { setActiveSessionId } = useActiveSession();
  const [initialDirectory, setInitialDirectory] = useState(readTerminalStartDirectory);
  const [preferWebglRenderer, setPreferWebglRenderer] = useState(readTerminalRendererPreferWebgl);

  useEffect(() => {
    const handleSettingsChange = () => {
      setInitialDirectory(readTerminalStartDirectory());
      setPreferWebglRenderer(readTerminalRendererPreferWebgl());
    };

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener(TERMINAL_START_DIRECTORY_CHANGED_EVENT, handleSettingsChange);
    window.addEventListener(TERMINAL_RENDERER_CHANGED_EVENT, handleSettingsChange);
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener(TERMINAL_START_DIRECTORY_CHANGED_EVENT, handleSettingsChange);
      window.removeEventListener(TERMINAL_RENDERER_CHANGED_EVENT, handleSettingsChange);
    };
  }, []);

  return (
    <TerminalPanel
      initialDirectory={initialDirectory || undefined}
      preferWebglRenderer={preferWebglRenderer}
      onActiveSessionChange={setActiveSessionId}
    />
  );
};

const TERMINAL_PANEL_ID = 'terminal';
const STORAGE_KEY_PANEL_VISIBLE = 'sidebarPanelVisible';
const STORAGE_KEY_MAIN_SPLIT_PERCENT = 'mainSplitLeftPercent';

const INITIAL_PANELS: PanelDefinition[] = [
  { id: TERMINAL_PANEL_ID, component: ConnectedTerminalPanel },
];

const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';

// Height of the dedicated title bar area (houses traffic lights + sidebar toggle)
const TITLE_BAR_HEIGHT = 42;

const toggleButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'transparent',
  backgroundColor: 'transparent',
  borderRadius: 8,
  cursor: 'pointer',
  color: ICON_COLOR,
  padding: 0,
  transition: 'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
  // Clickable even in title bar drag region
  WebkitAppRegion: 'no-drag' as const,
};

const titleBarMetaStyle: React.CSSProperties = {
  marginLeft: 'auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  WebkitAppRegion: 'no-drag',
};

const versionLabelStyle: React.CSSProperties = {
  minWidth: 0,
  maxWidth: 220,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-muted)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0,
  pointerEvents: 'none',
  flexShrink: 1,
};

const updateStatusLabelStyle: React.CSSProperties = {
  maxWidth: 112,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-muted)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0,
  flexShrink: 0,
};

type UpdateUiState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest'; currentVersion: string }
  | { kind: 'available'; currentVersion: string; latestVersion: string; releaseUrl: string }
  | { kind: 'error'; currentVersion: string; releaseUrl: string; error: string };

function getUpdateStateFromResult(result: AppUpdateCheckResult): UpdateUiState {
  if (!result.ok) {
    return {
      kind: 'error',
      currentVersion: result.currentVersion,
      releaseUrl: result.releaseUrl,
      error: result.error,
    };
  }

  if (!result.hasUpdate) {
    return { kind: 'latest', currentVersion: result.currentVersion };
  }

  return {
    kind: 'available',
    currentVersion: result.currentVersion,
    latestVersion: result.latestVersion,
    releaseUrl: result.releaseUrl,
  };
}

function getUpdateStatusLabel(state: UpdateUiState): string | null {
  switch (state.kind) {
    case 'checking':
      return '正在检查';
    case 'latest':
      return '已是最新';
    case 'available':
      return `发现 v${state.latestVersion}`;
    case 'error':
      return '检查失败';
    case 'idle':
    default:
      return null;
  }
}

function getUpdateStatusTitle(state: UpdateUiState): string {
  switch (state.kind) {
    case 'checking':
      return '正在检查更新';
    case 'latest':
      return `当前版本 v${state.currentVersion} 已是最新`;
    case 'available':
      return `当前版本 v${state.currentVersion}，最新版本 v${state.latestVersion}`;
    case 'error':
      return `检查更新失败：${state.error}`;
    case 'idle':
    default:
      return '检查更新';
  }
}

function applyChromeButtonHover(target: HTMLButtonElement) {
  target.style.backgroundColor = 'var(--color-surface-content-elevated)';
  target.style.borderColor = 'var(--color-border-primary)';
  target.style.color = ICON_COLOR_ACTIVE;
  target.style.transform = 'translateY(-1px)';
  target.style.boxShadow = 'var(--color-shadow-soft)';
}

function resetChromeButtonHover(target: HTMLButtonElement) {
  target.style.backgroundColor = 'transparent';
  target.style.borderColor = 'transparent';
  target.style.color = ICON_COLOR;
  target.style.transform = 'translateY(0)';
  target.style.boxShadow = 'none';
}

const AppContent: React.FC = () => {
  const { activeSessionId } = useActiveSession();
  const { switchPanel } = usePanelManager();
  const { mode, cycleTheme } = useTheme();
  const {
    bindings,
    closeSettings,
    isSettingsOpen,
    registerAction,
    saveBindings,
  } = useKeyboardShortcuts();

  // Icon and tooltip for the theme toggle button
  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const themeTitle =
    mode === 'light' ? '切换到深色模式'
    : mode === 'dark' ? '切换到跟随系统'
    : '切换到浅色模式';

  // Sidebar panel visibility — persisted in localStorage
  const [panelVisible, setPanelVisible] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PANEL_VISIBLE);
    return stored !== null ? stored === 'true' : true;
  });
  const [specDirectoryNames, setSpecDirectoryNames] = useState(readSpecDirectoryNames);
  const [terminalStartDirectory, setTerminalStartDirectory] = useState(readTerminalStartDirectory);
  const [terminalRendererPreferWebgl, setTerminalRendererPreferWebgl] = useState(
    readTerminalRendererPreferWebgl,
  );
  const [hiddenFolderNames, setHiddenFolderNamesState] = useState(getHiddenFolderNames);
  const [appInfo, setAppInfo] = useState<{ name: string; version: string } | null>(null);
  const [updateState, setUpdateState] = useState<UpdateUiState>({ kind: 'idle' });
  const fileTreeToggleTitle = getIconButtonTooltip({
    label: panelVisible ? '收起文件树' : '展开文件树',
    bindings,
    actionId: 'toggle-file-tree',
  });

  // Live View state
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [liveViewActive, setLiveViewActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    window.appInfoApi.get()
      .then((nextAppInfo) => {
        if (!cancelled) setAppInfo(nextAppInfo);
      })
      .catch((error) => {
        console.warn('[App] Failed to load app info:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Start/stop rrweb recording in sync with live view active state
  useEffect(() => {
    if (liveViewActive) {
      startRecording();
    } else {
      stopLiveRecording();
    }
    return () => {
      stopLiveRecording();
    };
  }, [liveViewActive]);

  // When live view is active, register the force-checkout handler so the
  // server can request a fresh FullSnapshot when a new client connects.
  useEffect(() => {
    if (!liveViewActive) return;
    const unsubscribe = window.liveViewApi.onForceCheckout(forceCheckout);
    return unsubscribe;
  }, [liveViewActive]);

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_PANEL_VISIBLE, String(next));
      return next;
    });
  }, []);

  const handleSaveSpecDirectoryNames = useCallback((names: string[]) => {
    saveSpecDirectoryNames(names);
    setSpecDirectoryNames(readSpecDirectoryNames());
  }, []);

  const handleSaveTerminalStartDirectory = useCallback((value: string) => {
    saveTerminalStartDirectory(value);
    setTerminalStartDirectory(readTerminalStartDirectory());
  }, []);

  const handleSaveTerminalRendererPreferWebgl = useCallback((value: boolean) => {
    saveTerminalRendererPreferWebgl(value);
    setTerminalRendererPreferWebgl(readTerminalRendererPreferWebgl());
  }, []);

  const handleSaveHiddenFolderNames = useCallback((names: string[]) => {
    setHiddenFolderNames(names);
    setHiddenFolderNamesState(getHiddenFolderNames());
  }, []);

  const handleCheckUpdate = useCallback(() => {
    if (updateState.kind === 'checking') return;

    setUpdateState({ kind: 'checking' });
    window.appUpdateApi.check()
      .then((result) => {
        setUpdateState(getUpdateStateFromResult(result));
      })
      .catch((error: unknown) => {
        setUpdateState({
          kind: 'error',
          currentVersion: appInfo?.version ?? 'unknown',
          releaseUrl: '',
          error: error instanceof Error ? error.message : '检查更新失败',
        });
      });
  }, [appInfo?.version, updateState.kind]);

  const handleOpenReleasePage = useCallback((releaseUrl?: string) => {
    window.appUpdateApi.openReleasePage(releaseUrl)
      .then((result) => {
        if (result.ok) return;
        setUpdateState({
          kind: 'error',
          currentVersion: appInfo?.version ?? 'unknown',
          releaseUrl: '',
          error: result.error ?? '无法打开 GitHub Release 页面',
        });
      })
      .catch((error: unknown) => {
        setUpdateState({
          kind: 'error',
          currentVersion: appInfo?.version ?? 'unknown',
          releaseUrl: '',
          error: error instanceof Error ? error.message : '无法打开 GitHub Release 页面',
        });
      });
  }, [appInfo?.version]);

  useEffect(() => {
    return registerAction('toggle-file-tree', () => {
      togglePanel();
    });
  }, [registerAction, togglePanel]);

  const revealTerminalUi = useCallback(() => {
    switchPanel(TERMINAL_PANEL_ID);
  }, [switchPanel]);

  const updateStatusLabel = getUpdateStatusLabel(updateState);
  const updateStatusTitle = getUpdateStatusTitle(updateState);
  const updateReleaseUrl = updateState.kind === 'available' || updateState.kind === 'error'
    ? updateState.releaseUrl
    : undefined;
  const canOpenReleasePage = updateState.kind === 'available' || updateState.kind === 'error';
  const isCheckingUpdate = updateState.kind === 'checking';

  return (
    <TerminalUiContext.Provider value={revealTerminalUi}>
      <>
      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--color-workbench-bg)',
        }}
      >
        {/* Title bar — drag region, houses macOS traffic lights + sidebar toggle */}
        <div
          style={{
            height: TITLE_BAR_HEIGHT,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 78,
            paddingRight: 12,
            gap: 6,
            background: 'var(--color-window-chrome-bg)',
            borderBottom: '1px solid var(--color-window-chrome-border)',
            boxShadow: '0 1px 0 var(--color-border-light)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <button
            onClick={togglePanel}
            title={fileTreeToggleTitle}
            style={toggleButtonStyle}
            onMouseEnter={(e) => {
              applyChromeButtonHover(e.currentTarget);
            }}
            onMouseLeave={(e) => {
              resetChromeButtonHover(e.currentTarget);
            }}
          >
            {panelVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <button
            onClick={cycleTheme}
            title={themeTitle}
            style={{ ...toggleButtonStyle, marginLeft: 4 }}
            onMouseEnter={(e) => {
              applyChromeButtonHover(e.currentTarget);
            }}
            onMouseLeave={(e) => {
              resetChromeButtonHover(e.currentTarget);
            }}
          >
            <ThemeIcon size={16} />
          </button>

          {/* Live View toggle — shows green dot while recording */}
          <div style={{ position: 'relative', display: 'inline-flex', marginLeft: 4 }}>
            <button
              onClick={() => setIsLiveViewOpen((v) => !v)}
              title={liveViewActive ? 'Live View（录制中）' : 'Live View'}
              style={toggleButtonStyle}
              onMouseEnter={(e) => applyChromeButtonHover(e.currentTarget)}
              onMouseLeave={(e) => resetChromeButtonHover(e.currentTarget)}
            >
              <Cast size={16} />
            </button>
            {liveViewActive && <span className="live-dot" />}
          </div>

          {appInfo && (
            <div style={titleBarMetaStyle}>
              <div
                title={`当前版本：${appInfo.name} v${appInfo.version}`}
                style={versionLabelStyle}
              >
                {appInfo.name} v{appInfo.version}
              </div>

              <button
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate}
                title={isCheckingUpdate ? '正在检查更新' : '检查更新'}
                aria-label="检查更新"
                style={{
                  ...toggleButtonStyle,
                  cursor: isCheckingUpdate ? 'default' : 'pointer',
                  opacity: isCheckingUpdate ? 0.65 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isCheckingUpdate) applyChromeButtonHover(e.currentTarget);
                }}
                onMouseLeave={(e) => resetChromeButtonHover(e.currentTarget)}
              >
                <RefreshCw size={16} />
              </button>

              {updateStatusLabel && (
                <div title={updateStatusTitle} style={updateStatusLabelStyle}>
                  {updateStatusLabel}
                </div>
              )}

              {canOpenReleasePage && (
                <button
                  onClick={() => handleOpenReleasePage(updateReleaseUrl)}
                  title={updateState.kind === 'available' ? '打开 GitHub Release 下载页' : '打开 GitHub Release 页面'}
                  aria-label={updateState.kind === 'available' ? '打开 GitHub Release 下载页' : '打开 GitHub Release 页面'}
                  style={toggleButtonStyle}
                  onMouseEnter={(e) => applyChromeButtonHover(e.currentTarget)}
                  onMouseLeave={(e) => resetChromeButtonHover(e.currentTarget)}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--color-workbench-bg)',
          }}
        >
          <SplitLayout
            left={<FilePreviewPanel activeSessionId={activeSessionId} visible={panelVisible} />}
            right={<PanelContainer />}
            defaultLeftPercent={50}
            storageKey={STORAGE_KEY_MAIN_SPLIT_PERCENT}
            shadow
            shadowSide="left"
            leftCollapsed={!panelVisible}
          />
        </div>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        bindings={bindings}
        specDirectoryNames={specDirectoryNames}
        terminalStartDirectory={terminalStartDirectory}
        terminalRendererPreferWebgl={terminalRendererPreferWebgl}
        hiddenFolderNames={hiddenFolderNames}
        onSave={saveBindings}
        onSaveSpecDirectoryNames={handleSaveSpecDirectoryNames}
        onSaveTerminalStartDirectory={handleSaveTerminalStartDirectory}
        onSaveTerminalRendererPreferWebgl={handleSaveTerminalRendererPreferWebgl}
        onSaveHiddenFolderNames={handleSaveHiddenFolderNames}
        onClose={closeSettings}
      />

      <LiveViewPanel
        isOpen={isLiveViewOpen}
        onClose={() => setIsLiveViewOpen(false)}
        onActiveChange={setLiveViewActive}
      />
      </>
    </TerminalUiContext.Provider>
  );
};

const App: React.FC = () => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const handleSetActiveSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  console.log('[App] rendering');
  return (
    <ActiveSessionContext.Provider
      value={{ activeSessionId, setActiveSessionId: handleSetActiveSession }}
    >
      <ShortcutProvider>
        <PanelManagerProvider
          defaultPanel={TERMINAL_PANEL_ID}
          initialPanels={INITIAL_PANELS}
        >
          <AppContent />
        </PanelManagerProvider>
      </ShortcutProvider>
    </ActiveSessionContext.Provider>
  );
};

export default App;
