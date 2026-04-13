import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Monitor } from 'lucide-react';
import TerminalPanel from './components/TerminalPanel';
import FilePreviewPanel from './components/FilePreviewPanel';
import SettingsPanel from './components/SettingsPanel';
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
import { getIconButtonTooltip } from './utils/icon-button-tooltips';

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
  return <TerminalPanel onActiveSessionChange={setActiveSessionId} />;
};

const TERMINAL_PANEL_ID = 'terminal';
const STORAGE_KEY_PANEL_VISIBLE = 'sidebarPanelVisible';

const INITIAL_PANELS: PanelDefinition[] = [
  { id: TERMINAL_PANEL_ID, component: ConnectedTerminalPanel },
];

const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';

// Height of the dedicated title bar area (houses traffic lights + sidebar toggle)
const TITLE_BAR_HEIGHT = 38;

const toggleButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  background: 'transparent',
  borderRadius: 4,
  cursor: 'pointer',
  color: ICON_COLOR,
  padding: 0,
  transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
  // Clickable even in title bar drag region
  WebkitAppRegion: 'no-drag' as const,
};

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
  const fileTreeToggleTitle = getIconButtonTooltip({
    label: panelVisible ? '收起文件树' : '展开文件树',
    bindings,
    actionId: 'toggle-file-tree',
  });

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
          backgroundColor: 'var(--color-bg-primary)',
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
            backgroundColor: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border-primary)',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <button
            onClick={togglePanel}
            title={fileTreeToggleTitle}
            style={toggleButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = ICON_COLOR_ACTIVE;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 6px var(--color-shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = ICON_COLOR;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {panelVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <button
            onClick={cycleTheme}
            title={themeTitle}
            style={{ ...toggleButtonStyle, marginLeft: 4 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = ICON_COLOR_ACTIVE;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 6px var(--color-shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = ICON_COLOR;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ThemeIcon size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <SplitLayout
            left={<FilePreviewPanel activeSessionId={activeSessionId} visible={panelVisible} />}
            right={<PanelContainer />}
            defaultLeftPercent={50}
            shadow
            leftCollapsed={!panelVisible}
          />
        </div>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        bindings={bindings}
        specDirectoryNames={specDirectoryNames}
        onSave={saveBindings}
        onSaveSpecDirectoryNames={handleSaveSpecDirectoryNames}
        onClose={closeSettings}
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
