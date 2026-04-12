import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import TerminalPanel from './components/TerminalPanel';
import FilePreviewPanel from './components/FilePreviewPanel';
import SplitLayout from './components/SplitLayout';
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

const ICON_COLOR = '#8b8b8b';
const ICON_COLOR_ACTIVE = '#5a5a5a';

const toggleButtonStyle = {
  position: 'absolute' as const,
  top: 6,
  left: 68,
  zIndex: 1000,
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
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Always render both panels — use leftCollapsed to hide/show without remounting */}
      <SplitLayout
        left={<FilePreviewPanel activeSessionId={activeSessionId} visible={panelVisible} />}
        right={<PanelContainer />}
        defaultLeftPercent={50}
        shadow
        leftCollapsed={!panelVisible}
      />

      {/* Toggle button — fixed in top-left area, right after traffic lights */}
      <button
        onClick={togglePanel}
        title={panelVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        style={toggleButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
          e.currentTarget.style.color = ICON_COLOR_ACTIVE;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = ICON_COLOR;
        }}
      >
        {panelVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>
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
