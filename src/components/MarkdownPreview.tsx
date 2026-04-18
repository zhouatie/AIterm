import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  collectPreviewFindMatches,
  applyPreviewFindHighlights,
  clearPreviewFindHighlights,
  scrollPreviewFindMatchIntoView,
} from '../utils/preview-find';

interface MarkdownPreviewProps {
  content: string | null;
  filePath: string | null;
  onTaskCheckboxToggle?: (taskIndex: number) => void;
  taskCheckboxDisabled?: boolean;
  searchQuery?: string;
  currentSearchIndex?: number;
  onSearchMatchCountChange?: (count: number) => void;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  filePath,
  onTaskCheckboxToggle,
  taskCheckboxDisabled = false,
  searchQuery = '',
  currentSearchIndex = 0,
  onSearchMatchCountChange,
}) => {
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
          color: 'var(--color-text-muted)',
          fontSize: 14,
          userSelect: 'none',
        }}
      >
        选择一个文件以预览
      </div>
    );
  }

  let taskCheckboxIndex = 0;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '16px 24px',
      }}
    >
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            input: ({ type, checked, disabled, ...props }) => {
              if (type !== 'checkbox') {
                return <input type={type} checked={checked} disabled={disabled} {...props} />;
              }

              const taskIndex = taskCheckboxIndex;
              taskCheckboxIndex += 1;

              return (
                <input
                  {...props}
                  type="checkbox"
                  checked={checked}
                  disabled={taskCheckboxDisabled}
                  onChange={(event) => {
                    event.preventDefault();
                    if (!taskCheckboxDisabled) {
                      onTaskCheckboxToggle?.(taskIndex);
                    }
                  }}
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownPreview;
