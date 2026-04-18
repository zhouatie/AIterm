import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCw,
  Loader2,
  Search,
} from 'lucide-react';
import type { ScanTreeNode, SpecTreeOptions } from '../preload';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import ContextMenu, { createPathMenuItems, type ContextMenuBounds } from './ContextMenu';
import {
  readSpecDirectoryNames,
  SPEC_DIRECTORY_NAMES_CHANGED_EVENT,
  SPEC_ONLY_KEY,
  getHiddenFolderNames,
  HIDDEN_FOLDER_NAMES_CHANGED_EVENT,
} from '../utils/file-tree-settings';

// --- Types ---

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
  children?: TreeNode[];
  childrenLoaded?: boolean;
}

interface VisibleTreeRow {
  node: TreeNode;
  depth: number;
  guideFlags: boolean[];
  rowIndex: number;
}

interface FileTreeProps {
  rootPath: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onRefresh: () => void;
  refreshKey?: number;
  expandedPaths: string[];
  onExpandedPathsChange: (paths: string[]) => void;
  leadingControl?: React.ReactNode;
}

// --- Helpers ---

/** Convert ScanTreeNode[] from IPC into local TreeNode[]. */
function toTreeNodes(scanNodes: ScanTreeNode[], markDescendantsLoaded = false): TreeNode[] {
  return scanNodes.map((n) => ({
    name: n.name,
    path: n.path,
    isDirectory: n.isDirectory,
    mtime: n.mtime,
    children: n.children ? toTreeNodes(n.children, markDescendantsLoaded) : undefined,
    childrenLoaded: n.isDirectory ? markDescendantsLoaded || n.children !== undefined : true,
  }));
}

function collectDirectoryPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (!node.isDirectory) continue;
    paths.push(node.path);
    if (node.children) {
      paths.push(...collectDirectoryPaths(node.children));
    }
  }

  return paths;
}

function buildVisibleRows(
  nodes: TreeNode[],
  expandedPathSet: Set<string>,
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = [];

  function visit(currentNodes: TreeNode[], depth: number, guideFlags: boolean[]) {
    currentNodes.forEach((node, idx) => {
      rows.push({
        node,
        depth,
        guideFlags,
        rowIndex: rows.length,
      });

      if (!node.isDirectory || !node.children || !expandedPathSet.has(node.path)) {
        return;
      }

      visit(node.children, depth + 1, [
        ...guideFlags,
        idx < currentNodes.length - 1,
      ]);
    });
  }

  visit(nodes, 0, []);
  return rows;
}

function buildSearchRows(nodes: TreeNode[], searchQuery: string): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = [];
  const query = searchQuery.trim().toLowerCase();
  if (!query) return rows;

  function nodeMatches(node: TreeNode): boolean {
    return node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query);
  }

  function visit(currentNodes: TreeNode[], depth: number, guideFlags: boolean[]): boolean {
    let hasAnyMatch = false;

    currentNodes.forEach((node, idx) => {
      const childStart = rows.length;
      const childMatches = node.children
        ? visit(node.children, depth + 1, [...guideFlags, idx < currentNodes.length - 1])
        : false;
      const selfMatches = nodeMatches(node);

      if (selfMatches || childMatches) {
        rows.splice(childStart, 0, {
          node,
          depth,
          guideFlags,
          rowIndex: 0,
        });
        hasAnyMatch = true;
      }
    });

    return hasAnyMatch;
  }

  visit(nodes, 0, []);
  return rows.map((row, rowIndex) => ({ ...row, rowIndex }));
}

function replaceNodeChildren(
  nodes: TreeNode[],
  nodePath: string,
  children: TreeNode[],
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === nodePath) {
      return {
        ...node,
        children,
        childrenLoaded: true,
      };
    }

    if (!node.children) return node;

    return {
      ...node,
      children: replaceNodeChildren(node.children, nodePath, children),
    };
  });
}

function findNodeByPath(nodes: TreeNode[], nodePath: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === nodePath) return node;

    if (node.children) {
      const found = findNodeByPath(node.children, nodePath);
      if (found) return found;
    }
  }

  return null;
}

function getPathDepth(nodePath: string): number {
  return nodePath.split('/').filter(Boolean).length;
}

function normalizePathForCompare(filePath: string): string {
  const normalized = filePath.replace(/\/+$/, '');
  return normalized || '/';
}

function isHighLevelRoot(rootPath: string): boolean {
  const normalized = normalizePathForCompare(rootPath);
  return normalized === '/'
    || normalized === '/Users'
    || /^\/Users\/[^/]+$/.test(normalized);
}

// --- Constants ---

const INDENT_PX = 20;
const ICON_SIZE = 16;
const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';
const ROW_HEIGHT = 34;
const OVERSCAN_ROWS = 6;

interface ContextMenuState {
  x: number;
  y: number;
  nodePath: string;
  bounds?: ContextMenuBounds;
}

// --- Toolbar ---

interface ToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  specOnly: boolean;
  onToggleSpecOnly: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  allExpanded: boolean;
  hasExpandedPaths: boolean;
  canExpandAll: boolean;
  onRefresh: () => void;
  leadingControl?: React.ReactNode;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchQueryChange,
  specOnly,
  onToggleSpecOnly,
  onExpandAll,
  onCollapseAll,
  allExpanded,
  hasExpandedPaths,
  canExpandAll,
  onRefresh,
  leadingControl,
}) => {
  const showExpandControl = canExpandAll || hasExpandedPaths;
  const isCollapseOnly = !canExpandAll;
  const ToggleIcon = allExpanded || isCollapseOnly ? ChevronsDownUp : ChevronsUpDown;
  const toggleAction = allExpanded || isCollapseOnly ? onCollapseAll : onExpandAll;
  const refreshTitle = getIconButtonTooltip({
    label: '刷新文件树',
  });
  const expandToggleTitle = getIconButtonTooltip({
    label: allExpanded || isCollapseOnly ? '收起全部' : '展开全部',
  });

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
    transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
    e.currentTarget.style.color = ICON_COLOR_ACTIVE;
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 2px 6px var(--color-shadow)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = ICON_COLOR;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderBottom: '1px solid var(--color-border-light)',
        flexShrink: 0,
      }}
    >
      {leadingControl}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 7px',
          borderRadius: 4,
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-muted)',
        }}
      >
        <Search size={13} />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search"
          style={{
            minWidth: 0,
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontSize: 12,
            padding: 0,
          }}
        />
      </div>
      <button
        onClick={onToggleSpecOnly}
        title={specOnly ? 'Showing spec directories' : 'Show spec directories'}
        style={{
          ...buttonStyle,
          width: 34,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0,
          textTransform: 'lowercase',
          color: specOnly ? ICON_COLOR_ACTIVE : ICON_COLOR,
          backgroundColor: specOnly ? 'var(--color-bg-selected)' : 'transparent',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = specOnly ? 'var(--color-bg-selected)' : 'transparent';
          e.currentTarget.style.color = specOnly ? ICON_COLOR_ACTIVE : ICON_COLOR;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        spec
      </button>
      <button
        onClick={onRefresh}
        title={refreshTitle}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <RefreshCw size={14} />
      </button>
      {showExpandControl && (
        <button
          onClick={toggleAction}
          title={expandToggleTitle}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <ToggleIcon size={16} />
        </button>
      )}
    </div>
  );
};

// --- Tree Node Row ---

interface TreeNodeItemProps {
  row: VisibleTreeRow;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onToggleDir: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, nodePath: string) => void;
  expandedPathSet: Set<string>;
  searchActive: boolean;
  top: number;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  row,
  selectedFile,
  onSelectFile,
  onToggleDir,
  onContextMenu,
  expandedPathSet,
  searchActive,
  top,
}) => {
  const { node, depth, guideFlags } = row;
  const isSelected = !node.isDirectory && node.path === selectedFile;
  const isExpanded = searchActive || (node.isDirectory && expandedPathSet.has(node.path));

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
              backgroundColor: 'var(--color-guide-line)',
            }}
          />
        )}
      </span>,
    );
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        top,
        left: 4,
        right: 4,
        display: 'flex',
        alignItems: 'center',
        height: ROW_HEIGHT,
        paddingRight: 8,
        paddingLeft: isSelected ? 0 : 0,
        borderLeft: isSelected ? '3px solid var(--color-tree-indicator)' : '3px solid transparent',
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--color-bg-selected)' : 'transparent',
        boxShadow: 'none',
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        userSelect: 'none',
        transition: 'background-color 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--color-tree-row-hover)';
          e.currentTarget.style.boxShadow = 'var(--shadow-tree-row-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.boxShadow = 'none';
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
          color: 'var(--color-icon-chevron)',
          transition: 'transform 0.18s ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      >
        {node.isDirectory && <ChevronRight size={15} />}
      </span>

      {/* Icon */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          marginRight: 8,
          flexShrink: 0,
          color: node.isDirectory ? 'var(--color-icon-folder)' : ICON_COLOR,
        }}
      >
        {node.isDirectory ? (
          isExpanded ? (
            <FolderOpen size={ICON_SIZE} />
          ) : (
            <Folder size={ICON_SIZE} />
          )
        ) : (
          <FileText size={ICON_SIZE} />
        )}
      </span>

      {/* Name */}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: node.isDirectory ? 550 : 'normal' }}>
        {node.name}
      </span>
    </div>
  );
};

// --- Main FileTree ---

const FileTree: React.FC<FileTreeProps> = ({
  rootPath,
  selectedFile,
  onSelectFile,
  onRefresh,
  refreshKey,
  expandedPaths,
  onExpandedPathsChange,
  leadingControl,
}) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [treeFullyLoaded, setTreeFullyLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specOnly, setSpecOnly] = useState(() => localStorage.getItem(SPEC_ONLY_KEY) === 'true');
  const [specDirectoryNames, setSpecDirectoryNames] = useState(readSpecDirectoryNames);
  const [hiddenFolderNames, setHiddenFolderNames] = useState(getHiddenFolderNames);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const expandedPathsRef = useRef(expandedPaths);
  expandedPathsRef.current = expandedPaths;
  const expandedPathSet = useMemo(() => new Set(expandedPaths), [expandedPaths]);
  const allDirectoryPaths = useMemo(() => collectDirectoryPaths(nodes), [nodes]);
  const loadedRows = useMemo(
    () => buildVisibleRows(nodes, expandedPathSet),
    [nodes, expandedPathSet],
  );
  const searchRows = useMemo(
    () => buildSearchRows(nodes, searchQuery),
    [nodes, searchQuery],
  );
  const searchActive = searchQuery.trim().length > 0;
  const visibleRows = searchActive ? searchRows : loadedRows;
  const canExpandAll = rootPath ? !isHighLevelRoot(rootPath) : false;
  const hasExpandedPaths = expandedPaths.length > 0;
  const allExpanded = treeFullyLoaded
    && allDirectoryPaths.length > 0
    && allDirectoryPaths.every((path) => expandedPathSet.has(path));
  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  );
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
  const endIndex = Math.min(
    visibleRows.length,
    startIndex + visibleCount + OVERSCAN_ROWS * 2,
  );
  const virtualRows = visibleRows.slice(startIndex, endIndex);

  const getSpecOptions = useCallback((): SpecTreeOptions | undefined => {
    const specOpts = specOnly && !specDirectoryNames.includes(rootPath.split('/').filter(Boolean).at(-1) ?? '')
      ? { specRootPath: rootPath, specDirectoryNames }
      : undefined;

    if (!specOpts && hiddenFolderNames.length === 0) return undefined;

    return {
      ...specOpts,
      ...(hiddenFolderNames.length > 0 ? { hiddenFolderNames } : {}),
    };
  }, [rootPath, specDirectoryNames, specOnly, hiddenFolderNames]);

  useEffect(() => {
    const handleSpecDirectoriesChanged = () => {
      setSpecDirectoryNames(readSpecDirectoryNames());
    };

    window.addEventListener(SPEC_DIRECTORY_NAMES_CHANGED_EVENT, handleSpecDirectoriesChanged);
    return () => window.removeEventListener(SPEC_DIRECTORY_NAMES_CHANGED_EVENT, handleSpecDirectoriesChanged);
  }, []);

  useEffect(() => {
    const handleHiddenFoldersChanged = () => {
      setHiddenFolderNames(getHiddenFolderNames());
    };

    window.addEventListener(HIDDEN_FOLDER_NAMES_CHANGED_EVENT, handleHiddenFoldersChanged);
    return () => window.removeEventListener(HIDDEN_FOLDER_NAMES_CHANGED_EVENT, handleHiddenFoldersChanged);
  }, []);

  // Normal mode loads root's direct children; spec mode jumps directly into configured spec directories.
  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    setLoading(true);
    setContextMenu(null);
    setTreeFullyLoaded(false);
    setScrollTop(0);
    scrollContainerRef.current?.scrollTo({ top: 0 });

    async function loadTree() {
      const readOptions = getSpecOptions();

      try {
        const result = await window.fileApi.readTreeDirectory(rootPath, readOptions);
        if (cancelled) return;

        if (result.tree) {
          let nextNodes = toTreeNodes(result.tree);
          let nextExpandedPaths = expandedPathsRef.current;

          const expandedPathsByDepth = [...new Set(nextExpandedPaths)]
            .sort((a, b) => getPathDepth(a) - getPathDepth(b));

          for (const expandedPath of expandedPathsByDepth) {
            if (cancelled) return;

            const node = findNodeByPath(nextNodes, expandedPath);
            if (!node?.isDirectory || node.childrenLoaded) continue;

            try {
              const childResult = await window.fileApi.readTreeDirectory(node.path, readOptions);
              if (cancelled) return;
              nextNodes = replaceNodeChildren(
                nextNodes,
                node.path,
                toTreeNodes(childResult.tree ?? []),
              );
            } catch {
              if (cancelled) return;
              nextNodes = replaceNodeChildren(nextNodes, node.path, []);
            }
          }

          const nextExpandedPathSet = new Set(nextExpandedPaths);
          const nextDirectoryPaths = collectDirectoryPaths(nextNodes);
          setTreeFullyLoaded(
            nextDirectoryPaths.length > 0
              && nextDirectoryPaths.every((path) => nextExpandedPathSet.has(path)),
          );
          setNodes(nextNodes);
        } else {
          setNodes([]);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setNodes([]);
          setLoading(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, [rootPath, refreshKey, getSpecOptions, onExpandedPathsChange]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const updateViewportHeight = () => {
      setViewportHeight(scrollContainer.clientHeight);
    };

    updateViewportHeight();
    const resizeObserver = new ResizeObserver(() => updateViewportHeight());
    resizeObserver.observe(scrollContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [loading]);

  const handleToggleDir = useCallback(
    async (node: TreeNode) => {
      if (expandedPathSet.has(node.path)) {
        onExpandedPathsChange(expandedPaths.filter((path) => path !== node.path));
        return;
      }

      if (!node.childrenLoaded) {
        try {
          const result = await window.fileApi.readTreeDirectory(node.path, getSpecOptions());
          setNodes((currentNodes) => replaceNodeChildren(
            currentNodes,
            node.path,
            toTreeNodes(result.tree ?? []),
          ));
        } catch {
          setNodes((currentNodes) => replaceNodeChildren(currentNodes, node.path, []));
        }
      }

      onExpandedPathsChange([...expandedPaths, node.path]);
    },
    [expandedPathSet, expandedPaths, getSpecOptions, onExpandedPathsChange],
  );

  const handleExpandAll = useCallback(async () => {
    if (!canExpandAll) return;
    setLoading(true);
    setContextMenu(null);
    try {
      const result = await window.fileApi.scanAllFiles(rootPath, getSpecOptions());
      const nextNodes = result.tree ? toTreeNodes(result.tree, true) : [];
      setNodes(nextNodes);
      setTreeFullyLoaded(true);
      onExpandedPathsChange(collectDirectoryPaths(nextNodes));
    } catch {
      setNodes([]);
      setTreeFullyLoaded(true);
      onExpandedPathsChange([]);
    } finally {
      setLoading(false);
    }
  }, [canExpandAll, getSpecOptions, rootPath, onExpandedPathsChange]);

  const handleCollapseAll = useCallback(() => {
    onExpandedPathsChange([]);
  }, [onExpandedPathsChange]);

  const handleToggleSpecOnly = useCallback(() => {
    setSpecOnly((prev) => {
      const next = !prev;
      localStorage.setItem(SPEC_ONLY_KEY, String(next));
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodePath: string) => {
    const containerBounds = containerRef.current?.getBoundingClientRect();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodePath,
      bounds: containerBounds
        ? {
          left: containerBounds.left + 8,
          right: containerBounds.right - 8,
          top: containerBounds.top + 8,
          bottom: containerBounds.bottom - 8,
        }
        : undefined,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          specOnly={specOnly}
          onToggleSpecOnly={handleToggleSpecOnly}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          allExpanded={allExpanded}
          hasExpandedPaths={hasExpandedPaths}
          canExpandAll={canExpandAll}
          onRefresh={onRefresh}
          leadingControl={leadingControl}
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
            style={{ color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        specOnly={specOnly}
        onToggleSpecOnly={handleToggleSpecOnly}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        allExpanded={allExpanded}
        hasExpandedPaths={hasExpandedPaths}
        canExpandAll={canExpandAll}
        onRefresh={onRefresh}
        leadingControl={leadingControl}
      />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {visibleRows.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            {searchActive ? 'No matches found' : 'No files found'}
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualRows.map((row) => (
              <TreeNodeItem
                key={row.node.path}
                row={row}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onToggleDir={handleToggleDir}
                onContextMenu={handleContextMenu}
                expandedPathSet={expandedPathSet}
                searchActive={searchActive}
                top={row.rowIndex * ROW_HEIGHT}
              />
            ))}
          </div>
        )}
      </div>
      {/* Context menu portal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          bounds={contextMenu.bounds}
          items={createPathMenuItems({
            nodePath: contextMenu.nodePath,
            rootPath,
            onClose: handleCloseContextMenu,
          })}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default FileTree;
