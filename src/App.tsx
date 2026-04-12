import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
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

const INITIAL_PANELS: PanelDefinition[] = [
  { id: TERMINAL_PANEL_ID, component: ConnectedTerminalPanel },
];

const AppContent: React.FC = () => {
  const { panels, switchPanel, activePanel } = usePanelManager();
  const { activeSessionId } = useActiveSession();

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
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      <SplitLayout
        left={<FilePreviewPanel activeSessionId={activeSessionId} />}
        right={<PanelContainer />}
        defaultLeftPercent={50}
      />
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
