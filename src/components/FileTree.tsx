import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Files,
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { ScanTreeNode } from '../preload';

// --- Types ---

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  isExpanded?: boolean;
}

interface FileTreeProps {
  rootPath: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onRefresh: () => void;
  mdOnly: boolean;
  onToggleMdOnly: () => void;
}

// --- Helpers ---

/** Convert ScanTreeNode[] from IPC into local TreeNode[] (all directories collapsed). */
function toTreeNodes(scanNodes: ScanTreeNode[]): TreeNode[] {
  return scanNodes.map((n) => ({
    name: n.name,
    path: n.path,
    isDirectory: n.isDirectory,
    isExpanded: false,
    children: n.children ? toTreeNodes(n.children) : undefined,
  }));
}

// --- Constants ---

const INDENT_PX = 20;
const ICON_SIZE = 15;
const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';
const ROW_HEIGHT = 28;
const CONTEXT_MENU_WIDTH = 180;
const CONTEXT_MENU_ITEM_HEIGHT = 30;

// --- Context Menu ---

interface ContextMenuState {
  x: number;
  y: number;
  nodePath: string;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  rootPath: string;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ menu, rootPath, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Adjust position if near viewport edges
  const menuHeight = CONTEXT_MENU_ITEM_HEIGHT * 4 + 8 + 1; // 4 items + padding + separator
  let adjustedX = menu.x;
  let adjustedY = menu.y;
  if (menu.x + CONTEXT_MENU_WIDTH > window.innerWidth) {
    adjustedX = menu.x - CONTEXT_MENU_WIDTH;
  }
  if (menu.y + menuHeight > window.innerHeight) {
    adjustedY = menu.y - menuHeight;
  }

  const handleCopyFileName = async () => {
    const fileName = menu.nodePath.split('/').pop() || menu.nodePath;
    try {
      await navigator.clipboard.writeText(fileName);
    } catch {
      // Clipboard write failed silently
    }
    onClose();
  };

  const handleCopyRelativePath = async () => {
    const relativePath = menu.nodePath.startsWith(rootPath + '/')
      ? menu.nodePath.slice(rootPath.length + 1)
      : menu.nodePath;
    try {
      await navigator.clipboard.writeText(relativePath);
    } catch {
      // Clipboard write failed silently
    }
    onClose();
  };

  const handleCopyAbsolutePath = async () => {
    try {
      await navigator.clipboard.writeText(menu.nodePath);
    } catch {
      // Clipboard write failed silently
    }
    onClose();
  };

  const handleShowInFolder = () => {
    window.fileApi.showInFolder(menu.nodePath);
    onClose();
  };

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
        width: CONTEXT_MENU_WIDTH,
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 6,
        boxShadow: '0 2px 8px var(--color-shadow-heavy)',
        padding: '4px 0',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      <div
        style={menuItemStyle}
        onClick={handleCopyFileName}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Copy Filename
      </div>
      <div
        style={menuItemStyle}
        onClick={handleCopyRelativePath}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Copy Relative Path
      </div>
      <div
        style={menuItemStyle}
        onClick={handleCopyAbsolutePath}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Copy Absolute Path
      </div>
      <div style={{ height: 1, backgroundColor: '#e0e0e0', margin: '4px 0' }} />
      <div
        style={menuItemStyle}
        onClick={handleShowInFolder}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Reveal in Finder
      </div>
    </div>
  );
};

// --- Toolbar ---

interface ToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  allExpanded: boolean;
  onRefresh: () => void;
  mdOnly: boolean;
  onToggleMdOnly: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onExpandAll, onCollapseAll, allExpanded, onRefresh, mdOnly, onToggleMdOnly }) => {
  const ToggleIcon = allExpanded ? ChevronsDownUp : ChevronsUpDown;
  const toggleAction = allExpanded ? onCollapseAll : onExpandAll;
  const title = allExpanded ? 'Collapse All' : 'Expand All';

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    background: 'transparent',
    borderRadius: 4,
    cursor: 'pointer',
    color: ICON_COLOR,
    padding: 0,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
    e.currentTarget.style.color = ICON_COLOR_ACTIVE;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = ICON_COLOR;
  };

  const FilterIcon = mdOnly ? FileText : Files;
  const filterTitle = mdOnly ? 'Showing Markdown only — click to show all files' : 'Showing all files — click to show Markdown only';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        padding: '4px 8px',
        borderBottom: '1px solid var(--color-border-light)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onToggleMdOnly}
        title={filterTitle}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <FilterIcon size={14} />
      </button>
      <button
        onClick={onRefresh}
        title="Refresh"
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <RefreshCw size={14} />
      </button>
      <button
        onClick={toggleAction}
        title={title}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <ToggleIcon size={16} />
      </button>
    </div>
  );
};

// --- Tree Node Row ---

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onToggleDir: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, nodePath: string) => void;
  /** For each ancestor depth, whether that ancestor has more siblings below */
  guideFlags: boolean[];
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onToggleDir,
  onContextMenu,
  guideFlags,
}) => {
  const isSelected = !node.isDirectory && node.path === selectedFile;

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleDir(node);
    } else {
      onSelectFile(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node.path);
  };

  // Build indent guides
  const guides = [];
  for (let i = 0; i < depth; i++) {
    guides.push(
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: INDENT_PX,
          height: ROW_HEIGHT,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {guideFlags[i] && (
          <span
            style={{
              position: 'absolute',
              left: INDENT_PX / 2 - 0.5,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: '#e4e4e4',
            }}
          />
        )}
      </span>,
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: ROW_HEIGHT,
          paddingRight: 8,
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
          fontSize: 13,
          color: '#333',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Indent guides */}
        {guides}

        {/* Chevron arrow (directories only) */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: ROW_HEIGHT,
            flexShrink: 0,
            color: '#999',
          }}
        >
          {node.isDirectory &&
            (node.isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </span>

        {/* Icon */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            marginRight: 5,
            flexShrink: 0,
            color: node.isDirectory ? '#dcb67a' : ICON_COLOR,
          }}
        >
          {node.isDirectory ? (
            node.isExpanded ? (
              <FolderOpen size={ICON_SIZE} />
            ) : (
              <Folder size={ICON_SIZE} />
            )
          ) : (
            <FileText size={ICON_SIZE} />
          )}
        </span>

        {/* Name */}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
      </div>

      {/* Children */}
      {node.isDirectory && node.isExpanded && node.children && (
        <>
          {node.children.map((child, idx) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleDir={onToggleDir}
              onContextMenu={onContextMenu}
              guideFlags={[
                ...guideFlags,
                idx < node.children!.length - 1, // true if more siblings below
              ]}
            />
          ))}
        </>
      )}
    </>
  );
};

// --- Main FileTree ---

const FileTree: React.FC<FileTreeProps> = ({ rootPath, selectedFile, onSelectFile, onRefresh, mdOnly, onToggleMdOnly }) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Load entire tree when rootPath or mdOnly changes
  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    setLoading(true);
    setAllExpanded(false);
    setContextMenu(null);

    const scanFn = mdOnly
      ? window.fileApi.scanMdFiles(rootPath)
      : window.fileApi.scanAllFiles(rootPath);

    scanFn.then((result) => {
      if (!cancelled) {
        if (result.tree) {
          setNodes(toTreeNodes(result.tree));
        } else {
          setNodes([]);
        }
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rootPath, mdOnly]);

  // Deep update a node in the tree by path
  const updateNode = useCallback(
    (nodePath: string, updater: (n: TreeNode) => TreeNode) => {
      const updateRecursive = (list: TreeNode[]): TreeNode[] =>
        list.map((n) => {
          if (n.path === nodePath) return updater(n);
          if (n.isDirectory && n.children) {
            return { ...n, children: updateRecursive(n.children) };
          }
          return n;
        });
      setNodes((prev) => updateRecursive(prev));
    },
    [],
  );

  const handleToggleDir = useCallback(
    (node: TreeNode) => {
      if (node.isExpanded) {
        updateNode(node.path, (n) => ({ ...n, isExpanded: false }));
        setAllExpanded(false);
      } else {
        updateNode(node.path, (n) => ({ ...n, isExpanded: true }));
      }
    },
    [updateNode],
  );

  // Expand all: recursively set isExpanded = true (tree is already fully loaded)
  const handleExpandAll = useCallback(() => {
    function expandRecursive(list: TreeNode[]): TreeNode[] {
      return list.map((n) =>
        n.isDirectory
          ? { ...n, isExpanded: true, children: n.children ? expandRecursive(n.children) : undefined }
          : n,
      );
    }
    setNodes((prev) => expandRecursive(prev));
    setAllExpanded(true);
  }, []);

  // Collapse all
  const handleCollapseAll = useCallback(() => {
    function collapseRecursive(list: TreeNode[]): TreeNode[] {
      return list.map((n) =>
        n.isDirectory
          ? { ...n, isExpanded: false, children: n.children ? collapseRecursive(n.children) : undefined }
          : n,
      );
    }
    setNodes((prev) => collapseRecursive(prev));
    setAllExpanded(false);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, nodePath: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodePath });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          allExpanded={allExpanded}
          onRefresh={onRefresh}
          mdOnly={mdOnly}
          onToggleMdOnly={onToggleMdOnly}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2
            size={20}
            style={{ color: '#999', animation: 'spin 1s linear infinite' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        allExpanded={allExpanded}
        onRefresh={onRefresh}
        mdOnly={mdOnly}
        onToggleMdOnly={onToggleMdOnly}
      />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {nodes.length === 0 ? (
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
            {mdOnly ? 'No Markdown files found' : 'No files found'}
          </div>
        ) : (
          nodes.map((node, idx) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleDir={handleToggleDir}
              onContextMenu={handleContextMenu}
              guideFlags={[idx < nodes.length - 1]}
            />
          ))
        )}
      </div>
      {/* Context menu portal */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          rootPath={rootPath}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default FileTree;
