import React, { useEffect, useMemo, useRef } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getLanguageByExtension } from '../utils/file-types';
import {
  collectPreviewFindMatches,
  applyPreviewFindHighlights,
  clearPreviewFindHighlights,
  scrollPreviewFindMatchIntoView,
} from '../utils/preview-find';

interface CodePreviewProps {
  content: string | null;
  filePath: string | null;
  searchQuery?: string;
  currentSearchIndex?: number;
  onSearchMatchCountChange?: (count: number) => void;
}

const CodePreview: React.FC<CodePreviewProps> = ({
  content,
  filePath,
  searchQuery = '',
  currentSearchIndex = 0,
  onSearchMatchCountChange,
}) => {
  const language = useMemo(
    () => (filePath ? getLanguageByExtension(filePath) : null),
    [filePath],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const matches = collectPreviewFindMatches({
      root: container,
      query: searchQuery,
    });
    applyPreviewFindHighlights({
      matches,
      currentIndex: currentSearchIndex,
    });
    onSearchMatchCountChange?.(matches.length);

    const activeMatch = matches[currentSearchIndex] ?? matches[0];
    scrollPreviewFindMatchIntoView(container, activeMatch);

    return () => {
      clearPreviewFindHighlights();
    };
  }, [content, currentSearchIndex, onSearchMatchCountChange, searchQuery]);

  if (!content || !filePath) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: 14,
          userSelect: 'none',
        }}
      >
        选择一个文件以预览
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <SyntaxHighlighter
        language={language ?? undefined}
        useInlineStyles={false}
        showLineNumbers
        lineNumberStyle={{
          color: '#999',
          userSelect: 'none',
          minWidth: '3em',
          textAlign: 'right',
          paddingRight: '1em',
          borderRight: '1px solid #e1e4e8',
          marginRight: '1em',
        }}
        customStyle={{
          margin: 0,
          padding: '16px 0',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.5',
          fontFamily:
            "'JetBrainsMono Nerd Font', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        }}
        codeTagProps={{
          style: {
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodePreview;
