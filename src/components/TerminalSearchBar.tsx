import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchAddon } from '@xterm/addon-search';
import { useTheme } from '../ThemeContext';
import './TerminalSearchBar.css';

interface TerminalSearchBarProps {
  searchAddon: SearchAddon | null;
  /** Initial search text (e.g. from terminal selection) */
  initialQuery?: string;
  onClose: () => void;
}

const TerminalSearchBar: React.FC<TerminalSearchBarProps> = ({
  searchAddon,
  initialQuery = '',
  onClose,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState<{ current: number; total: number } | null>(null);
  const [regexError, setRegexError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Update initial query when it changes (e.g. from selection)
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const doSearch = useCallback(
    (direction: 'next' | 'previous') => {
      if (!searchAddon || !query) {
        setMatchCount(null);
        return;
      }

      // Validate regex if in regex mode
      if (useRegex) {
        try {
          new RegExp(query);
          setRegexError(false);
        } catch {
          setRegexError(true);
          setMatchCount(null);
          return;
        }
      } else {
        setRegexError(false);
      }

      const options = {
        regex: useRegex,
        caseSensitive,
        incremental: direction === 'next',
      };

      let found: boolean;
      if (direction === 'next') {
        found = searchAddon.findNext(query, options);
      } else {
        found = searchAddon.findPrevious(query, options);
      }

      // SearchAddon doesn't expose match count directly, so we track found/not-found
      if (!found && query) {
        setMatchCount({ current: 0, total: 0 });
      } else if (found) {
        // We can't get exact count from SearchAddon, just indicate matches exist
        setMatchCount(null); // clear "0/0" state — matches exist but count unknown
      }
    },
    [searchAddon, query, useRegex, caseSensitive],
  );

  // Trigger search when query or options change
  useEffect(() => {
    if (query) {
      doSearch('next');
    } else {
      setMatchCount(null);
      setRegexError(false);
      searchAddon?.clearDecorations();
    }
  }, [query, useRegex, caseSensitive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      searchAddon?.clearDecorations();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        doSearch('previous');
      } else {
        doSearch('next');
      }
    }
  };

  const noResults = matchCount?.total === 0 && query.length > 0;

  return (
    <div className={`terminal-search-bar theme-${theme}`}>
      <div className="terminal-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`terminal-search-input ${noResults || regexError ? 'no-results' : ''}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          spellCheck={false}
          autoComplete="off"
        />
        {noResults && (
          <span className="terminal-search-status">No results</span>
        )}
      </div>

      <button
        className={`terminal-search-toggle ${useRegex ? 'active' : ''}`}
        onClick={() => setUseRegex((v) => !v)}
        title="Use Regular Expression"
      >
        .*
      </button>
      <button
        className={`terminal-search-toggle ${caseSensitive ? 'active' : ''}`}
        onClick={() => setCaseSensitive((v) => !v)}
        title="Match Case"
      >
        Aa
      </button>

      <div className="terminal-search-nav">
        <button
          className="terminal-search-nav-btn"
          onClick={() => doSearch('previous')}
          title="Previous Match (Shift+Enter)"
        >
          &#x25B2;
        </button>
        <button
          className="terminal-search-nav-btn"
          onClick={() => doSearch('next')}
          title="Next Match (Enter)"
        >
          &#x25BC;
        </button>
      </div>

      <button
        className="terminal-search-close"
        onClick={() => {
          searchAddon?.clearDecorations();
          onClose();
        }}
        title="Close (Escape)"
      >
        &#x2715;
      </button>
    </div>
  );
};

export default TerminalSearchBar;
