import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Monitor, Cast } from 'lucide-react';
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
} from './components/PanelManager';
import type { PanelDefinition } from './components/PanelManager';
import {
  readSpecDirectoryNames,
  saveSpecDirectoryNames,
} from './utils/file-tree-settings';
import {
  readTerminalStartDirectory,
  saveTerminalStartDirectory,
  TERMINAL_START_DIRECTORY_CHANGED_EVENT,
} from './utils/terminal-settings';
import { getIconButtonTooltip } from './utils/icon-button-tooltips';
import { startRecording, stopLiveRecording, forceCheckout } from './live-view-recorder';

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

  useEffect(() => {
    const handleDirectoryChange = () => {
      setInitialDirectory(readTerminalStartDirectory());
    };

    window.addEventListener('storage', handleDirectoryChange);
    window.addEventListener(TERMINAL_START_DIRECTORY_CHANGED_EVENT, handleDirectoryChange);
    return () => {
      window.removeEventListener('storage', handleDirectoryChange);
      window.removeEventListener(TERMINAL_START_DIRECTORY_CHANGED_EVENT, handleDirectoryChange);
    };
  }, []);

  return (
    <TerminalPanel
      initialDirectory={initialDirectory || undefined}
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
  const fileTreeToggleTitle = getIconButtonTooltip({
    label: panelVisible ? '收起文件树' : '展开文件树',
    bindings,
    actionId: 'toggle-file-tree',
  });

  // Live View state
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [liveViewActive, setLiveViewActive] = useState(false);

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

  useEffect(() => {
    return registerAction('toggle-file-tree', () => {
      togglePanel();
    });
  }, [registerAction, togglePanel]);

  return (
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
        onSave={saveBindings}
        onSaveSpecDirectoryNames={handleSaveSpecDirectoryNames}
        onSaveTerminalStartDirectory={handleSaveTerminalStartDirectory}
        onClose={closeSettings}
      />

      <LiveViewPanel
        isOpen={isLiveViewOpen}
        onClose={() => setIsLiveViewOpen(false)}
        onActiveChange={setLiveViewActive}
      />
    </>
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
