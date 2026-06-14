import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ListTree, MessageSquare, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  collectPreviewFindMatches,
  applyPreviewFindHighlights,
  clearPreviewFindHighlights,
  scrollPreviewFindMatchIntoView,
} from '../utils/preview-find';
import {
  createMarkdownCommentAnchorFromSelection,
  getMarkdownCommentGutterMarkerPosition,
  getMarkdownCommentSelectionToolbarPosition,
  resolveMarkdownCommentRange,
} from '../utils/markdown-comment-anchors';
import type {
  MarkdownCommentAnchor,
  MarkdownCommentLocationStatus,
  MarkdownPreviewComment,
} from '../utils/markdown-comment-types';

interface MarkdownPreviewProps {
  content: string | null;
  filePath: string | null;
  onTaskCheckboxToggle?: (taskIndex: number) => void;
  taskCheckboxDisabled?: boolean;
  searchQuery?: string;
  currentSearchIndex?: number;
  onSearchMatchCountChange?: (count: number) => void;
  comments?: MarkdownPreviewComment[];
  activeCommentId?: string | null;
  activeCommentNavigationVersion?: number;
  commentGutterHidden?: boolean;
  onCommentAnchorCreate?: (anchor: MarkdownCommentAnchor) => void;
  onCommentSelect?: (commentId: string) => void;
  onCommentLocationChange?: (statuses: MarkdownCommentLocationStatus[]) => void;
}

interface MarkdownHeadingEntry {
  id: string;
  index: number;
  level: number;
  text: string;
}

interface MarkdownCommentMarker {
  commentId: string;
  top: number;
  left: number;
  active: boolean;
}

interface SelectionCommentAction {
  anchor: MarkdownCommentAnchor;
  top: number;
  left: number;
  placement: 'above' | 'below';
}

interface CSSHighlightsRegistry {
  set(name: string, highlight: object): void;
  delete(name: string): void;
}

interface HighlightConstructor {
  new (...ranges: Range[]): object;
}

type HighlightWindow = Window & {
  Highlight: HighlightConstructor;
};

type HighlightCSS = typeof CSS & {
  highlights: CSSHighlightsRegistry;
};

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const MARKDOWN_COMMENT_GUTTER_MIN_WIDTH = 420;
const MARKDOWN_COMMENT_HIGHLIGHT_NAME = 'markdown-comment-highlight';
const MARKDOWN_COMMENT_CURRENT_NAME = 'markdown-comment-current';
const CODE_COPY_FEEDBACK_MS = 1400;

interface MarkdownCodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
}

function getHighlightConstructor(): HighlightConstructor {
  return (window as HighlightWindow).Highlight;
}

function getHighlightRegistry(): CSSHighlightsRegistry {
  return (CSS as HighlightCSS).highlights;
}

function clearMarkdownCommentHighlights() {
  const registry = getHighlightRegistry();
  registry.delete(MARKDOWN_COMMENT_HIGHLIGHT_NAME);
  registry.delete(MARKDOWN_COMMENT_CURRENT_NAME);
}

function applyMarkdownCommentHighlights(ranges: Range[], currentRange: Range | null) {
  clearMarkdownCommentHighlights();
  if (ranges.length === 0 && !currentRange) return;

  const Highlight = getHighlightConstructor();
  const registry = getHighlightRegistry();
  if (ranges.length > 0) {
    registry.set(MARKDOWN_COMMENT_HIGHLIGHT_NAME, new Highlight(...ranges));
  }
  if (currentRange) {
    registry.set(MARKDOWN_COMMENT_CURRENT_NAME, new Highlight(currentRange));
  }
}

function scrollCommentRangeIntoView(container: HTMLElement, range: Range) {
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  const rect = rects[0] ?? range.getBoundingClientRect();
  if (rect.height <= 0 && rect.width <= 0) return;

  const containerRect = container.getBoundingClientRect();
  const nextScrollTop = container.scrollTop + (rect.top - containerRect.top) - 48;
  container.scrollTo({
    top: Math.max(nextScrollTop, 0),
    behavior: 'smooth',
  });
}

function getTextFromReactNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextFromReactNode).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children);
  }
  return '';
}

const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({ children, ...preProps }) => {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimerRef = useRef<number | null>(null);
  const codeText = useMemo(() => getTextFromReactNode(children), [children]);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const resetCopyStateSoon = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      setCopyState('idle');
    }, CODE_COPY_FEEDBACK_MS);
  }, []);

  const handleCopy = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!codeText) return;

    try {
      await navigator.clipboard.writeText(codeText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    resetCopyStateSoon();
  }, [codeText, resetCopyStateSoon]);

  const copyLabel = copyState === 'copied'
    ? '已复制代码块'
    : copyState === 'failed'
      ? '复制代码块失败'
      : '复制代码块';

  return (
    <div className="markdown-code-block">
      <pre {...preProps}>{children}</pre>
      <button
        type="button"
        className={
          'markdown-code-copy-button'
          + (copyState === 'copied' ? ' copied' : '')
          + (copyState === 'failed' ? ' failed' : '')
        }
        aria-label={copyLabel}
        title={copyLabel}
        disabled={!codeText}
        onClick={handleCopy}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  filePath,
  onTaskCheckboxToggle,
  taskCheckboxDisabled = false,
  searchQuery = '',
  currentSearchIndex = 0,
  onSearchMatchCountChange,
  comments = [],
  activeCommentId = null,
  activeCommentNavigationVersion = 0,
  commentGutterHidden = false,
  onCommentAnchorCreate,
  onCommentSelect,
  onCommentLocationChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingElementsRef = useRef<Map<string, HTMLHeadingElement>>(new Map());
  const scrollFrameRef = useRef<number | null>(null);
  const lastCommentNavigationKeyRef = useRef<string | null>(null);
  const [headings, setHeadings] = useState<MarkdownHeadingEntry[]>([]);
  const [outlineExpanded, setOutlineExpanded] = useState(false);
  const [commentMarkers, setCommentMarkers] = useState<MarkdownCommentMarker[]>([]);
  const [selectionCommentAction, setSelectionCommentAction] = useState<SelectionCommentAction | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [commentLayoutVersion, setCommentLayoutVersion] = useState(0);
  const commentGutterAvailable = !commentGutterHidden && previewWidth >= MARKDOWN_COMMENT_GUTTER_MIN_WIDTH;

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
        const text = element.textContent?.replace(/s+/g, ' ').trim() ?? '';
        if (!text) return items;

        const level = Number(element.tagName.slice(1));
        const id = 'markdown-heading-' + index;
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

  useLayoutEffect(() => {
    const container = containerRef.current;
    const markdownRoot = container?.querySelector<HTMLElement>('.markdown-body');
    if (!container || !markdownRoot || !content || !filePath || comments.length === 0) {
      clearMarkdownCommentHighlights();
      setCommentMarkers([]);
      onCommentLocationChange?.(comments.map((comment) => ({ commentId: comment.id, located: false })));
      return;
    }

    const ranges: Range[] = [];
    let currentRange: Range | null = null;
    const markers: MarkdownCommentMarker[] = [];
    const statuses: MarkdownCommentLocationStatus[] = [];

    for (const comment of comments) {
      const resolved = resolveMarkdownCommentRange(markdownRoot, comment);
      statuses.push({ commentId: comment.id, located: resolved.located });
      if (!resolved.range) continue;

      ranges.push(resolved.range);
      if (comment.id === activeCommentId) currentRange = resolved.range;
      const markerPosition = commentGutterAvailable
        ? getMarkdownCommentGutterMarkerPosition(container, resolved.range)
        : null;
      if (markerPosition) {
        markers.push({
          commentId: comment.id,
          top: markerPosition.top,
          left: markerPosition.left,
          active: comment.id === activeCommentId,
        });
      }
    }

    applyMarkdownCommentHighlights(ranges, currentRange);
    setCommentMarkers(markers);
    onCommentLocationChange?.(statuses);

    if (activeCommentId && currentRange) {
      const navigationKey = activeCommentId + ':' + activeCommentNavigationVersion;
      if (lastCommentNavigationKeyRef.current !== navigationKey) {
        lastCommentNavigationKeyRef.current = navigationKey;
        scrollCommentRangeIntoView(container, currentRange);
      }
    }

    return () => {
      clearMarkdownCommentHighlights();
    };
  }, [
    activeCommentId,
    activeCommentNavigationVersion,
    commentGutterAvailable,
    commentLayoutVersion,
    comments,
    content,
    filePath,
    onCommentLocationChange,
  ]);

  useEffect(() => {
    const handleResize = () => setCommentLayoutVersion((version) => version + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updatePreviewSize = () => {
      setPreviewWidth(container.clientWidth);
      setCommentLayoutVersion((version) => version + 1);
    };

    updatePreviewSize();
    if (typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [content, filePath]);

  const updateSelectionCommentAction = useCallback(() => {
    const container = containerRef.current;
    const markdownRoot = container?.querySelector<HTMLElement>('.markdown-body');
    if (!container || !markdownRoot || !onCommentAnchorCreate) {
      setSelectionCommentAction(null);
      return;
    }

    const selection = window.getSelection();
    const anchor = createMarkdownCommentAnchorFromSelection(markdownRoot, selection);
    if (!anchor || !selection || selection.rangeCount === 0) {
      setSelectionCommentAction(null);
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const toolbarPosition = getMarkdownCommentSelectionToolbarPosition(container, range);
    if (!toolbarPosition) {
      setSelectionCommentAction(null);
      return;
    }

    setSelectionCommentAction({
      anchor,
      top: toolbarPosition.top,
      left: toolbarPosition.left,
      placement: toolbarPosition.placement,
    });
  }, [onCommentAnchorCreate]);

  const handleCreateCommentFromSelection = useCallback(() => {
    if (!selectionCommentAction) return;
    onCommentAnchorCreate?.(selectionCommentAction.anchor);
    setSelectionCommentAction(null);
    window.getSelection()?.removeAllRanges();
  }, [onCommentAnchorCreate, selectionCommentAction]);

  const handlePreviewScroll = useCallback(() => {
    setSelectionCommentAction(null);
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      setCommentLayoutVersion((version) => version + 1);
    });
  }, []);

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
  const outlineClassName = 'markdown-heading-outline' + (outlineExpanded ? ' is-expanded' : '');

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {headings.length > 0 && (
        <nav
          className={outlineClassName}
          aria-label="Markdown 标题导航"
          aria-expanded={outlineExpanded}
          tabIndex={0}
          onMouseEnter={() => setOutlineExpanded(true)}
          onMouseLeave={() => setOutlineExpanded(false)}
          onFocus={() => setOutlineExpanded(true)}
          onBlur={handleOutlineBlur}
        >
          <div className="markdown-heading-outline-rail" aria-hidden="true">
            <ListTree size={14} />
          </div>
          <div className="markdown-heading-outline-panel">
            {headings.map((heading) => (
              <button
                key={heading.id}
                type="button"
                className="markdown-heading-outline-item"
                title={heading.text}
                aria-label={'跳转到第 ' + (heading.index + 1) + ' 个标题：' + heading.text}
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
        className={'markdown-preview-scroll' + (commentGutterAvailable ? '' : ' comment-gutter-hidden')}
        onMouseUp={() => window.setTimeout(updateSelectionCommentAction, 0)}
        onKeyUp={updateSelectionCommentAction}
        onScroll={handlePreviewScroll}
      >
        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children, node, ...props }) => {
                void node;
                return <MarkdownCodeBlock {...props}>{children}</MarkdownCodeBlock>;
              },
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
        {commentMarkers.map((marker) => (
          <button
            key={marker.commentId}
            type="button"
            className={'markdown-comment-marker' + (marker.active ? ' active' : '')}
            aria-label="查看评论"
            title="查看评论"
            style={{ top: marker.top, left: marker.left }}
            onClick={(event) => {
              event.stopPropagation();
              setSelectionCommentAction(null);
              onCommentSelect?.(marker.commentId);
            }}
          >
            <MessageSquare size={13} />
          </button>
        ))}
        {selectionCommentAction && (
          <div
            className={'markdown-comment-selection-toolbar ' + selectionCommentAction.placement}
            style={{ top: selectionCommentAction.top, left: selectionCommentAction.left }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="markdown-comment-selection-button"
              aria-label="添加评论"
              title="添加评论"
              onClick={handleCreateCommentFromSelection}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownPreview;
