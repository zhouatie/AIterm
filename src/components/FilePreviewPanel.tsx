import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';
import SplitLayout from './SplitLayout';

interface FilePreviewPanelProps {
  activeSessionId: string | null;
}

const CWD_POLL_INTERVAL = 2000; // ms

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ activeSessionId }) => {
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;

  // Sync root path with active terminal's cwd (on session switch)
  useEffect(() => {
    if (!activeSessionId) return;
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
  }, [activeSessionId]);

  // Poll for cwd changes (picks up `cd` in the terminal)
  useEffect(() => {
    if (!activeSessionId) return;

    const interval = setInterval(async () => {
      try {
        const result = await window.terminalApi.getCwd(activeSessionId);
        if (result.cwd && result.cwd !== rootPathRef.current) {
          setRootPath(result.cwd);
          setSelectedFile(null);
          setFileContent(null);
        }
      } catch {
        // Ignore polling errors
      }
    }, CWD_POLL_INTERVAL);

    return () => clearInterval(interval);
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

  // Truncate displayed path for the header
  const displayPath = rootPath
    ? rootPath.replace(/^\/Users\/[^/]+/, '~')
    : '';

  const fileTreePane = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        // Leave room for macOS traffic lights (hiddenInset title bar)
        paddingTop: 38,
      }}
    >
      {/* File tree (includes its own toolbar) */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rootPath ? (
          <FileTree
            rootPath={rootPath}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 13,
              color: '#999',
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
            color: '#999',
            fontSize: 13,
          }}
        >
          Loading...
        </div>
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
