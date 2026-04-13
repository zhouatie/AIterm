import React, { useState, useCallback, useEffect, useRef } from 'react';
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

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ activeSessionId, visible = true }) => {
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const rootPathRef = useRef(rootPath);
  const snapshotRef = useRef<Record<string, FilePreviewSnapshot>>({});
  const fileLoadTokenRef = useRef(0);
  rootPathRef.current = rootPath;
  const prevVisibleRef = useRef(visible);

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

  // Sync root path with active terminal's cwd (on session switch) — only when visible
  useEffect(() => {
    if (!activeSessionId || !visible) return;
    let cancelled = false;

    window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
      if (!cancelled && result?.cwd && result.cwd !== rootPathRef.current) {
        restoreSnapshot(result.cwd);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, visible, restoreSnapshot]);

  // When becoming visible again, re-sync CWD immediately
  useEffect(() => {
    const wasHidden = !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && wasHidden && activeSessionId) {
      window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
        if (result?.cwd) {
          restoreSnapshot(result.cwd);
        }
      });
    }
  }, [visible, activeSessionId, restoreSnapshot]);

  // Listen for terminal CWD changes and auto-update file tree
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = window.terminalApi.onSessionInfoChanged((data) => {
      if (data.id === activeSessionId && data.cwd !== rootPathRef.current) {
        restoreSnapshot(data.cwd);
      }
    });
    return unsubscribe;
  }, [activeSessionId, visible, restoreSnapshot]);

  // Manual refresh: re-fetch terminal CWD and trigger file tree rescan
  const handleRefresh = useCallback(async () => {
    if (!activeSessionId) return;
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
  }, [activeSessionId, restoreSnapshot]);

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
    <div style={{ width: '100%', height: '100%' }}>
      <SplitLayout
        left={fileTreePane}
        right={previewPane}
        defaultLeftPercent={30}
        minLeftPx={150}
        minRightPx={200}
      />
    </div>
  );
};

export default FilePreviewPanel;
