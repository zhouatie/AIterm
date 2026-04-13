import React, { useState, useCallback, useRef, useEffect, ReactNode } from 'react';

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minLeftPx?: number;
  minRightPx?: number;
  onResize?: () => void;
  /** Add a subtle shadow between panes for depth separation */
  shadow?: boolean;
  /** Collapse the left pane to zero width (keeps children mounted) */
  leftCollapsed?: boolean;
}

/**
 * The visible divider is a subtle 1px line.
 * The hit area for dragging is wider (invisible padding around the line).
 */
const HIT_AREA_WIDTH = 8;

const SplitLayout: React.FC<SplitLayoutProps> = ({
  left,
  right,
  defaultLeftPercent = 30,
  minLeftPx = 200,
  minRightPx = 400,
  onResize,
  shadow = false,
  leftCollapsed = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const isDragging = useRef(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

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

        const clampedX = Math.max(minLeftPx, Math.min(mouseX, totalWidth - minRightPx));
        const newPercent = (clampedX / totalWidth) * 100;
        setLeftPercent(newPercent);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        setIsDraggingState(false);
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
    [minLeftPx, minRightPx, onResize],
  );

  // Notify parent when leftPercent changes during drag
  const prevPercentRef = useRef(leftPercent);
  useEffect(() => {
    if (prevPercentRef.current !== leftPercent) {
      prevPercentRef.current = leftPercent;
      onResize?.();
    }
  }, [leftPercent, onResize]);

  const showAccent = isHovering || isDraggingState;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left pane */}
      <div
        style={{
          width: leftCollapsed ? 0 : `${leftPercent}%`,
          height: '100%',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'width 0.18s ease',
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
          overflow: 'hidden',
          pointerEvents: leftCollapsed ? 'none' : 'auto',
          transition: 'width 0.18s ease, margin 0.18s ease',
        }}
      >
        {/* The visible line */}
        <div
          style={{
            width: showAccent ? 2 : 1,
            height: '100%',
            backgroundColor: showAccent ? 'var(--color-accent-divider)' : 'var(--color-border-secondary)',
            opacity: leftCollapsed ? 0 : 1,
            transition: 'background-color 0.15s, width 0.15s, opacity 0.18s ease',
            borderRadius: showAccent ? 1 : 0,
          }}
        />
      </div>

      {/* Right pane */}
      <div
        style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          ...(shadow
            ? { boxShadow: '-2px 0 6px var(--color-shadow)', zIndex: 1 }
            : {}),
        }}
      >
        {right}
      </div>
    </div>
  );
};

export default SplitLayout;
