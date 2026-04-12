import React, { useCallback, useRef } from 'react';
import { Plus, X } from 'lucide-react';

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

const TAB_BAR_HEIGHT = 40;

const styles = {
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'var(--color-bg-secondary)',
    paddingLeft: 8,
    paddingRight: 8,
    userSelect: 'none' as const,
    WebkitAppRegion: 'drag' as const,
    flexShrink: 0,
  },
  tabList: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: '100%',
    overflow: 'hidden',
    flex: 1,
    WebkitAppRegion: 'no-drag' as const,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '4px 12px',
    fontSize: 12,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    borderRadius: 8,
    border: 'none',
    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
    position: 'relative' as const,
    whiteSpace: 'nowrap' as const,
  },
  tabActive: {
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-pill-active)',
    boxShadow: '0 1px 3px var(--color-shadow)',
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
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: 'opacity 120ms ease, background-color 0.15s ease',
  },
  closeBtnVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
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
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    borderRadius: 8,
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
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
  const closeBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleTabMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, tabId: string, isActive: boolean) => {
    const el = e.currentTarget;
    if (!isActive) {
      el.style.backgroundColor = 'var(--color-bg-pill-hover)';
      el.style.color = 'var(--color-text-tertiary)';
    }
    // Show close button on hover
    const btn = closeBtnRefs.current.get(tabId);
    if (btn && !isActive) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }, []);

  const handleTabMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>, tabId: string, isActive: boolean) => {
    const el = e.currentTarget;
    if (!isActive) {
      el.style.backgroundColor = 'transparent';
      el.style.color = 'var(--color-text-muted)';
    }
    // Hide close button when not hovering (non-active tabs)
    const btn = closeBtnRefs.current.get(tabId);
    if (btn && !isActive) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  }, []);

  const handleTabMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(0.97)';
  }, []);

  const handleTabMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

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
              onMouseEnter={(e) => handleTabMouseEnter(e, tab.id, isActive)}
              onMouseLeave={(e) => handleTabMouseLeave(e, tab.id, isActive)}
              onMouseDown={handleTabMouseDown}
              onMouseUp={handleTabMouseUp}
            >
              <span style={styles.tabName}>{tab.name}</span>
              <button
                ref={(el) => {
                  if (el) closeBtnRefs.current.set(tab.id, el);
                  else closeBtnRefs.current.delete(tab.id);
                }}
                style={{
                  ...styles.closeBtn,
                  ...(isActive ? styles.closeBtnVisible : {}),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        style={styles.newBtn}
        onClick={onNew}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }}
        title="New Terminal"
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  );
};

export { TAB_BAR_HEIGHT };
export default TerminalTabBar;
