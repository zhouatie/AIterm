import React, { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Monitor, Cast, Globe, GitCompareArrows, NotebookPen } from 'lucide-react';
import TerminalPanel from './components/TerminalPanel';
import FilePreviewPanel from './components/FilePreviewPanel';
import SettingsPanel from './components/SettingsPanel';
import LiveViewPanel from './components/LiveViewPanel';
import BrowserPanel from './components/BrowserPanel';
import GitDiffPanel from './components/GitDiffPanel';
import NotePanel from './components/NotePanel';
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
import {
  readNoteVaultSettings,
  resolveNoteVaultSettings,
  saveNoteVaultSettings,
  NOTE_DIRECTORY_CHANGED_EVENT,
  type NoteVaultSettings,
} from './utils/note-settings';
import { getIconButtonTooltip } from './utils/icon-button-tooltips';
import { startRecording, stopLiveRecording, forceCheckout } from './live-view-recorder';
import type { TerminalSessionInfo } from './preload';

// --- Active Session Context ---
// Shared between TerminalPanel (writer) and FilePreviewPanel (reader)
interface ActiveSessionContextValue {
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue>({
  activeSessionId: null,
  setActiveSessionId: () => {},
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
  border: '1px solid transparent',
  background: 'transparent',
  borderRadius: 8,
  cursor: 'pointer',
  color: ICON_COLOR,
  padding: 0,
  transition: 'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
  // Clickable even in title bar drag region
  WebkitAppRegion: 'no-drag' as const,
};

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
  const [noteVaultSettings, setNoteVaultSettingsState] = useState<NoteVaultSettings>(readNoteVaultSettings);
  const fileTreeToggleTitle = getIconButtonTooltip({
    label: panelVisible ? '收起文件树' : '展开文件树',
    bindings,
    actionId: 'toggle-file-tree',
  });

  // Live View state
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [liveViewActive, setLiveViewActive] = useState(false);

  // Overlay panel state — browser, git diff, and notes are mutually exclusive
  type OverlayPanel = 'none' | 'browser' | 'git-diff' | 'notes';
  const [activeOverlay, setActiveOverlay] = useState<OverlayPanel>('none');

  // Track the active session's git info for icon state
  const [activeSessionInfo, setActiveSessionInfo] = useState<TerminalSessionInfo | null>(null);
  const activeSessionInfoRef = useRef<TerminalSessionInfo | null>(null);

  // Fetch session info when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSessionInfo(null);
      activeSessionInfoRef.current = null;
      return;
    }

    let cancelled = false;
    window.terminalApi.getSessionInfo(activeSessionId).then((info) => {
      if (!cancelled) {
        setActiveSessionInfo(info);
        activeSessionInfoRef.current = info;
      }
    });

    // Also listen for session info changes (e.g. cwd change within same session)
    const unsubscribe = window.terminalApi.onSessionInfoChanged((info) => {
      if (info.id === activeSessionId) {
        setActiveSessionInfo(info);
        activeSessionInfoRef.current = info;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeSessionId]);

  // Auto-close git diff panel when switching to a non-git session
  useEffect(() => {
    if (activeOverlay === 'git-diff' && activeSessionInfo && !activeSessionInfo.isGitRepo) {
      setActiveOverlay('none');
    }
  }, [activeOverlay, activeSessionInfo]);

  const isGitRepo = activeSessionInfo?.isGitRepo ?? false;

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

  const handleSaveNoteVaultSettings = useCallback((value: NoteVaultSettings) => {
    saveNoteVaultSettings(value);
    setNoteVaultSettingsState(readNoteVaultSettings());
  }, []);

  useEffect(() => {
    const refreshNoteVaultSettings = () => {
      void resolveNoteVaultSettings().then((settings) => {
        setNoteVaultSettingsState(settings);
      });
    };

    refreshNoteVaultSettings();
    window.addEventListener(NOTE_DIRECTORY_CHANGED_EVENT, refreshNoteVaultSettings);
    return () => window.removeEventListener(NOTE_DIRECTORY_CHANGED_EVENT, refreshNoteVaultSettings);
  }, []);

  useEffect(() => {
    return registerAction('toggle-file-tree', () => {
      togglePanel();
    });
  }, [registerAction, togglePanel]);

  const toggleBrowser = useCallback(() => {
    setActiveOverlay((prev) => (prev === 'browser' ? 'none' : 'browser'));
  }, []);

  useEffect(() => {
    return registerAction('toggle-browser', () => {
      toggleBrowser();
    });
  }, [registerAction, toggleBrowser]);

  const toggleGitDiff = useCallback(() => {
    if (!activeSessionInfoRef.current?.isGitRepo) return;
    setActiveOverlay((prev) => (prev === 'git-diff' ? 'none' : 'git-diff'));
  }, []);

  useEffect(() => {
    return registerAction('toggle-git-diff', () => {
      toggleGitDiff();
    });
  }, [registerAction, toggleGitDiff]);

  const toggleNotes = useCallback(() => {
    setActiveOverlay((prev) => (prev === 'notes' ? 'none' : 'notes'));
  }, []);

  useEffect(() => {
    return registerAction('toggle-notes', () => {
      toggleNotes();
    });
  }, [registerAction, toggleNotes]);

  const revealTerminalUi = useCallback(() => {
    switchPanel(TERMINAL_PANEL_ID);
    setActiveOverlay('none');
  }, [switchPanel]);

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

          {/* Git Diff panel toggle */}
          <button
            onClick={isGitRepo ? toggleGitDiff : undefined}
            title={
              isGitRepo
                ? getIconButtonTooltip({
                    label: activeOverlay === 'git-diff' ? '关闭 Git Diff' : '打开 Git Diff',
                    bindings,
                    actionId: 'toggle-git-diff',
                  })
                : '当前目录不是 Git 仓库'
            }
            style={{
              ...toggleButtonStyle,
              marginLeft: 4,
              ...(isGitRepo
                ? activeOverlay === 'git-diff'
                  ? {
                      backgroundColor: 'var(--color-surface-content-elevated)',
                      borderColor: 'var(--color-border-primary)',
                      color: ICON_COLOR_ACTIVE,
                      boxShadow: 'var(--color-shadow-soft)',
                    }
                  : {}
                : {
                    opacity: 0.35,
                    cursor: 'not-allowed',
                  }),
            }}
            onMouseEnter={(e) => {
              if (isGitRepo) applyChromeButtonHover(e.currentTarget);
            }}
            onMouseLeave={(e) => {
              if (isGitRepo && activeOverlay !== 'git-diff') resetChromeButtonHover(e.currentTarget);
            }}
          >
            <GitCompareArrows size={16} />
          </button>

          {/* Browser panel toggle */}
          <button
            onClick={toggleBrowser}
            title={getIconButtonTooltip({
              label: activeOverlay === 'browser' ? '关闭浏览器' : '打开浏览器',
              bindings,
              actionId: 'toggle-browser',
            })}
            style={{
              ...toggleButtonStyle,
              marginLeft: 4,
              ...(activeOverlay === 'browser'
                ? {
                    backgroundColor: 'var(--color-surface-content-elevated)',
                    borderColor: 'var(--color-border-primary)',
                    color: ICON_COLOR_ACTIVE,
                    boxShadow: 'var(--color-shadow-soft)',
                  }
                : {}),
            }}
            onMouseEnter={(e) => applyChromeButtonHover(e.currentTarget)}
            onMouseLeave={(e) => {
              if (activeOverlay !== 'browser') resetChromeButtonHover(e.currentTarget);
            }}
          >
            <Globe size={16} />
          </button>

          {/* Notes panel toggle */}
          <button
            onClick={toggleNotes}
            title={getIconButtonTooltip({
              label: activeOverlay === 'notes' ? '关闭笔记' : '打开笔记',
              bindings,
              actionId: 'toggle-notes',
            })}
            style={{
              ...toggleButtonStyle,
              marginLeft: 4,
              ...(activeOverlay === 'notes'
                ? {
                    backgroundColor: 'var(--color-surface-content-elevated)',
                    borderColor: 'var(--color-border-primary)',
                    color: ICON_COLOR_ACTIVE,
                    boxShadow: 'var(--color-shadow-soft)',
                  }
                : {}),
            }}
            onMouseEnter={(e) => applyChromeButtonHover(e.currentTarget)}
            onMouseLeave={(e) => {
              if (activeOverlay !== 'notes') resetChromeButtonHover(e.currentTarget);
            }}
          >
            <NotebookPen size={16} />
          </button>
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
          <BrowserPanel
            isOpen={activeOverlay === 'browser'}
            onClose={() => setActiveOverlay('none')}
          />
          <GitDiffPanel
            isOpen={activeOverlay === 'git-diff'}
            onClose={() => setActiveOverlay('none')}
            cwd={activeSessionInfo?.cwd ?? null}
            branchName={activeSessionInfo?.branchName ?? null}
            gitRoot={activeSessionInfo?.gitRoot ?? null}
          />
          <NotePanel
            isOpen={activeOverlay === 'notes'}
            onClose={() => setActiveOverlay('none')}
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
        noteVaultSettings={noteVaultSettings}
        onSave={saveBindings}
        onSaveSpecDirectoryNames={handleSaveSpecDirectoryNames}
        onSaveTerminalStartDirectory={handleSaveTerminalStartDirectory}
        onSaveTerminalRendererPreferWebgl={handleSaveTerminalRendererPreferWebgl}
        onSaveHiddenFolderNames={handleSaveHiddenFolderNames}
        onSaveNoteVaultSettings={handleSaveNoteVaultSettings}
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
