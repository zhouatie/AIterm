import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Maximize2, X } from 'lucide-react';

interface MermaidDiagramViewerProps {
  svg: string;
  source?: string;
  label?: string;
  className?: string;
}

type MermaidFullscreenMode = 'diagram' | 'source';
type MermaidCopyState = 'idle' | 'copied' | 'failed';

interface MermaidDiagramSize {
  width: number;
  height: number;
}

interface MermaidDiagramBounds extends MermaidDiagramSize {
  x: number;
  y: number;
}

interface MermaidNormalizedSvg {
  size: MermaidDiagramSize;
  markup?: string;
}

const MERMAID_VIEWER_MIN_ZOOM = 0.25;
const MERMAID_VIEWER_MAX_ZOOM = 4;
const MERMAID_VIEWER_ZOOM_STEP = 0.12;
const MERMAID_VIEWER_BOUNDS_MIN_PADDING = 8;
const MERMAID_VIEWER_BOUNDS_MAX_PADDING = 32;
const MERMAID_VIEWER_BOUNDS_IGNORED_TAGS = new Set([
  'clippath',
  'defs',
  'desc',
  'lineargradient',
  'marker',
  'mask',
  'metadata',
  'pattern',
  'radialgradient',
  'script',
  'style',
  'symbol',
  'title',
]);

function clampZoom(value: number): number {
  return Math.min(Math.max(value, MERMAID_VIEWER_MIN_ZOOM), MERMAID_VIEWER_MAX_ZOOM);
}

function getNextZoom(currentZoom: number, deltaY: number): number {
  const direction = deltaY < 0 ? 1 : -1;
  return Math.round(clampZoom(currentZoom + (direction * MERMAID_VIEWER_ZOOM_STEP)) * 100) / 100;
}

function getSvgSize(svgElement: SVGSVGElement | null): MermaidDiagramSize | null {
  if (!svgElement) return null;

  const viewBox = svgElement.viewBox.baseVal;
  if (viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const width = svgElement.width.baseVal.value;
  const height = svgElement.height.baseVal.value;
  if (width > 0 && height > 0) {
    return { width, height };
  }

  try {
    const bbox = svgElement.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return { width: bbox.width, height: bbox.height };
    }
  } catch {
    return null;
  }

  return null;
}

function getSvgVisibleBounds(svgElement: SVGSVGElement | null): MermaidDiagramBounds | null {
  if (!svgElement) return null;

  const viewBox = svgElement.viewBox.baseVal;
  const svgRect = svgElement.getBoundingClientRect();
  if (viewBox.width <= 0 || viewBox.height <= 0 || svgRect.width <= 0 || svgRect.height <= 0) {
    return null;
  }

  let visibleLeft = Number.POSITIVE_INFINITY;
  let visibleTop = Number.POSITIVE_INFINITY;
  let visibleRight = Number.NEGATIVE_INFINITY;
  let visibleBottom = Number.NEGATIVE_INFINITY;

  Array.from(svgElement.querySelectorAll('*')).forEach((element) => {
    if (MERMAID_VIEWER_BOUNDS_IGNORED_TAGS.has(element.tagName.toLowerCase())) return;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    visibleLeft = Math.min(visibleLeft, rect.left);
    visibleTop = Math.min(visibleTop, rect.top);
    visibleRight = Math.max(visibleRight, rect.right);
    visibleBottom = Math.max(visibleBottom, rect.bottom);
  });

  if (!Number.isFinite(visibleLeft) || !Number.isFinite(visibleTop) || visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
    return null;
  }

  const scale = Math.min(svgRect.width / viewBox.width, svgRect.height / viewBox.height);
  if (scale <= 0) return null;

  const viewBoxRenderedWidth = viewBox.width * scale;
  const viewBoxRenderedHeight = viewBox.height * scale;
  const viewBoxRenderedLeft = svgRect.left + ((svgRect.width - viewBoxRenderedWidth) / 2);
  const viewBoxRenderedTop = svgRect.top + ((svgRect.height - viewBoxRenderedHeight) / 2);
  const x = viewBox.x + ((visibleLeft - viewBoxRenderedLeft) / scale);
  const y = viewBox.y + ((visibleTop - viewBoxRenderedTop) / scale);
  const width = (visibleRight - visibleLeft) / scale;
  const height = (visibleBottom - visibleTop) / scale;

  if (width <= 0 || height <= 0) return null;

  const padding = Math.min(
    Math.max(Math.max(width, height) * 0.02, MERMAID_VIEWER_BOUNDS_MIN_PADDING),
    MERMAID_VIEWER_BOUNDS_MAX_PADDING,
  );

  return {
    x: x - padding,
    y: y - padding,
    width: width + (padding * 2),
    height: height + (padding * 2),
  };
}

function normalizeFullscreenSvg(svgElement: SVGSVGElement | null): MermaidNormalizedSvg | null {
  const visibleBounds = getSvgVisibleBounds(svgElement);
  if (!svgElement || !visibleBounds) {
    const fallbackSize = getSvgSize(svgElement);
    return fallbackSize ? { size: fallbackSize } : null;
  }

  const normalizedSvgElement = svgElement.cloneNode(true) as SVGSVGElement;
  normalizedSvgElement.setAttribute(
    'viewBox',
    `${visibleBounds.x} ${visibleBounds.y} ${visibleBounds.width} ${visibleBounds.height}`,
  );
  normalizedSvgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  return {
    size: {
      width: visibleBounds.width,
      height: visibleBounds.height,
    },
    markup: normalizedSvgElement.outerHTML,
  };
}

function getCanvasSize(canvasElement: HTMLDivElement | null): MermaidDiagramSize | null {
  if (!canvasElement) return null;

  const rect = canvasElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const style = window.getComputedStyle(canvasElement);
  const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

  return {
    width: Math.max(rect.width - horizontalPadding, 1),
    height: Math.max(rect.height - verticalPadding, 1),
  };
}

function getFitZoom(canvasElement: HTMLDivElement | null, svgSize: MermaidDiagramSize | null): number {
  const canvasSize = getCanvasSize(canvasElement);
  if (!canvasSize || !svgSize) return 1;

  return Math.round(clampZoom(Math.min(
    canvasSize.width / svgSize.width,
    canvasSize.height / svgSize.height,
  )) * 100) / 100;
}

const MermaidDiagramViewer: React.FC<MermaidDiagramViewerProps> = ({
  svg,
  source = '',
  label = 'Mermaid 图表',
  className,
}) => {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<MermaidFullscreenMode>('diagram');
  const [zoom, setZoom] = useState(1);
  const [diagramSize, setDiagramSize] = useState<MermaidDiagramSize | null>(null);
  const [copyState, setCopyState] = useState<MermaidCopyState>('idle');
  const [fullscreenSvgMarkup, setFullscreenSvgMarkup] = useState(svg);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const previousSvgRef = useRef(svg);
  const userZoomedRef = useRef(false);
  const hasSource = source.trim().length > 0;

  const clearCopyFeedbackTimer = useCallback(() => {
    if (copyFeedbackTimerRef.current === null) return;

    window.clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = null;
  }, []);

  const showCopyFeedback = useCallback((nextState: MermaidCopyState) => {
    clearCopyFeedbackTimer();
    setCopyState(nextState);

    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyFeedbackTimerRef.current = null;
    }, 1600);
  }, [clearCopyFeedbackTimer]);

  const openFullscreen = useCallback(() => {
    userZoomedRef.current = false;
    setFullscreenMode('diagram');
    setZoom(1);
    setDiagramSize(null);
    setFullscreenSvgMarkup(svg);
    setCopyState('idle');
    clearCopyFeedbackTimer();
    setFullscreenOpen(true);
  }, [clearCopyFeedbackTimer, svg]);

  const closeFullscreen = useCallback(() => {
    clearCopyFeedbackTimer();
    setFullscreenOpen(false);
    setCopyState('idle');
  }, [clearCopyFeedbackTimer]);

  const handleCopyFullscreenContent = useCallback(async () => {
    const copyText = fullscreenMode === 'source' ? source : svg;
    if (!copyText.trim()) {
      showCopyFeedback('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      showCopyFeedback('copied');
    } catch {
      showCopyFeedback('failed');
    }
  }, [fullscreenMode, showCopyFeedback, source, svg]);

  const handleFullscreenWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const { deltaY } = event;
    userZoomedRef.current = true;
    setZoom((currentZoom) => getNextZoom(currentZoom, deltaY));
  }, []);

  useEffect(() => {
    if (!fullscreenOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeFullscreen, fullscreenOpen]);

  useEffect(() => {
    return () => clearCopyFeedbackTimer();
  }, [clearCopyFeedbackTimer]);

  useEffect(() => {
    if (!fullscreenOpen || fullscreenMode !== 'diagram') return undefined;

    const canvasElement = canvasRef.current;
    if (!canvasElement) return undefined;

    canvasElement.addEventListener('wheel', handleFullscreenWheel, { passive: false });
    return () => {
      canvasElement.removeEventListener('wheel', handleFullscreenWheel);
    };
  }, [fullscreenMode, fullscreenOpen, handleFullscreenWheel]);

  useEffect(() => {
    clearCopyFeedbackTimer();
    setCopyState('idle');
  }, [clearCopyFeedbackTimer, fullscreenMode]);

  useEffect(() => {
    if (previousSvgRef.current === svg) return;

    previousSvgRef.current = svg;
    userZoomedRef.current = false;
    setFullscreenSvgMarkup(svg);
    setDiagramSize(null);
    setZoom(1);
  }, [svg]);

  useLayoutEffect(() => {
    if (!fullscreenOpen || fullscreenMode !== 'diagram') return undefined;

    let innerFrameId: number | null = null;
    let retryFrameId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        const applyNormalization = (): boolean => {
          const normalizedSvg = normalizeFullscreenSvg(diagramRef.current?.querySelector('svg') ?? null);
          const nextDiagramSize = normalizedSvg?.size ?? null;

          setDiagramSize(nextDiagramSize);
          if (!userZoomedRef.current) {
            setZoom(getFitZoom(canvasRef.current, nextDiagramSize));
          }
          if (normalizedSvg?.markup && normalizedSvg.markup !== fullscreenSvgMarkup) {
            setFullscreenSvgMarkup(normalizedSvg.markup);
            return true;
          }

          return Boolean(normalizedSvg?.markup);
        };

        const didNormalize = applyNormalization();
        if (!didNormalize) {
          retryFrameId = window.requestAnimationFrame(applyNormalization);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (innerFrameId !== null) {
        window.cancelAnimationFrame(innerFrameId);
      }
      if (retryFrameId !== null) {
        window.cancelAnimationFrame(retryFrameId);
      }
    };
  }, [fullscreenMode, fullscreenOpen, fullscreenSvgMarkup, svg]);

  const fullscreenCopyLabel = copyState === 'copied'
    ? '已复制'
    : copyState === 'failed'
      ? '复制失败'
      : fullscreenMode === 'source'
        ? '复制源码'
        : '复制 SVG';

  const fullscreenDiagramStyle = diagramSize
    ? {
      width: `${diagramSize.width * zoom}px`,
      height: `${diagramSize.height * zoom}px`,
    }
    : undefined;

  const inlineViewer = (
    <div className={'mermaid-diagram-viewer' + (className ? ` ${className}` : '')}>
      <div className="mermaid-diagram-frame">
        <button
          type="button"
          className="mermaid-diagram-inline"
          aria-label={`全屏查看${label}`}
          title={`全屏查看${label}`}
          onClick={openFullscreen}
        >
          <span className="mermaid-diagram-content" dangerouslySetInnerHTML={{ __html: svg }} />
        </button>
        <button
          type="button"
          className="mermaid-diagram-open-indicator"
          aria-label={`全屏查看${label}`}
          title={`全屏查看${label}`}
          onClick={openFullscreen}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );

  const fullscreenViewer = fullscreenOpen && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="mermaid-fullscreen-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`${label}全屏查看`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeFullscreen();
        }}
      >
        <div className="mermaid-fullscreen-shell" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mermaid-fullscreen-toolbar">
            <span className="mermaid-fullscreen-title">{label}</span>
            {hasSource && (
              <div className="mermaid-fullscreen-mode-toggle" role="group" aria-label="Mermaid 查看模式">
                <button
                  type="button"
                  className={fullscreenMode === 'diagram' ? 'active' : ''}
                  aria-pressed={fullscreenMode === 'diagram'}
                  onClick={() => {
                    setFullscreenMode('diagram');
                  }}
                >
                  图表
                </button>
                <button
                  type="button"
                  className={fullscreenMode === 'source' ? 'active' : ''}
                  aria-pressed={fullscreenMode === 'source'}
                  onClick={() => {
                    setFullscreenMode('source');
                  }}
                >
                  源码
                </button>
              </div>
            )}
            <button
              type="button"
              className={`mermaid-fullscreen-copy ${copyState}`}
              aria-label={fullscreenCopyLabel}
              title={fullscreenCopyLabel}
              onClick={handleCopyFullscreenContent}
            >
              {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <span className="mermaid-fullscreen-copy-feedback" aria-live="polite">
              {copyState === 'idle' ? '' : fullscreenCopyLabel}
            </span>
            <button
              type="button"
              className="mermaid-fullscreen-close"
              aria-label="关闭全屏图表"
              title="关闭全屏图表"
              onClick={closeFullscreen}
            >
              <X size={16} />
            </button>
          </div>
          {fullscreenMode === 'diagram' ? (
            <div ref={canvasRef} className="mermaid-fullscreen-canvas">
              <div
                ref={diagramRef}
                className="mermaid-fullscreen-diagram"
                style={fullscreenDiagramStyle}
                dangerouslySetInnerHTML={{ __html: fullscreenSvgMarkup }}
              />
            </div>
          ) : (
            <div className="mermaid-fullscreen-source-pane">
              <pre>{source}</pre>
            </div>
          )}
          {fullscreenMode === 'diagram' && (
            <span className="mermaid-fullscreen-zoom-label" aria-label={`当前缩放比例 ${Math.round(zoom * 100)}%`}>
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      {inlineViewer}
      {fullscreenViewer}
    </>
  );
};

export default MermaidDiagramViewer;
