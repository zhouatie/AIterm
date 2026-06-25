import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { TerminalTranscriptSearchMatch } from '../preload';

interface TerminalTranscriptViewerProps {
  transcriptId: string;
  title: string;
  onClose: () => void;
}

const REFRESH_INTERVAL_MS = 1500;

function splitTranscriptLines(content: string): string[] {
  if (!content) return [];
  return content.split('\n');
}

const TerminalTranscriptViewer: React.FC<TerminalTranscriptViewerProps> = ({
  transcriptId,
  title,
  onClose,
}) => {
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<TerminalTranscriptSearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const lines = useMemo(() => splitTranscriptLines(content), [content]);
  const activeMatch = activeMatchIndex >= 0 ? matches[activeMatchIndex] ?? null : null;

  const loadTranscript = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    const result = await window.terminalApi.readTranscript(transcriptId);
    if ('error' in result) {
      setError(result.error);
    } else {
      setContent(result.content);
      setError(null);
    }
    if (showLoading) setLoading(false);
  }, [transcriptId]);

  useEffect(() => {
    void loadTranscript(true);
    const timer = window.setInterval(() => {
      void loadTranscript(false);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadTranscript]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    setExportMessage(null);
    if (!trimmedQuery) {
      setMatches([]);
      setActiveMatchIndex(-1);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      void window.terminalApi.searchTranscript(transcriptId, trimmedQuery).then((result) => {
        if ('error' in result) {
          setMatches([]);
          setActiveMatchIndex(-1);
          setError(result.error);
        } else {
          setMatches(result.matches);
          setActiveMatchIndex(result.matches.length > 0 ? 0 : -1);
          setError(null);
        }
      }).finally(() => {
        setSearching(false);
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query, transcriptId]);

  useEffect(() => {
    if (!activeMatch) return;
    lineRefs.current.get(activeMatch.line)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [activeMatch]);

  const goToMatch = useCallback((direction: -1 | 1) => {
    setActiveMatchIndex((prev) => {
      if (matches.length === 0) return -1;
      if (prev === -1) return 0;
      return (prev + direction + matches.length) % matches.length;
    });
  }, [matches.length]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportMessage(null);
    const result = await window.terminalApi.exportTranscript(transcriptId);
    if ('error' in result) {
      setExportMessage(result.error);
    } else {
      setExportMessage(result.canceled ? null : '已导出');
    }
    setExporting(false);
  }, [transcriptId]);

  const matchCounter = matches.length > 0 && activeMatchIndex >= 0
    ? `${activeMatchIndex + 1}/${matches.length}`
    : query.trim()
    ? '0/0'
    : '';

  return (
    <div
      role="dialog"
      aria-label="Terminal Transcript"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 24,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-terminal)',
        color: 'var(--color-text-primary)',
        borderLeft: '1px solid var(--color-border-secondary)',
      }}
    >
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface-content)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {lines.length} lines
          </span>
        </div>

        <label
          style={{
            width: 280,
            maxWidth: '34%',
            height: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 8px',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 transcript"
            style={{
              minWidth: 0,
              flex: 1,
              border: 0,
              outline: 0,
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: 12,
            }}
          />
          <span
            style={{
              minWidth: 34,
              textAlign: 'right',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {searching ? '...' : matchCounter}
          </span>
        </label>

        <button
          type="button"
          aria-label="上一个匹配"
          title="上一个匹配"
          disabled={matches.length === 0}
          onClick={() => goToMatch(-1)}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-content-elevated)',
            color: matches.length === 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            cursor: matches.length === 0 ? 'default' : 'pointer',
            opacity: matches.length === 0 ? 0.45 : 1,
            padding: 0,
            flexShrink: 0,
          }}
        >
          <ChevronUp size={15} />
        </button>

        <button
          type="button"
          aria-label="下一个匹配"
          title="下一个匹配"
          disabled={matches.length === 0}
          onClick={() => goToMatch(1)}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-content-elevated)',
            color: matches.length === 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            cursor: matches.length === 0 ? 'default' : 'pointer',
            opacity: matches.length === 0 ? 0.45 : 1,
            padding: 0,
            flexShrink: 0,
          }}
        >
          <ChevronDown size={15} />
        </button>

        <button
          type="button"
          aria-label="刷新"
          title="刷新"
          onClick={() => void loadTranscript(true)}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-content-elevated)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={14} />
        </button>

        <button
          type="button"
          aria-label="导出"
          title="导出"
          disabled={exporting}
          onClick={() => void handleExport()}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-content-elevated)',
            color: exporting ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            cursor: exporting ? 'default' : 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <Download size={14} />
        </button>

        <button
          type="button"
          aria-label="关闭"
          title="关闭"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-content-elevated)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {exportMessage && (
        <div
          style={{
            height: 28,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--color-border-secondary)',
            color: exportMessage === '已导出' ? 'var(--color-text-secondary)' : 'var(--color-agent-status-error)',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {exportMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            minHeight: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            borderBottom: '1px solid var(--color-border-secondary)',
            color: 'var(--color-agent-status-error)',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px 0 14px',
          backgroundColor: 'var(--color-surface-terminal)',
          fontFamily: '"JetBrainsMono Nerd Font", Menlo, Monaco, "Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        {loading && lines.length === 0 ? (
          <div style={{ padding: '0 14px', color: 'var(--color-text-muted)' }}>
            Loading...
          </div>
        ) : lines.length === 0 ? (
          <div style={{ padding: '0 14px', color: 'var(--color-text-muted)' }}>
            Empty transcript
          </div>
        ) : (
          lines.map((line, index) => {
            const lineNumber = index + 1;
            const isActiveLine = activeMatch?.line === lineNumber;
            return (
              <div
                key={lineNumber}
                ref={(element) => {
                  if (element) {
                    lineRefs.current.set(lineNumber, element);
                  } else {
                    lineRefs.current.delete(lineNumber);
                  }
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px minmax(0, 1fr)',
                  minHeight: 19,
                  backgroundColor: isActiveLine
                    ? 'color-mix(in srgb, var(--color-accent-primary) 16%, transparent)'
                    : 'transparent',
                }}
              >
                <span
                  style={{
                    padding: '0 10px 0 12px',
                    color: 'var(--color-text-muted)',
                    textAlign: 'right',
                    userSelect: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {lineNumber}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    paddingRight: 14,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {line || ' '}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TerminalTranscriptViewer;
