import React from 'react';

export interface TabInfo {
  id: string;
  name: string;
}

interface TerminalTabBarProps {
  tabs: TabInfo[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

const TAB_BAR_HEIGHT = 36;

const styles = {
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    paddingLeft: 96, // leave space for macOS traffic lights + sidebar toggle
    userSelect: 'none' as const,
    WebkitAppRegion: 'drag' as const,
    flexShrink: 0,
  },
  tabList: {
    display: 'flex',
    alignItems: 'stretch',
    height: '100%',
    overflow: 'hidden',
    flex: 1,
    WebkitAppRegion: 'no-drag' as const,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    fontSize: 12,
    color: '#666',
    cursor: 'pointer',
    borderRight: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    transition: 'background-color 0.1s',
    position: 'relative' as const,
    whiteSpace: 'nowrap' as const,
  },
  tabActive: {
    color: '#1e1e1e',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #0451a5',
  },
  tabName: {
    pointerEvents: 'none' as const,
  },
  closeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#999',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginLeft: 4,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: 18,
    cursor: 'pointer',
    borderRadius: 4,
    flexShrink: 0,
    WebkitAppRegion: 'no-drag' as const,
  },
};

const TerminalTabBar: React.FC<TerminalTabBarProps> = ({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNew,
}) => {
  return (
    <div style={styles.tabBar}>
      <div style={styles.tabList}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              }}
              onClick={() => onSelect(tab.id)}
            >
              <span style={styles.tabName}>{tab.name}</span>
              <button
                style={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e0e0e0';
                  (e.target as HTMLElement).style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = '#999';
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        style={styles.newBtn}
        onClick={onNew}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.backgroundColor = '#e0e0e0';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }}
        title="New Terminal"
      >
        +
      </button>
    </div>
  );
};

export { TAB_BAR_HEIGHT };
export default TerminalTabBar;
