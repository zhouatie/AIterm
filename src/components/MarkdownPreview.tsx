import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ListTree } from 'lucide-react';
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

interface MarkdownHeadingEntry {
  id: string;
  index: number;
  level: number;
  text: string;
}

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

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
  const headingElementsRef = useRef<Map<string, HTMLHeadingElement>>(new Map());
  const [headings, setHeadings] = useState<MarkdownHeadingEntry[]>([]);
  const [outlineExpanded, setOutlineExpanded] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !content || !filePath) {
      headingElementsRef.current.clear();
      setHeadings([]);
      setOutlineExpanded(false);
      return;
    }

    const markdownRoot = container.querySelector<HTMLElement>('.markdown-body');
    if (!markdownRoot) {
      headingElementsRef.current.clear();
      setHeadings([]);
      setOutlineExpanded(false);
      return;
    }

    const nextHeadingElements = Array.from(
      markdownRoot.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR),
    );
    const nextHeadingMap = new Map<string, HTMLHeadingElement>();
    const nextHeadings = nextHeadingElements.reduce<MarkdownHeadingEntry[]>(
      (items, element, index) => {
        const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        if (!text) return items;

        const level = Number(element.tagName.slice(1));
        const id = `markdown-heading-${index}`;
        element.dataset.previewHeadingId = id;
        nextHeadingMap.set(id, element);
        items.push({ id, index, level, text });
        return items;
      },
      [],
    );

    headingElementsRef.current = nextHeadingMap;
    setHeadings(nextHeadings);
    setOutlineExpanded(false);
  }, [content, filePath]);

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

  const scrollToHeading = useCallback((headingId: string) => {
    const container = containerRef.current;
    const headingElement = headingElementsRef.current.get(headingId);
    if (!container || !headingElement) return;

    const headingRect = headingElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextScrollTop = container.scrollTop + (headingRect.top - containerRect.top) - 12;
    container.scrollTo({
      top: Math.max(nextScrollTop, 0),
      behavior: 'smooth',
    });
  }, []);

  const handleOutlineBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const nextFocusTarget = event.relatedTarget;
    if (nextFocusTarget instanceof Node && event.currentTarget.contains(nextFocusTarget)) {
      return;
    }
    setOutlineExpanded(false);
  }, []);

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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {headings.length > 0 && (
        <nav
          className="markdown-heading-outline"
          aria-label="Markdown 标题导航"
          tabIndex={0}
          onMouseEnter={() => setOutlineExpanded(true)}
          onMouseLeave={() => setOutlineExpanded(false)}
          onFocus={() => setOutlineExpanded(true)}
          onBlur={handleOutlineBlur}
          style={{
            width: outlineExpanded ? 260 : 30,
          }}
        >
          <div className="markdown-heading-outline-rail" aria-hidden="true">
            <ListTree size={14} />
          </div>
          <div
            className="markdown-heading-outline-panel"
            style={{
              opacity: outlineExpanded ? 1 : 0,
              transform: outlineExpanded ? 'translateX(0)' : 'translateX(-8px)',
              pointerEvents: outlineExpanded ? 'auto' : 'none',
            }}
          >
            {headings.map((heading) => (
              <button
                key={heading.id}
                type="button"
                className="markdown-heading-outline-item"
                title={heading.text}
                aria-label={`跳转到第 ${heading.index + 1} 个标题：${heading.text}`}
                tabIndex={outlineExpanded ? 0 : -1}
                style={{
                  paddingLeft: 10 + ((heading.level - 1) * 12),
                }}
                onClick={() => scrollToHeading(heading.id)}
              >
                <span className="markdown-heading-outline-level">H{heading.level}</span>
                <span className="markdown-heading-outline-text">{heading.text}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
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
    </div>
  );
};

export default MarkdownPreview;
