import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, GitBranch, FileText, FilePlus, FileX, FileEdit, File, FolderGit } from 'lucide-react';
import { DiffView, DiffModeEnum } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view-pure.css';
import { useTheme } from '../ThemeContext';
import type { GitStatusSummary } from '../preload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitDiffPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string | null;
  branchName: string | null;
  gitRoot: string | null;
}

interface FileDiff {
  oldFileName: string;
  newFileName: string;
  hunks: string[];
}

// ---------------------------------------------------------------------------
// Helpers — parse raw `git diff` output into per-file chunks
// ---------------------------------------------------------------------------

function parseGitDiff(raw: string): FileDiff[] {
  if (!raw.trim()) return [];

  const files: FileDiff[] = [];
  // Split by `diff --git` boundaries
  const parts = raw.split(/^diff --git /m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split('\n');
    // First line: "a/path b/path"
    const header = lines[0] ?? '';
    const match = header.match(/^a\/(.+?)\s+b\/(.+?)$/);
    const oldFileName = match ? match[1] : 'unknown';
    const newFileName = match ? match[2] : 'unknown';

    // Collect all hunk content (from @@ lines onward, including --- and +++ and index lines)
    // The DiffView `hunks` expects the raw diff text for this file as a string array
    // Each element is a complete hunk string starting from the header lines
    const diffLines = lines.slice(1); // skip the "a/path b/path" line
    const hunkText = diffLines.join('\n').trim();

    if (hunkText) {
      files.push({
        oldFileName,
        newFileName,
        hunks: [hunkText],
      });
    }
  }

  return files;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot + 1);
}

/** Get just the filename from a path */
function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/** Get the directory portion of a path (everything before the last segment) */
function getFileDir(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
}

/** Determine file status icon based on git status summary */
function getFileStatus(
  fileName: string,
  statusSummary: GitStatusSummary | null,
): 'added' | 'deleted' | 'modified' | 'unknown' {
  if (!statusSummary) return 'unknown';
  const entry = statusSummary.files.find((f) => f.path === fileName);
  if (!entry) return 'modified';
  if (entry.status === '??' || entry.status.includes('A')) return 'added';
  if (entry.status.includes('D')) return 'deleted';
  return 'modified';
}

const STATUS_COLORS: Record<string, string> = {
  added: '#2da44e',
  deleted: '#cf222e',
  modified: '#bf8700',
  unknown: 'var(--color-text-secondary)',
};

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

const headerStyle: React.CSSProperties = {
  height: 40,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 12px',
  background: 'var(--color-bg-secondary)',
  borderBottom: '1px solid var(--color-border-primary)',
  fontSize: 13,
  color: 'var(--color-text-primary)',
};

const closeButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  padding: 0,
  marginLeft: 'auto',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 500,
  background: 'var(--color-surface-content-elevated)',
  color: 'var(--color-text-secondary)',
};

const SIDEBAR_WIDTH = 260;

const sidebarStyle: React.CSSProperties = {
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  overflow: 'auto',
  borderRight: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)',
};

const sidebarHeaderStyle: React.CSSProperties = {
  padding: '10px 12px 6px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GitDiffPanel: React.FC<GitDiffPanelProps> = ({
  isOpen,
  onClose,
  cwd,
  branchName,
  gitRoot,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([]);
  const [statusSummary, setStatusSummary] = useState<GitStatusSummary | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const prevOpenRef = useRef(false);
  const fileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch diff data when panel opens
  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    prevOpenRef.current = isOpen;

    if (!justOpened || !cwd) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveFileIndex(null);

    Promise.all([
      window.gitApi.diff(cwd),
      window.gitApi.statusSummary(cwd),
    ]).then(([diffResult, statusResult]) => {
      if (cancelled) return;

      if (diffResult.error) {
        setError(diffResult.error);
        setFileDiffs([]);
      } else {
        setFileDiffs(parseGitDiff(diffResult.diff ?? ''));
      }

      if (statusResult.summary) {
        setStatusSummary(statusResult.summary);
      }

      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setError(String(err));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, cwd]);

  // Track which file is in view while scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || fileDiffs.length === 0) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let closestIndex = 0;
      let closestDistance = Infinity;

      fileRefs.current.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerTop);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveFileIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Set initial active file
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [fileDiffs]);

  const scrollToFile = useCallback((index: number) => {
    const el = fileRefs.current.get(index);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveFileIndex(index);
    }
  }, []);

  const setFileRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      fileRefs.current.set(index, el);
    } else {
      fileRefs.current.delete(index);
    }
  }, []);

  const diffViewTheme = theme === 'dark' ? 'dark' : 'light';

  const totalChangedFiles = statusSummary
    ? statusSummary.modified + statusSummary.added + statusSummary.deleted
    : fileDiffs.length;

  const FileStatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 14 }) => {
    const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
    switch (status) {
      case 'added': return <FilePlus size={size} style={{ color, flexShrink: 0 }} />;
      case 'deleted': return <FileX size={size} style={{ color, flexShrink: 0 }} />;
      case 'modified': return <FileEdit size={size} style={{ color, flexShrink: 0 }} />;
      default: return <File size={size} style={{ color, flexShrink: 0 }} />;
    }
  };

  return (
    <div style={panelContainerStyle(isOpen)}>
      {/* Header */}
      <div style={headerStyle}>
        {gitRoot && (
          <span style={{ ...badgeStyle, fontFamily: 'var(--font-mono, monospace)', opacity: 0.85 }}>
            <FolderGit size={12} />
            {gitRoot}
          </span>
        )}

        {branchName && (
          <span style={badgeStyle}>
            <GitBranch size={12} />
            {branchName}
          </span>
        )}

        {statusSummary && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span style={badgeStyle}>
              <FileText size={11} />
              {totalChangedFiles} 文件变更
            </span>
            {statusSummary.untracked > 0 && (
              <span style={{ ...badgeStyle, background: 'var(--color-surface-warning, var(--color-surface-content-elevated))' }}>
                {statusSummary.untracked} untracked
              </span>
            )}
          </span>
        )}

        <button
          style={closeButtonStyle}
          onClick={onClose}
          title="关闭 Git Diff"
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

      {/* Body — sidebar + diff content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* File list sidebar */}
        {!loading && !error && fileDiffs.length > 0 && (
          <div style={sidebarStyle}>
            <div style={sidebarHeaderStyle}>
              变更文件 ({fileDiffs.length})
            </div>
            {fileDiffs.map((file, index) => {
              const status = getFileStatus(file.newFileName, statusSummary);
              const isActive = activeFileIndex === index;
              const dir = getFileDir(file.newFileName);
              const name = getFileName(file.newFileName);

              return (
                <div
                  key={`sidebar-${file.newFileName}-${index}`}
                  onClick={() => scrollToFile(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    background: isActive
                      ? 'var(--color-surface-content-elevated)'
                      : 'transparent',
                    borderLeft: isActive
                      ? '2px solid var(--color-icon-active)'
                      : '2px solid transparent',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--color-bg-hover, rgba(128,128,128,0.08))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <FileStatusIcon status={status} size={13} />
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {name}
                    </div>
                    {dir && (
                      <div style={{
                        fontSize: 10,
                        color: 'var(--color-text-tertiary, var(--color-text-secondary))',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 1,
                        opacity: 0.7,
                      }}>
                        {dir}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Diff content */}
        <div
          ref={scrollContainerRef}
          style={{ flex: 1, overflow: 'auto', padding: 0 }}
        >
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-secondary)',
              gap: 8,
              fontSize: 13,
            }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              加载中...
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-error, #e53e3e)',
              fontSize: 13,
              padding: 24,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {!loading && !error && fileDiffs.length === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
            }}>
              当前没有改动
            </div>
          )}

          {!loading && !error && fileDiffs.map((file, index) => (
            <div
              key={`${file.newFileName}-${index}`}
              ref={(el) => setFileRef(index, el)}
              style={{ marginBottom: 2 }}
            >
              <div style={{
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-secondary)',
                borderBottom: '1px solid var(--color-border-primary)',
                borderTop: index > 0 ? '1px solid var(--color-border-primary)' : undefined,
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}>
                {file.newFileName}
              </div>
              <DiffView
                data={{
                  newFile: {
                    fileName: file.newFileName,
                    fileLang: getFileExtension(file.newFileName),
                    content: '',
                  },
                  oldFile: {
                    fileName: file.oldFileName,
                    fileLang: getFileExtension(file.oldFileName),
                    content: '',
                  },
                  hunks: file.hunks,
                }}
                diffViewMode={DiffModeEnum.Unified}
                diffViewTheme={diffViewTheme}
                diffViewHighlight
                diffViewWrap
                diffViewFontSize={12}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Spinner animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GitDiffPanel;
