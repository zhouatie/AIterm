import React, { useEffect } from 'react';
import TerminalPanel from './components/TerminalPanel';
import {
  PanelManagerProvider,
  PanelContainer,
  usePanelManager,
} from './components/PanelManager';
import type { PanelDefinition } from './components/PanelManager';

const TERMINAL_PANEL_ID = 'terminal';

// Define initial panels statically so they render on the first frame
const INITIAL_PANELS: PanelDefinition[] = [
  { id: TERMINAL_PANEL_ID, component: TerminalPanel },
];

const AppContent: React.FC = () => {
  const { panels, switchPanel, activePanel } = usePanelManager();

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
      <PanelContainer />
    </div>
  );
};

const App: React.FC = () => {
  console.log('[App] rendering');
  return (
    <PanelManagerProvider
      defaultPanel={TERMINAL_PANEL_ID}
      initialPanels={INITIAL_PANELS}
    >
      <AppContent />
    </PanelManagerProvider>
  );
};

export default App;
