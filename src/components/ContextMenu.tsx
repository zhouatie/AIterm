import React, { useEffect, useRef } from 'react';

export interface ContextMenuActionItem {
  type?: 'action';
  label: string;
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
}

export interface ContextMenuSeparatorItem {
  type: 'separator';
}

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSeparatorItem;

export interface ContextMenuBounds {
  left: number;
  right: number;
  top?: number;
  bottom?: number;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  width?: number;
  bounds?: ContextMenuBounds;
}

const DEFAULT_MENU_WIDTH = 180;
const CONTEXT_MENU_ITEM_HEIGHT = 30;

function getFileName(nodePath: string): string {
  const trimmed = nodePath.replace(/\/+$/, '');
  if (!trimmed) return nodePath;
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || nodePath;
}

function getRelativePath(nodePath: string, rootPath: string): string {
  if (!rootPath) return nodePath;
  if (nodePath === rootPath) return getFileName(nodePath);
  if (nodePath.startsWith(rootPath + '/')) {
    return nodePath.slice(rootPath.length + 1);
  }
  return nodePath;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard write failed silently
  }
}

export function createPathMenuItems({
  nodePath,
  rootPath,
  onClose,
  revealLabel = 'Reveal in Finder',
}: {
  nodePath: string | null;
  rootPath?: string | null;
  onClose: () => void;
  revealLabel?: string;
}): ContextMenuItem[] {
  const resolvedPath = nodePath?.trim() || '';
  const resolvedRootPath = rootPath?.trim() || '';
  const disabled = !resolvedPath;

  return [
    {
      label: 'Copy Filename',
      disabled,
      onSelect: async () => {
        if (!resolvedPath) return;
        await copyText(getFileName(resolvedPath));
        onClose();
      },
    },
    {
      label: 'Copy Relative Path',
      disabled,
      onSelect: async () => {
        if (!resolvedPath) return;
        await copyText(getRelativePath(resolvedPath, resolvedRootPath || resolvedPath));
        onClose();
      },
    },
    {
      label: 'Copy Absolute Path',
      disabled,
      onSelect: async () => {
        if (!resolvedPath) return;
        await copyText(resolvedPath);
        onClose();
      },
    },
    { type: 'separator' },
    {
      label: revealLabel,
      disabled,
      onSelect: () => {
        if (!resolvedPath) return;
        window.fileApi.showInFolder(resolvedPath);
        onClose();
      },
    },
  ];
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  width = DEFAULT_MENU_WIDTH,
  bounds,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const menuHeight = items.reduce((total, item) => {
    if (item.type === 'separator') return total + 9;
    return total + CONTEXT_MENU_ITEM_HEIGHT;
  }, 8);

  const horizontalLeftBound = bounds?.left ?? 8;
  const horizontalRightBound = bounds?.right ?? window.innerWidth - 8;
  const verticalTopBound = bounds?.top ?? 8;
  const verticalBottomBound = bounds?.bottom ?? window.innerHeight - 8;

  let adjustedX = x;
  let adjustedY = y;
  if (x + width > horizontalRightBound) {
    adjustedX = Math.max(horizontalLeftBound, x - width);
  }
  if (adjustedX + width > horizontalRightBound) {
    adjustedX = Math.max(horizontalLeftBound, horizontalRightBound - width);
  }
  if (y + menuHeight > verticalBottomBound) {
    adjustedY = Math.max(verticalTopBound, y - menuHeight);
  }
  if (adjustedY + menuHeight > verticalBottomBound) {
    adjustedY = Math.max(verticalTopBound, verticalBottomBound - menuHeight);
  }

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: CONTEXT_MENU_ITEM_HEIGHT,
    padding: '0 12px',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderRadius: 3,
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        width,
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 6,
        boxShadow: '0 2px 8px var(--color-shadow-heavy)',
        padding: '4px 0',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div
              key={`separator-${index}`}
              style={{ height: 1, backgroundColor: 'var(--color-border-primary)', margin: '4px 0' }}
            />
          );
        }

        return (
          <div
            key={`${item.label}-${index}`}
            style={{
              ...menuItemStyle,
              opacity: item.disabled ? 0.45 : 1,
              cursor: item.disabled ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (item.disabled) return;
              void item.onSelect();
            }}
            onMouseEnter={(event) => {
              if (item.disabled) return;
              event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
};

export default ContextMenu;
