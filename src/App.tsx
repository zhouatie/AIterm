import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, Monitor } from 'lucide-react';
import TerminalPanel from './components/TerminalPanel';
import FilePreviewPanel from './components/FilePreviewPanel';
import SplitLayout from './components/SplitLayout';
import { useTheme } from './ThemeContext';
import {
  PanelManagerProvider,
  PanelContainer,
  usePanelManager,
} from './components/PanelManager';
import type { PanelDefinition } from './components/PanelManager';

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
  // Clickable even in title bar drag region
  WebkitAppRegion: 'no-drag' as const,
};

const AppContent: React.FC = () => {
  const { panels, switchPanel, activePanel } = usePanelManager();
  const { activeSessionId } = useActiveSession();
  const { mode, cycleTheme } = useTheme();

  // Icon and tooltip for the theme toggle button
  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const themeTitle =
    mode === 'light' ? 'Light mode — click for Dark'
    : mode === 'dark' ? 'Dark mode — click for System'
    : 'System mode — click for Light';

  // Sidebar panel visibility — persisted in localStorage
  const [panelVisible, setPanelVisible] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PANEL_VISIBLE);
    return stored !== null ? stored === 'true' : true;
  });

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_PANEL_VISIBLE, String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut for panel switching (reserved for future panels)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K to cycle panels (only when there are multiple)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && panels.length > 1) {
        e.preventDefault();
        const currentIndex = panels.findIndex((p) => p.id === activePanel);
        const nextIndex = (currentIndex + 1) % panels.length;
        switchPanel(panels[nextIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panels, activePanel, switchPanel]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
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
          // 78px = traffic lights (~64px) + 14px harmonious gap
          paddingLeft: 78,
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-primary)',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <button
          onClick={togglePanel}
          title={panelVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          style={toggleButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            e.currentTarget.style.color = ICON_COLOR_ACTIVE;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = ICON_COLOR;
          }}
        >
          {panelVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {/* Theme toggle button — cycles light → dark → system → light */}
        <button
          onClick={cycleTheme}
          title={themeTitle}
          style={{ ...toggleButtonStyle, marginLeft: 4 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            e.currentTarget.style.color = ICON_COLOR_ACTIVE;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = ICON_COLOR;
          }}
        >
          <ThemeIcon size={16} />
        </button>
      </div>

      {/* Main content area — left sidebar + right panel */}
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
      <PanelManagerProvider
        defaultPanel={TERMINAL_PANEL_ID}
        initialPanels={INITIAL_PANELS}
      >
        <AppContent />
      </PanelManagerProvider>
    </ActiveSessionContext.Provider>
  );
};

export default App;
