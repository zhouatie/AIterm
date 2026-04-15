import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';
import CodePreview from './CodePreview';
import SplitLayout from './SplitLayout';
import { isMarkdownFile } from '../utils/file-types';
import { toggleMarkdownTaskMarker } from '../utils/markdown-task';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import { useKeyboardShortcuts } from '../ShortcutContext';

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
  const { bindings, registerAction } = useKeyboardShortcuts();
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writingTask, setWritingTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [fileTreeVisible, setFileTreeVisible] = useState(readFileTreeVisible);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const fileTreeActive = visible && fileTreeVisible;
  const rootPathRef = useRef(rootPath);
  const snapshotRef = useRef<Record<string, FilePreviewSnapshot>>({});
  const fileLoadTokenRef = useRef(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  rootPathRef.current = rootPath;
  const prevFileTreeActiveRef = useRef(fileTreeActive);

  const resetFindState = useCallback(() => {
    setIsFindOpen(false);
    setFindQuery('');
    setCurrentSearchIndex(0);
    setSearchMatchCount(0);
  }, []);

  const openFind = useCallback(() => {
    if (!selectedFile || fileContent === null) return;
    setIsFindOpen(true);
    setCurrentSearchIndex(0);
  }, [fileContent, selectedFile]);

  const findActionTitle = getIconButtonTooltip({
    label: '查找',
    bindings,
    actionId: 'find-in-file-preview',
  });

  const restoreSnapshot = useCallback((nextRootPath: string) => {
    fileLoadTokenRef.current += 1;
    const snapshot = snapshotRef.current[nextRootPath];
    setRootPath(nextRootPath);
    setSelectedFile(snapshot?.selectedFile ?? null);
    setFileContent(snapshot?.fileContent ?? null);
    setWriteError(null);
    setWritingTask(false);
    setExpandedPaths(snapshot?.expandedPaths ?? []);
    setLoadingFile(false);
    resetFindState();
  }, [resetFindState]);

  useEffect(() => {
    if (!rootPath) return;
    snapshotRef.current[rootPath] = {
      selectedFile,
      fileContent,
      expandedPaths,
    };
  }, [rootPath, selectedFile, fileContent, expandedPaths]);

  useEffect(() => {
    return registerAction('find-in-file-preview', () => {
      openFind();
    });
  }, [openFind, registerAction]);

  useEffect(() => {
    if (!isFindOpen) return;
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, [isFindOpen]);

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
    setWriteError(null);
    setWritingTask(false);
    resetFindState();
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
  }, [resetFindState]);

  const handleTaskCheckboxToggle = useCallback(async (taskIndex: number) => {
    if (!selectedFile || fileContent === null || writingTask) return;

    const result = toggleMarkdownTaskMarker(fileContent, taskIndex);
    if (!result.content) {
      setWriteError(result.error ?? '无法定位对应的任务项。');
      return;
    }

    setWritingTask(true);
    setWriteError(null);
    try {
      const writeResult = await window.fileApi.writeFile(selectedFile, result.content);
      if (writeResult.error) {
        setWriteError(writeResult.error);
        return;
      }
      setFileContent(result.content);
    } catch (err) {
      setWriteError((err as Error).message);
    } finally {
      setWritingTask(false);
    }
  }, [fileContent, selectedFile, writingTask]);

  const handleSearchMatchCountChange = useCallback((count: number) => {
    setSearchMatchCount(count);
    setCurrentSearchIndex((prev) => {
      if (count === 0) return 0;
      return Math.min(prev, count - 1);
    });
  }, []);

  const handleSelectPreviousMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentSearchIndex((prev) => (prev - 1 + searchMatchCount) % searchMatchCount);
  }, [searchMatchCount]);

  const handleSelectNextMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentSearchIndex((prev) => (prev + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const findBar = isFindOpen ? (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 14,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid var(--color-border-primary)',
        background: 'var(--color-surface-content-elevated)',
        boxShadow: '0 14px 28px var(--color-shadow)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
        }}
      >
        <Search size={14} />
      </div>
      <input
        ref={findInputRef}
        value={findQuery}
        onChange={(event) => {
          setFindQuery(event.target.value);
          setCurrentSearchIndex(0);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            resetFindState();
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) {
              handleSelectPreviousMatch();
            } else {
              handleSelectNextMatch();
            }
          }
        }}
        placeholder="查找当前文件"
        spellCheck={false}
        style={{
          width: 220,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          fontSize: 13,
        }}
      />
      <div
        style={{
          minWidth: 52,
          textAlign: 'right',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {searchMatchCount === 0 ? '0' : `${currentSearchIndex + 1}/${searchMatchCount}`}
      </div>
      <button
        type="button"
        onClick={handleSelectPreviousMatch}
        disabled={searchMatchCount === 0}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
          opacity: searchMatchCount === 0 ? 0.4 : 1,
        }}
        title="上一个匹配"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={handleSelectNextMatch}
        disabled={searchMatchCount === 0}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
          opacity: searchMatchCount === 0 ? 0.4 : 1,
        }}
        title="下一个匹配"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={resetFindState}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
        }}
        title="关闭查找"
      >
        <X size={14} />
      </button>
    </div>
  ) : null;

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
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {selectedFile && !loadingFile && findBar}
      {!isFindOpen && selectedFile && !loadingFile && (
        <button
          type="button"
          onClick={openFind}
          title={findActionTitle}
          style={{
            ...treeToggleButtonBaseStyle,
            position: 'absolute',
            top: 10,
            right: 14,
            zIndex: 15,
            background: 'var(--color-surface-content-elevated)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Search size={14} />
        </button>
      )}
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
        <CodePreview
          content={fileContent}
          filePath={selectedFile}
          searchQuery={findQuery}
          currentSearchIndex={currentSearchIndex}
          onSearchMatchCountChange={handleSearchMatchCountChange}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {writeError && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                zIndex: 10,
                maxWidth: '70%',
                padding: '6px 10px',
                borderRadius: 6,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 2px 8px var(--color-shadow)',
                fontSize: 12,
              }}
            >
              写入失败：{writeError}
            </div>
          )}
          <MarkdownPreview
            content={fileContent}
            filePath={selectedFile}
            onTaskCheckboxToggle={handleTaskCheckboxToggle}
            taskCheckboxDisabled={writingTask}
            searchQuery={findQuery}
            currentSearchIndex={currentSearchIndex}
            onSearchMatchCountChange={handleSearchMatchCountChange}
          />
        </div>
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
