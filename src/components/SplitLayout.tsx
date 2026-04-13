import React, { useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  defaultLeftPx?: number;
  storageKey?: string;
  minLeftPx?: number;
  minRightPx?: number;
  onResize?: () => void;
  /** Add a subtle shadow between panes for depth separation */
  shadow?: boolean;
  /** Which side of the divider should show the shadow */
  shadowSide?: 'left' | 'right';
  /** Collapse the left pane to zero width (keeps children mounted) */
  leftCollapsed?: boolean;
}

/**
 * The visible divider is a subtle 1px line.
 * The hit area for dragging is wider (invisible padding around the line).
 */
const HIT_AREA_WIDTH = 8;

type LeftSizeMode = 'percent' | 'px';

function readStoredSize(
  storageKey: string | undefined,
  fallback: number,
  mode: LeftSizeMode,
): number {
  if (!storageKey) return fallback;
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return fallback;
  const parsed = Number(stored);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  if (mode === 'percent' && parsed >= 100) return fallback;
  return parsed;
}

function clampLeftSizeToWidth(
  size: number,
  totalWidth: number,
  minLeftPx: number,
  minRightPx: number,
  mode: LeftSizeMode,
): number {
  if (totalWidth <= 0) return size;

  const targetPx = mode === 'percent' ? (size / 100) * totalWidth : size;
  const minLeft = Math.min(minLeftPx, totalWidth);
  const maxLeft = Math.max(0, totalWidth - minRightPx);
  const clampedPx =
    minLeft <= maxLeft
      ? Math.max(minLeft, Math.min(targetPx, maxLeft))
      : Math.max(0, Math.min(targetPx, totalWidth));

  return mode === 'percent' ? (clampedPx / totalWidth) * 100 : clampedPx;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
  left,
  right,
  defaultLeftPercent = 30,
  defaultLeftPx,
  storageKey,
  minLeftPx = 200,
  minRightPx = 400,
  onResize,
  shadow = false,
  shadowSide = 'right',
  leftCollapsed = false,
}) => {
  const sizeMode: LeftSizeMode = defaultLeftPx === undefined ? 'percent' : 'px';
  const defaultLeftSize = defaultLeftPx ?? defaultLeftPercent;
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftSize, setLeftSize] = useState(() => readStoredSize(storageKey, defaultLeftSize, sizeMode));
  const [containerWidth, setContainerWidth] = useState(0);
  const leftSizeRef = useRef(leftSize);
  const isDragging = useRef(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const updateLeftSize = useCallback((nextSize: number) => {
    leftSizeRef.current = nextSize;
    setLeftSize(nextSize);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      setIsDraggingState(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const totalWidth = rect.width;
        const mouseX = moveEvent.clientX - rect.left;

        const targetSize = sizeMode === 'percent'
          ? totalWidth > 0 ? (mouseX / totalWidth) * 100 : leftSizeRef.current
          : mouseX;
        const newSize = clampLeftSizeToWidth(targetSize, totalWidth, minLeftPx, minRightPx, sizeMode);
        updateLeftSize(newSize);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        setIsDraggingState(false);
        if (storageKey) {
          localStorage.setItem(storageKey, String(leftSizeRef.current));
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResize?.();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [minLeftPx, minRightPx, onResize, sizeMode, storageKey, updateLeftSize],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const syncContainerWidth = () => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.getBoundingClientRect().width;
      setContainerWidth(totalWidth);
      if (sizeMode === 'px' || isDragging.current) return;
      const nextSize = clampLeftSizeToWidth(leftSizeRef.current, totalWidth, minLeftPx, minRightPx, sizeMode);
      if (nextSize !== leftSizeRef.current) {
        updateLeftSize(nextSize);
      }
    };

    syncContainerWidth();

    const resizeObserver = new ResizeObserver(syncContainerWidth);
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [minLeftPx, minRightPx, sizeMode, updateLeftSize]);

  // Notify parent when left size changes during drag
  const prevSizeRef = useRef(leftSize);
  useEffect(() => {
    if (prevSizeRef.current !== leftSize) {
      prevSizeRef.current = leftSize;
      onResize?.();
    }
  }, [leftSize, onResize]);

  const showAccent = isHovering || isDraggingState;
  const renderedLeftSize =
    sizeMode === 'percent'
      ? leftSize
      : clampLeftSizeToWidth(leftSize, containerWidth, minLeftPx, minRightPx, sizeMode);
  const leftWidth = leftCollapsed ? 0 : sizeMode === 'percent' ? `${renderedLeftSize}%` : renderedLeftSize;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--color-workbench-bg)',
      }}
    >
      {/* Left pane */}
      <div
        style={{
          width: leftWidth,
          height: '100%',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: 'var(--color-surface-content)',
          ...(shadow && shadowSide === 'left'
            ? { boxShadow: 'inset -1px 0 0 var(--color-border-light)', zIndex: 1 }
            : {}),
          transition: isDraggingState ? 'none' : 'width 0.18s ease',
        }}
      >
        {left}
      </div>

      {/* Divider: invisible wide hit area with a thin visual line in the center */}
      <div
        onMouseDown={leftCollapsed ? undefined : handleMouseDown}
        onMouseEnter={() => {
          if (!leftCollapsed) setIsHovering(true);
        }}
        onMouseLeave={() => {
          if (!isDragging.current) setIsHovering(false);
        }}
        style={{
          width: leftCollapsed ? 0 : HIT_AREA_WIDTH,
          marginLeft: leftCollapsed ? 0 : -HIT_AREA_WIDTH / 2,
          marginRight: leftCollapsed ? 0 : -HIT_AREA_WIDTH / 2,
          height: '100%',
          position: 'relative',
          cursor: leftCollapsed ? 'default' : 'col-resize',
          flexShrink: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          overflow: shadow && !leftCollapsed ? 'visible' : 'hidden',
          pointerEvents: leftCollapsed ? 'none' : 'auto',
          transition: isDraggingState ? 'none' : 'width 0.18s ease, margin 0.18s ease',
        }}
      >
        {shadow && !leftCollapsed && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              ...(shadowSide === 'right' ? { right: -18 } : { left: -18 }),
              width: 22,
              height: '100%',
              pointerEvents: 'none',
              background:
                shadowSide === 'right'
                  ? 'linear-gradient(90deg, rgba(20, 29, 44, 0.12) 0%, rgba(20, 29, 44, 0.06) 40%, rgba(20, 29, 44, 0.02) 68%, rgba(20, 29, 44, 0) 100%)'
                  : 'linear-gradient(to left, rgba(20, 29, 44, 0.12) 0%, rgba(20, 29, 44, 0.06) 40%, rgba(20, 29, 44, 0.02) 68%, rgba(20, 29, 44, 0) 100%)',
              opacity: showAccent ? 0.9 : 1,
            }}
          />
        )}
        {/* The visible line */}
        <div
          style={{
            width: showAccent ? 2 : 1,
            height: '100%',
            backgroundColor: showAccent ? 'var(--color-accent-divider)' : 'var(--color-border-secondary)',
            opacity: leftCollapsed ? 0 : 1,
            transition: 'background-color 0.16s ease, width 0.16s ease, opacity 0.18s ease, box-shadow 0.16s ease',
            borderRadius: 999,
            boxShadow: showAccent ? '0 0 0 3px var(--color-focus-soft)' : 'none',
          }}
        />
      </div>

      {/* Right pane */}
      <div
        style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface-content)',
          ...(shadow && shadowSide === 'right'
            ? {
                boxShadow: 'inset 1px 0 0 var(--color-border-light)',
                zIndex: 1,
              }
            : {}),
        }}
      >
        {right}
      </div>
    </div>
  );
};

export default SplitLayout;
