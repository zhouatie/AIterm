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

const MD_ONLY_KEY = 'file-tree-md-only';

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ activeSessionId, visible = true }) => {
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [mdOnly, setMdOnly] = useState<boolean>(() => {
    const stored = localStorage.getItem(MD_ONLY_KEY);
    return stored === null ? true : stored === 'true';
  });
  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;
  const prevVisibleRef = useRef(visible);

  // Sync root path with active terminal's cwd (on session switch) — only when visible
  useEffect(() => {
    if (!activeSessionId || !visible) return;
    let cancelled = false;

    window.terminalApi.getCwd(activeSessionId).then((result) => {
      if (!cancelled && result.cwd && result.cwd !== rootPathRef.current) {
        setRootPath(result.cwd);
        setSelectedFile(null);
        setFileContent(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, visible]);

  // When becoming visible again, re-sync CWD immediately
  useEffect(() => {
    const wasHidden = !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && wasHidden && activeSessionId) {
      window.terminalApi.getCwd(activeSessionId).then((result) => {
        if (result.cwd) {
          setRootPath(result.cwd);
          setSelectedFile(null);
          setFileContent(null);
        }
      });
    }
  }, [visible, activeSessionId]);

  // Listen for terminal CWD changes and auto-update file tree
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = window.terminalApi.onCwdChanged((data) => {
      if (data.id === activeSessionId && data.cwd !== rootPathRef.current) {
        setRootPath(data.cwd);
        setSelectedFile(null);
        setFileContent(null);
      }
    });
    return unsubscribe;
  }, [activeSessionId, visible]);

  // Toggle mdOnly filter with localStorage persistence
  const handleToggleMdOnly = useCallback(() => {
    setMdOnly((prev) => {
      const next = !prev;
      localStorage.setItem(MD_ONLY_KEY, String(next));
      return next;
    });
  }, []);

  // Manual refresh: re-fetch terminal CWD and update rootPath
  const handleRefresh = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const result = await window.terminalApi.getCwd(activeSessionId);
      if (result.cwd) {
        // Always update rootPath to trigger file tree reload
        // (set to empty first to force re-render even if same path)
        if (result.cwd === rootPathRef.current) {
          setRootPath('');
          const cwd = result.cwd;
          queueMicrotask(() => setRootPath(cwd));
        } else {
          setRootPath(result.cwd);
          setSelectedFile(null);
          setFileContent(null);
        }
      }
    } catch {
      // Ignore refresh errors
    }
  }, [activeSessionId]);

  // Load file content when selection changes
  const handleSelectFile = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingFile(true);
    try {
      const result = await window.fileApi.readFile(filePath);
      if (result.error) {
        setFileContent(`Error: ${result.error}`);
      } else {
        setFileContent(result.content ?? null);
      }
    } catch (err) {
      setFileContent(`Error: ${(err as Error).message}`);
    } finally {
      setLoadingFile(false);
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
            mdOnly={mdOnly}
            onToggleMdOnly={handleToggleMdOnly}
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
