import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_URL = 'https://www.google.com';
const TAB_BAR_HEIGHT = 38;
const NAV_BAR_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTab(url: string = DEFAULT_URL): BrowserTab {
  return {
    id: crypto.randomUUID(),
    url,
    title: 'New Tab',
    isLoading: true,
    canGoBack: false,
    canGoForward: false,
  };
}

/** Decide whether raw input looks like a URL or a search query. */
function resolveInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_URL;

  // Already has protocol
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;

  // Looks like a domain (contains a dot and no spaces)
  if (/^[^\s]+\.[^\s]+$/.test(trimmed)) return `https://${trimmed}`;

  // Treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelContainerStyle = (isOpen: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-bg-primary)',
  transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
  opacity: isOpen ? 1 : 0,
  pointerEvents: isOpen ? 'auto' : 'none',
  transition: 'transform 300ms ease, opacity 300ms ease',
});

const tabBarStyle: React.CSSProperties = {
  height: TAB_BAR_HEIGHT,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '0 8px',
  background: 'var(--color-bg-secondary)',
  borderBottom: '1px solid var(--color-border-primary)',
  overflow: 'hidden',
};

const navBarStyle: React.CSSProperties = {
  height: NAV_BAR_HEIGHT,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 8px',
  background: 'var(--color-bg-secondary)',
  borderBottom: '1px solid var(--color-border-primary)',
};

const navButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  border: 'none',
  background: 'transparent',
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  padding: 0,
  transition: 'background 0.15s, color 0.15s',
};

const navButtonDisabledStyle: React.CSSProperties = {
  ...navButtonStyle,
  opacity: 0.35,
  cursor: 'default',
};

const addressBarStyle: React.CSSProperties = {
  flex: 1,
  height: 26,
  border: '1px solid var(--color-border-primary)',
  borderRadius: 6,
  padding: '0 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface-content)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 28,
  maxWidth: 180,
  minWidth: 60,
  padding: '0 8px 0 12px',
  borderRadius: 6,
  border: isActive ? '1px solid var(--color-border-primary)' : '1px solid transparent',
  background: isActive ? 'var(--color-surface-content-elevated)' : 'transparent',
  cursor: 'pointer',
  fontSize: 11,
  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  transition: 'background 0.15s, border-color 0.15s',
  flexShrink: 1,
});

const tabCloseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  border: 'none',
  background: 'transparent',
  borderRadius: 4,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  padding: 0,
  flexShrink: 0,
  transition: 'background 0.15s',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BrowserPanel: React.FC<BrowserPanelProps> = ({ isOpen, onClose }) => {
  // --- Tab state ---
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  // Refs to webview elements keyed by tab id
  const webviewRefs = useRef<Map<string, Electron.WebviewTag>>(new Map());

  // Address bar local state (editable, syncs with active tab URL)
  const [addressValue, setAddressValue] = useState(DEFAULT_URL);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Sync address bar when active tab changes or its URL changes
  useEffect(() => {
    if (activeTab) {
      setAddressValue(activeTab.url);
    } else {
      setAddressValue('');
    }
  }, [activeTab?.id, activeTab?.url]);

  // -----------------------------------------------------------------------
  // Tab operations
  // -----------------------------------------------------------------------

  const addTab = useCallback((url?: string) => {
    const newTab = createTab(url);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1) return prev;

        const next = prev.filter((t) => t.id !== tabId);

        // Last tab closed — show empty state (don't close panel)
        if (next.length === 0) {
          setActiveTabId('');
          return [];
        }

        // If closing active tab, activate an adjacent one
        if (tabId === activeTabId) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        }

        return next;
      });

      // Clean up webview ref
      webviewRefs.current.delete(tabId);
    },
    [activeTabId],
  );

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // -----------------------------------------------------------------------
  // Update tab metadata from webview events
  // -----------------------------------------------------------------------

  const updateTab = useCallback((tabId: string, patch: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
  }, []);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const navigateTo = useCallback(
    (input: string) => {
      const url = resolveInput(input);
      const wv = webviewRefs.current.get(activeTabId);
      if (wv) {
        wv.src = url;
      }
      updateTab(activeTabId, { url, isLoading: true });
      setAddressValue(url);
    },
    [activeTabId, updateTab],
  );

  const handleAddressKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateTo(addressValue);
      }
    },
    [addressValue, navigateTo],
  );

  const goBack = useCallback(() => {
    const wv = webviewRefs.current.get(activeTabId);
    if (wv && activeTab?.canGoBack) wv.goBack();
  }, [activeTabId, activeTab?.canGoBack]);

  const goForward = useCallback(() => {
    const wv = webviewRefs.current.get(activeTabId);
    if (wv && activeTab?.canGoForward) wv.goForward();
  }, [activeTabId, activeTab?.canGoForward]);

  const reload = useCallback(() => {
    const wv = webviewRefs.current.get(activeTabId);
    if (wv) wv.reload();
  }, [activeTabId]);

  // -----------------------------------------------------------------------
  // Webview event binding
  // -----------------------------------------------------------------------

  const bindWebviewEvents = useCallback(
    (webview: Electron.WebviewTag, tabId: string) => {
      const onTitleUpdated = (e: Electron.PageTitleUpdatedEvent) => {
        updateTab(tabId, { title: e.title });
      };

      const onDidNavigate = (e: Electron.DidNavigateEvent) => {
        updateTab(tabId, {
          url: e.url,
          isLoading: false,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
        });
      };

      const onDidNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
        updateTab(tabId, {
          url: e.url,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
        });
      };

      const onDidStartLoading = () => {
        updateTab(tabId, { isLoading: true });
      };

      const onDidStopLoading = () => {
        updateTab(tabId, {
          isLoading: false,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
        });
      };

      webview.addEventListener('page-title-updated', onTitleUpdated as EventListener);
      webview.addEventListener('did-navigate', onDidNavigate as EventListener);
      webview.addEventListener('did-navigate-in-page', onDidNavigateInPage as EventListener);
      webview.addEventListener('did-start-loading', onDidStartLoading);
      webview.addEventListener('did-stop-loading', onDidStopLoading);

      return () => {
        webview.removeEventListener('page-title-updated', onTitleUpdated as EventListener);
        webview.removeEventListener('did-navigate', onDidNavigate as EventListener);
        webview.removeEventListener('did-navigate-in-page', onDidNavigateInPage as EventListener);
        webview.removeEventListener('did-start-loading', onDidStartLoading);
        webview.removeEventListener('did-stop-loading', onDidStopLoading);
      };
    },
    [updateTab],
  );

  // Ref callback for each webview
  const setWebviewRef = useCallback(
    (tabId: string) => (el: Electron.WebviewTag | null) => {
      if (el) {
        // Only bind events once per element
        if (!webviewRefs.current.has(tabId)) {
          webviewRefs.current.set(tabId, el);
          // Webview events can only be bound after the element is in DOM
          // Use a microtask to ensure the element is ready
          queueMicrotask(() => {
            bindWebviewEvents(el, tabId);
          });
        }
      }
    },
    [bindWebviewEvents],
  );

  const isEmpty = tabs.length === 0;

  // -----------------------------------------------------------------------
  // Listen for new-window URLs forwarded from main process via IPC
  // -----------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = window.browserApi.onOpenUrl(({ url }) => {
      addTab(url);
    });
    return unsubscribe;
  }, [addTab]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Empty state — all tabs closed
  if (isEmpty) {
    return (
      <div style={panelContainerStyle(isOpen)}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            userSelect: 'none',
          }}
        >
          <pre
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 20,
              fontWeight: 'bold',
              lineHeight: 1.2,
              color: 'var(--color-text-secondary)',
              opacity: 0.5,
              textAlign: 'center',
              letterSpacing: 2,
            }}
          >
{`
 _          _ _                            _     _ 
| |__   ___| | | ___   __      _____  _ __| | __| |
| '_ \\ / _ \\ | |/ _ \\  \\ \\ /\\ / / _ \\| '__| |/ _\` |
| | | |  __/ | | (_) |  \\ V  V / (_) | |  | | (_| |
|_| |_|\\___|_|_|\\___/    \\_/\\_/ \\___/|_|  |_|\\__,_|
`}
          </pre>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                borderRadius: 6,
                border: '1px solid var(--color-border-primary)',
                background: 'var(--color-surface-content)',
                color: 'var(--color-text-primary)',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => addTab()}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-content-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-content)';
              }}
            >
              <Plus size={14} />
              New Tab
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                borderRadius: 6,
                border: '1px solid transparent',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={panelContainerStyle(isOpen)}>
      {/* Tab bar */}
      <div style={tabBarStyle}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={tabStyle(tab.id === activeTabId)}
            onClick={() => switchTab(tab.id)}
          >
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tab.title || 'New Tab'}
            </span>
            <button
              style={tabCloseStyle}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title="关闭标签页"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          style={{ ...navButtonStyle, marginLeft: 2 }}
          onClick={() => addTab()}
          title="新建标签页"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Navigation bar */}
      <div style={navBarStyle}>
        <button
          style={activeTab?.canGoBack ? navButtonStyle : navButtonDisabledStyle}
          onClick={goBack}
          title="后退"
          disabled={!activeTab?.canGoBack}
          onMouseEnter={(e) => {
            if (activeTab?.canGoBack)
              e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          style={activeTab?.canGoForward ? navButtonStyle : navButtonDisabledStyle}
          onClick={goForward}
          title="前进"
          disabled={!activeTab?.canGoForward}
          onMouseEnter={(e) => {
            if (activeTab?.canGoForward)
              e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowRight size={14} />
        </button>
        <button
          style={navButtonStyle}
          onClick={reload}
          title="刷新"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <RotateCw size={13} />
        </button>

        <input
          style={addressBarStyle}
          value={addressValue}
          onChange={(e) => setAddressValue(e.target.value)}
          onKeyDown={handleAddressKeyDown}
          onFocus={(e) => {
            e.currentTarget.select();
            e.currentTarget.style.borderColor = 'var(--color-border-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          }}
          placeholder="输入网址或搜索内容"
          spellCheck={false}
        />

        <button
          style={navButtonStyle}
          onClick={onClose}
          title="关闭浏览器"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Webview container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.map((tab) => (
          <webview
            key={tab.id}
            ref={setWebviewRef(tab.id) as unknown as React.Ref<HTMLElement>}
            src={tab.url}
            partition="persist:browser"
            allowpopups={'true' as unknown as boolean}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: tab.id === activeTabId ? 'flex' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BrowserPanel;
