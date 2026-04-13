import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';
import CodePreview from './CodePreview';
import SplitLayout from './SplitLayout';
import { isMarkdownFile } from '../utils/file-types';

interface FilePreviewPanelProps {
  activeSessionId: string | null;
  /** When false, skip CWD sync and file tree reads (panel is collapsed but stays mounted) */
  visible?: boolean;
}

interface FilePreviewSnapshot {
  selectedFile: string | null;
  fileContent: string | null;
  expandedPaths: string[];
}

const STORAGE_KEY_FILE_TREE_SPLIT_PX = 'filePreviewTreeSplitPx';
const STORAGE_KEY_FILE_TREE_VISIBLE = 'filePreviewTreeVisible';
const FILE_TREE_SIDEBAR_WIDTH = 220;
const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';

const treeToggleButtonBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  background: 'var(--color-bg-secondary)',
  borderRadius: 4,
  cursor: 'pointer',
  color: ICON_COLOR,
  padding: 0,
  boxShadow: '0 1px 4px var(--color-shadow)',
  transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
};

function readFileTreeVisible(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_FILE_TREE_VISIBLE);
  return stored !== null ? stored === 'true' : true;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ activeSessionId, visible = true }) => {
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [fileTreeVisible, setFileTreeVisible] = useState(readFileTreeVisible);
  const fileTreeActive = visible && fileTreeVisible;
  const rootPathRef = useRef(rootPath);
  const snapshotRef = useRef<Record<string, FilePreviewSnapshot>>({});
  const fileLoadTokenRef = useRef(0);
  rootPathRef.current = rootPath;
  const prevFileTreeActiveRef = useRef(fileTreeActive);

  const restoreSnapshot = useCallback((nextRootPath: string) => {
    fileLoadTokenRef.current += 1;
    const snapshot = snapshotRef.current[nextRootPath];
    setRootPath(nextRootPath);
    setSelectedFile(snapshot?.selectedFile ?? null);
    setFileContent(snapshot?.fileContent ?? null);
    setExpandedPaths(snapshot?.expandedPaths ?? []);
    setLoadingFile(false);
  }, []);

  useEffect(() => {
    if (!rootPath) return;
    snapshotRef.current[rootPath] = {
      selectedFile,
      fileContent,
      expandedPaths,
    };
  }, [rootPath, selectedFile, fileContent, expandedPaths]);

  // Sync root path with active terminal's cwd (on session switch) — only when the tree is active
  useEffect(() => {
    if (!activeSessionId || !fileTreeActive) return;
    let cancelled = false;

    window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
      if (!cancelled && result?.cwd && result.cwd !== rootPathRef.current) {
        restoreSnapshot(result.cwd);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  // When the file tree becomes active again, re-sync CWD immediately
  useEffect(() => {
    const wasInactive = !prevFileTreeActiveRef.current;
    prevFileTreeActiveRef.current = fileTreeActive;

    if (fileTreeActive && wasInactive && activeSessionId) {
      window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
        if (result?.cwd) {
          restoreSnapshot(result.cwd);
        }
      });
    }
  }, [fileTreeActive, activeSessionId, restoreSnapshot]);

  // Listen for terminal CWD changes and auto-update file tree
  useEffect(() => {
    if (!fileTreeActive) return;
    const unsubscribe = window.terminalApi.onSessionInfoChanged((data) => {
      if (data.id === activeSessionId && data.cwd !== rootPathRef.current) {
        restoreSnapshot(data.cwd);
      }
    });
    return unsubscribe;
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  // Manual refresh: re-fetch terminal CWD and trigger file tree rescan
  const handleRefresh = useCallback(async () => {
    if (!activeSessionId || !fileTreeActive) return;
    try {
      const result = await window.terminalApi.getSessionInfo(activeSessionId);
      if (result?.cwd) {
        if (result.cwd === rootPathRef.current) {
          // Same path — increment refreshKey to force rescan
          setRefreshKey((k) => k + 1);
        } else {
          restoreSnapshot(result.cwd);
        }
      }
    } catch {
      // Ignore refresh errors
    }
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  const toggleFileTreePane = useCallback(() => {
    setFileTreeVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_FILE_TREE_VISIBLE, String(next));
      return next;
    });
  }, []);

  const renderFileTreeToggleButton = useCallback((overlay: boolean) => (
    <button
      onClick={toggleFileTreePane}
      title={fileTreeVisible ? '收起文件树边栏' : '展开文件树边栏'}
      style={{
        ...treeToggleButtonBaseStyle,
        ...(overlay
          ? {
              position: 'absolute',
              top: 6,
              left: 8,
              zIndex: 20,
            }
          : {
              flexShrink: 0,
            }),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        e.currentTarget.style.color = ICON_COLOR_ACTIVE;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 6px var(--color-shadow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
        e.currentTarget.style.color = ICON_COLOR;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 4px var(--color-shadow)';
      }}
    >
      {fileTreeVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </button>
  ), [fileTreeVisible, toggleFileTreePane]);

  // Load file content when selection changes
  const handleSelectFile = useCallback(async (filePath: string) => {
    const loadToken = ++fileLoadTokenRef.current;
    setSelectedFile(filePath);
    setLoadingFile(true);
    try {
      const result = await window.fileApi.readFile(filePath);
      if (fileLoadTokenRef.current !== loadToken) return;
      if (result.error) {
        setFileContent(`Error: ${result.error}`);
      } else {
        setFileContent(result.content ?? null);
      }
    } catch (err) {
      if (fileLoadTokenRef.current !== loadToken) return;
      setFileContent(`Error: ${(err as Error).message}`);
    } finally {
      if (fileLoadTokenRef.current === loadToken) {
        setLoadingFile(false);
      }
    }
  }, []);

  const fileTreePane = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      {/* File tree (includes its own toolbar with refresh) */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rootPath ? (
          <FileTree
            rootPath={rootPath}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onRefresh={handleRefresh}
            refreshKey={refreshKey}
            expandedPaths={expandedPaths}
            onExpandedPathsChange={setExpandedPaths}
            leadingControl={renderFileTreeToggleButton(false)}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            Waiting for terminal...
          </div>
        )}
      </div>
    </div>
  );

  const previewPane = (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {loadingFile ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}
        >
          Loading...
        </div>
      ) : selectedFile && !isMarkdownFile(selectedFile) ? (
        <CodePreview content={fileContent} filePath={selectedFile} />
      ) : (
        <MarkdownPreview content={fileContent} filePath={selectedFile} />
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {visible && (!fileTreeVisible || !rootPath) && renderFileTreeToggleButton(true)}
      <SplitLayout
        left={fileTreePane}
        right={previewPane}
        defaultLeftPx={FILE_TREE_SIDEBAR_WIDTH}
        storageKey={STORAGE_KEY_FILE_TREE_SPLIT_PX}
        minLeftPx={150}
        minRightPx={200}
        shadow
        leftCollapsed={!fileTreeVisible}
      />
    </div>
  );
};

export default FilePreviewPanel;
