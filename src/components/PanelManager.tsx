import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface PanelDefinition {
  id: string;
  component: React.ComponentType;
}

interface PanelManagerContextValue {
  panels: PanelDefinition[];
  activePanel: string;
  registerPanel: (panel: PanelDefinition) => void;
  switchPanel: (id: string) => void;
}

const PanelManagerContext = createContext<PanelManagerContextValue | null>(null);

export const usePanelManager = (): PanelManagerContextValue => {
  const ctx = useContext(PanelManagerContext);
  if (!ctx) throw new Error('usePanelManager must be used within PanelManagerProvider');
  return ctx;
};

interface PanelManagerProviderProps {
  defaultPanel: string;
  initialPanels?: PanelDefinition[];
  children: ReactNode;
}

export const PanelManagerProvider: React.FC<PanelManagerProviderProps> = ({
  defaultPanel,
  initialPanels,
  children,
}) => {
  const [panels, setPanels] = useState<PanelDefinition[]>(initialPanels ?? []);
  const [activePanel, setActivePanel] = useState(defaultPanel);

  const registerPanel = useCallback((panel: PanelDefinition) => {
    setPanels((prev) => {
      if (prev.some((p) => p.id === panel.id)) return prev;
      return [...prev, panel];
    });
  }, []);

  const switchPanel = useCallback((id: string) => {
    setActivePanel(id);
  }, []);

  return (
    <PanelManagerContext.Provider
      value={{ panels, activePanel, registerPanel, switchPanel }}
    >
      {children}
    </PanelManagerContext.Provider>
  );
};

/**
 * Renders all registered panels, keeping inactive ones mounted but hidden
 * to preserve state (e.g. terminal scrollback, input history).
 */
export const PanelContainer: React.FC = () => {
  const { panels, activePanel } = usePanelManager();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {panels.map((panel) => (
        <div
          key={panel.id}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: panel.id === activePanel ? 'visible' : 'hidden',
            // Keep inactive panels in DOM but hidden, so they maintain state
            pointerEvents: panel.id === activePanel ? 'auto' : 'none',
          }}
        >
          <panel.component />
        </div>
      ))}
    </div>
  );
};
