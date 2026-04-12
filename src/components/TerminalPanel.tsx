import React, { useState, useCallback, useRef, useEffect } from 'react';
import TerminalTabBar, { TAB_BAR_HEIGHT } from './TerminalTabBar';
import type { TabInfo } from './TerminalTabBar';
import TerminalInstance from './TerminalInstance';

interface TerminalTab extends TabInfo {
  sessionId: string;
}

interface TerminalPanelProps {
  onActiveSessionChange?: (sessionId: string) => void;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ onActiveSessionChange }) => {
  const counterRef = useRef(1);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const initializedRef = useRef(false);

  // Create a new tab: spawn PTY and add to state
  const createTab = useCallback(async () => {
    try {
      const { id: sessionId } = await window.terminalApi.create(80, 24);
      const num = counterRef.current++;
      const tab: TerminalTab = {
        id: sessionId,
        name: `Terminal ${num}`,
        sessionId,
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    } catch (err) {
      console.error('[TerminalPanel] Failed to create tab:', err);
    }
  }, []);

  // Initialize with one default tab on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    createTab();
  }, [createTab]);

  // Notify parent when active session changes
  useEffect(() => {
    if (activeTabId) {
      onActiveSessionChange?.(activeTabId);
    }
  }, [activeTabId, onActiveSessionChange]);

  // Handle tab selection
  const handleSelect = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  // Handle tab close
  const handleClose = useCallback(
    async (id: string) => {
      // Dispose the PTY session
      try {
        await window.terminalApi.dispose(id);
      } catch {
        // PTY may already be gone
      }

      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id);

        if (remaining.length === 0) {
          // Last tab closed — create a new one
          createTab();
          return [];
        }

        // If closing the active tab, switch to adjacent
        if (id === activeTabId) {
          const closedIndex = prev.findIndex((t) => t.id === id);
          const nextIndex = Math.min(closedIndex, remaining.length - 1);
          setActiveTabId(remaining[nextIndex].id);
        }

        return remaining;
      });
    },
    [activeTabId, createTab],
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={handleSelect}
        onClose={handleClose}
        onNew={createTab}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.map((tab) => (
          <TerminalInstance
            key={tab.sessionId}
            sessionId={tab.sessionId}
            isActive={tab.id === activeTabId}
          />
        ))}
      </div>
    </div>
  );
};

export default TerminalPanel;
