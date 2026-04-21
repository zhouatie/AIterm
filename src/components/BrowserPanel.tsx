import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useImperativeHandle,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  Clock,
  Search,
} from 'lucide-react';
import type { BrowserShortcutCommand } from '../preload';

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

interface HistoryEntry {
  url: string;
  title: string;
  visitedAt: number;
}

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BrowserPanelHandle {
  executeCommand: (command: BrowserShortcutCommand) => void;
  openUrl: (url: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_URL = 'about:blank';
const TAB_BAR_HEIGHT = 38;
const NAV_BAR_HEIGHT = 36;
const HISTORY_KEY = 'browser-url-history';
const HISTORY_MAX = 1000;

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

/** Load browsing history from localStorage. Returns [] on any error. */
function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist history to localStorage. Silently ignores errors. */
function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Silent fail — degrade gracefully
  }
}

/**
 * Add or update a URL in history.
 * - If the URL already exists, updates visitedAt (and title if provided).
 * - Sorts by visitedAt descending and trims to HISTORY_MAX.
 */
function addToHistory(
  entries: HistoryEntry[],
  url: string,
  title: string,
): HistoryEntry[] {
  const now = Date.now();
  const existingIdx = entries.findIndex((e) => e.url === url);
  let updated: HistoryEntry[];
  if (existingIdx >= 0) {
    updated = entries.map((e, i) =>
      i === existingIdx
        ? { ...e, title: title || e.title, visitedAt: now }
        : e,
    );
  } else {
    updated = [{ url, title, visitedAt: now }, ...entries];
  }
  updated.sort((a, b) => b.visitedAt - a.visitedAt);
  return updated.slice(0, HISTORY_MAX);
}

/**
 * Fetch search suggestions from DuckDuckGo Autocomplete API.
 * Returns [] on any error or abort.
 */
async function fetchSuggestions(
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
      { signal },
    );
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data[1]) ? data[1].slice(0, 4) : [];
  } catch {
    return [];
  }
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

/** Wrapper div around the address bar — gives position:relative context for the dropdown. */
const addressWrapperStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
};

const addressBarStyle: React.CSSProperties = {
  width: '100%',
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
  boxSizing: 'border-box',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 2,
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 100,
  overflow: 'hidden',
};

const dropdownItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  background: active ? 'var(--color-bg-hover)' : 'transparent',
  transition: 'background 0.1s',
});

const dropdownDividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--color-border-primary)',
  margin: '2px 0',
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

const BrowserPanel = forwardRef<BrowserPanelHandle, BrowserPanelProps>(({ isOpen, onClose }, ref) => {
  // --- Tab state ---
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  // Refs to webview elements keyed by tab id
  const webviewRefs = useRef<Map<string, Electron.WebviewTag>>(new Map());

  // Address bar local state (editable, syncs with active tab URL)
  const [addressValue, setAddressValue] = useState(DEFAULT_URL);

  // --- History & autocomplete state ---
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [originalInput, setOriginalInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Sync address bar when active tab changes or its URL changes
  useEffect(() => {
    if (activeTab) {
      setAddressValue(activeTab.url);
    } else {
      setAddressValue('');
    }
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [activeTab?.id, activeTab?.url]);

  // Debounce address input before triggering suggestion fetch
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(addressValue), 300);
    return () => clearTimeout(timer);
  }, [addressValue]);

  // Fetch search suggestions when debounced input changes
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetchSuggestions(debouncedInput, controller.signal).then(setSuggestions);
    return () => controller.abort();
  }, [debouncedInput]);

  // History entries that match the current address input (synchronous, max 4)
  const filteredHistory = useMemo(() => {
    if (!addressValue.trim()) return [];
    const q = addressValue.toLowerCase();
    return history
      .filter(
        (e) =>
          e.url.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q),
      )
      .slice(0, 4);
  }, [history, addressValue]);

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

  const selectRelativeTab = useCallback((direction: -1 | 1) => {
    if (tabs.length <= 1) return;

    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setActiveTabId(nextTab.id);
  }, [activeTabId, tabs]);

  const selectTabByIndex = useCallback((oneBased: number) => {
    if (oneBased < 1 || oneBased > tabs.length) return;
    const nextTab = tabs[oneBased - 1];
    if (!nextTab) return;
    setActiveTabId(nextTab.id);
  }, [tabs]);

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
      setShowDropdown(false);
      setActiveIndex(-1);
    },
    [activeTabId, updateTab],
  );

  const handleAddressKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Build the combined candidate list (history first, then suggestions)
      const candidates = [
        ...filteredHistory.map((entry) => entry.url),
        ...suggestions,
      ];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (candidates.length === 0) return;
        const next = activeIndex < candidates.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        setAddressValue(candidates[next]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (candidates.length === 0) return;
        if (activeIndex <= 0) {
          setActiveIndex(-1);
          setAddressValue(originalInput);
        } else {
          const prev = activeIndex - 1;
          setActiveIndex(prev);
          setAddressValue(candidates[prev]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < candidates.length) {
          navigateTo(candidates[activeIndex]);
        } else {
          navigateTo(addressValue);
        }
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    },
    [addressValue, navigateTo, activeIndex, originalInput, filteredHistory, suggestions],
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

  const openUrl = useCallback((url: string) => {
    addTab(url);
  }, [addTab]);

  const executeCommand = useCallback((command: BrowserShortcutCommand) => {
    switch (command) {
      case 'new-tab':
        addTab();
        return;
      case 'close-tab':
        if (activeTabId) closeTab(activeTabId);
        return;
      case 'select-previous-tab':
        selectRelativeTab(-1);
        return;
      case 'select-next-tab':
        selectRelativeTab(1);
        return;
      case 'select-tab-1':
        selectTabByIndex(1);
        return;
      case 'select-tab-2':
        selectTabByIndex(2);
        return;
      case 'select-tab-3':
        selectTabByIndex(3);
        return;
      case 'select-tab-4':
        selectTabByIndex(4);
        return;
      case 'select-tab-5':
        selectTabByIndex(5);
        return;
      case 'select-tab-6':
        selectTabByIndex(6);
        return;
      case 'select-tab-7':
        selectTabByIndex(7);
        return;
      case 'select-tab-8':
        selectTabByIndex(8);
        return;
      case 'select-tab-9':
        if (tabs.length > 0) {
          const lastTab = tabs[tabs.length - 1];
          if (lastTab) setActiveTabId(lastTab.id);
        }
        return;
      case 'reload':
        reload();
        return;
      case 'go-back':
        goBack();
        return;
      case 'go-forward':
        goForward();
        return;
      case 'toggle-browser':
        onClose();
        return;
      default:
        return;
    }
  }, [activeTabId, addTab, closeTab, goBack, goForward, onClose, reload, selectRelativeTab, selectTabByIndex, tabs]);

  useImperativeHandle(ref, () => ({
    executeCommand,
    openUrl,
  }), [executeCommand, openUrl]);

  // -----------------------------------------------------------------------
  // Webview event binding
  // -----------------------------------------------------------------------

  const bindWebviewEvents = useCallback(
    (webview: Electron.WebviewTag, tabId: string) => {
      const onTitleUpdated = (e: Electron.PageTitleUpdatedEvent) => {
        updateTab(tabId, { title: e.title });
        // Keep history title in sync
        const url = webview.getURL?.() ?? '';
        if (url) {
          setHistory((prev) => {
            const idx = prev.findIndex((entry) => entry.url === url);
            if (idx < 0) return prev;
            const updated = prev.map((entry, i) =>
              i === idx ? { ...entry, title: e.title } : entry,
            );
            saveHistory(updated);
            return updated;
          });
        }
      };

      const onDidNavigate = (e: Electron.DidNavigateEvent) => {
        updateTab(tabId, {
          url: e.url,
          isLoading: false,
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
        });
        // Persist URL to history (title will be updated later by onTitleUpdated)
        setHistory((prev) => {
          const updated = addToHistory(prev, e.url, '');
          saveHistory(updated);
          return updated;
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

        {/* Address bar with autocomplete dropdown */}
        <div style={addressWrapperStyle}>
          <input
            style={addressBarStyle}
            value={addressValue}
            onChange={(e) => {
              const val = e.target.value;
              setAddressValue(val);
              setOriginalInput(val);
              setActiveIndex(-1);
              setShowDropdown(val.trim().length > 0);
            }}
            onKeyDown={handleAddressKeyDown}
            onFocus={(e) => {
              e.currentTarget.select();
              e.currentTarget.style.borderColor = 'var(--color-border-focus)';
              if (addressValue.trim()) {
                setOriginalInput(addressValue);
                setShowDropdown(true);
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              // Delay so click events on dropdown items fire first
              setTimeout(() => setShowDropdown(false), 150);
            }}
            placeholder="输入网址或搜索内容"
            spellCheck={false}
          />

          {/* Autocomplete dropdown */}
          {showDropdown && (filteredHistory.length > 0 || suggestions.length > 0) && (
            <div style={dropdownStyle}>
              {/* History candidates */}
              {filteredHistory.map((entry, i) => (
                <div
                  key={entry.url}
                  style={dropdownItemStyle(activeIndex === i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    navigateTo(entry.url);
                    setShowDropdown(false);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                >
                  <Clock
                    size={12}
                    style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.url}
                  </span>
                </div>
              ))}

              {/* Divider between history and suggestions */}
              {filteredHistory.length > 0 && suggestions.length > 0 && (
                <div style={dropdownDividerStyle} />
              )}

              {/* Search suggestions */}
              {suggestions.map((s, i) => {
                const idx = filteredHistory.length + i;
                return (
                  <div
                    key={s}
                    style={dropdownItemStyle(activeIndex === idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      navigateTo(s);
                      setShowDropdown(false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                  >
                    <Search
                      size={12}
                      style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }}
                    />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
});

BrowserPanel.displayName = 'BrowserPanel';

export default BrowserPanel;
