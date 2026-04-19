import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import ContextMenu, { type ContextMenuBounds, type ContextMenuItem } from './ContextMenu';
import type { ScanTreeNode } from '../preload';
import type { NoteVault } from '../utils/note-settings';

interface NoteFileListProps {
  currentVault: NoteVault | null;
  vaults: NoteVault[];
  noteDir: string;
  tree: ScanTreeNode[];
  selectedFolderPath: string;
  activeFilePath: string | null;
  requestedRenamePath: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onVaultChange: (vaultId: string) => void;
  onFileSelect: (filePath: string, fileName: string) => void;
  onSelectFolder: (folderPath: string) => void;
  onCreateNote: (inDir?: string) => void;
  onCreateFolder: (inDir?: string) => Promise<string | null>;
  onDeleteNote: (filePath: string, fileName: string, isDirectory: boolean) => void;
  onRename: (oldPath: string, newPath: string, isDirectory: boolean) => Promise<boolean>;
  onMoveNode: (sourcePath: string, targetDirPath: string, isDirectory: boolean) => Promise<boolean>;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  bounds?: ContextMenuBounds;
}

interface DragState {
  path: string;
  isDirectory: boolean;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  background: 'var(--color-bg-secondary)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 10,
  padding: '12px 12px 10px',
  borderBottom: '1px solid var(--color-border-primary)',
};

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: '1px solid transparent',
  background: 'transparent',
  borderRadius: 8,
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  padding: 0,
  transition: 'background 0.16s ease, border-color 0.16s ease, color 0.16s ease',
};

const dragHandleStyle: React.CSSProperties = {
  ...iconButtonStyle,
  width: 18,
  height: 28,
  flexShrink: 0,
  cursor: 'grab',
  color: 'var(--color-text-muted)',
};

const treeScrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '8px 0 12px',
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 34,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-primary)',
};

function getDisplayName(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

function getParentPath(filePath: string): string {
  const index = filePath.lastIndexOf('/');
  return index >= 0 ? filePath.slice(0, index) : filePath;
}

function getRelativePath(targetPath: string, rootPath: string): string {
  if (targetPath === rootPath) return '根目录';
  if (!targetPath.startsWith(rootPath + '/')) return targetPath;
  return targetPath.slice(rootPath.length + 1);
}

function getPathName(nodePath: string): string {
  const trimmed = nodePath.replace(/\/+$/, '');
  const index = trimmed.lastIndexOf('/');
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

function buildMovedPath(sourcePath: string, targetDirPath: string): string {
  return `${targetDirPath.replace(/\/+$/, '')}/${getPathName(sourcePath)}`;
}

function canDropOnFolder(dragState: DragState | null, targetDirPath: string): boolean {
  if (!dragState) return false;
  if (getParentPath(dragState.path) === targetDirPath) return false;
  if (!dragState.isDirectory) return true;
  return targetDirPath !== dragState.path && !targetDirPath.startsWith(dragState.path + '/');
}

function replaceExpandedPaths(
  paths: Set<string>,
  oldPath: string,
  newPath: string,
  isDirectory: boolean,
): Set<string> {
  const next = new Set<string>();

  for (const path of paths) {
    if (path === oldPath) {
      next.add(newPath);
      continue;
    }

    if (isDirectory && path.startsWith(oldPath + '/')) {
      next.add(newPath + path.slice(oldPath.length));
      continue;
    }

    next.add(path);
  }

  return next;
}

function countVisibleNotes(nodes: ScanTreeNode[]): number {
  return nodes.reduce((count, node) => {
    if (!node.isDirectory) return count + 1;
    return count + countVisibleNotes(node.children ?? []);
  }, 0);
}

function getAncestors(filePath: string, rootPath: string): string[] {
  if (!filePath.startsWith(rootPath)) return [];

  const ancestors: string[] = [];
  let current = getParentPath(filePath);
  while (current && current.length >= rootPath.length) {
    ancestors.push(current);
    if (current === rootPath) break;
    current = getParentPath(current);
  }
  return ancestors;
}

function filterTreeByQuery(nodes: ScanTreeNode[], query: string): ScanTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;

  return nodes.flatMap((node) => {
    if (node.isDirectory) {
      const children = filterTreeByQuery(node.children ?? [], normalizedQuery);
      return children.length > 0 ? [{ ...node, children }] : [];
    }

    return getDisplayName(node.name).toLowerCase().includes(normalizedQuery) ? [node] : [];
  });
}

function buildTreeRowStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 30,
    paddingRight: 10,
    borderRadius: 8,
    color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: selected ? 'var(--color-bg-selected)' : 'transparent',
    boxShadow: selected ? 'var(--shadow-tree-row-hover)' : 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 150ms ease, box-shadow 150ms ease, color 0.16s ease',
  };
}

interface InlineRenameProps {
  initialValue: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

const InlineRename: React.FC<InlineRenameProps> = ({ initialValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      autoFocus
      type="text"
      value={value}
      spellCheck={false}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== initialValue) {
          onConfirm(trimmed);
          return;
        }
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const trimmed = value.trim();
          if (trimmed && trimmed !== initialValue) {
            onConfirm(trimmed);
            return;
          }
          onCancel();
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      style={{
        flex: 1,
        minWidth: 0,
        height: 22,
        borderRadius: 6,
        border: '1px solid var(--color-accent-primary)',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        padding: '0 6px',
        fontSize: 12,
        fontFamily: 'inherit',
        outline: 'none',
      }}
    />
  );
};

interface TreeRowProps {
  node: ScanTreeNode;
  depth: number;
  selectedFolderPath: string;
  activeFilePath: string | null;
  expandedPaths: Set<string>;
  renamingPath: string | null;
  searchActive: boolean;
  activeRowRef: React.RefObject<HTMLDivElement | null>;
  dragState: DragState | null;
  dropTargetPath: string | null;
  onToggleExpanded: (path: string) => void;
  onSelectFolder: (folderPath: string) => void;
  onFileSelect: (filePath: string, fileName: string) => void;
  onStartRename: (path: string) => void;
  onConfirmRename: (oldPath: string, newName: string, isDirectory: boolean) => void;
  onCancelRename: () => void;
  onContextMenu: (event: React.MouseEvent, node: ScanTreeNode) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => void;
  onDragEnd: () => void;
  onDragOverFolder: (event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => void;
  onDropOnFolder: (event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  selectedFolderPath,
  activeFilePath,
  expandedPaths,
  renamingPath,
  searchActive,
  activeRowRef,
  dragState,
  dropTargetPath,
  onToggleExpanded,
  onSelectFolder,
  onFileSelect,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDropOnFolder,
}) => {
  const [hovered, setHovered] = useState(false);
  const isDirectory = node.isDirectory;
  const isExpanded = isDirectory ? (searchActive || expandedPaths.has(node.path)) : false;
  const isSelectedFolder = isDirectory && node.path === selectedFolderPath;
  const isActiveFile = !isDirectory && node.path === activeFilePath;
  const isRenaming = renamingPath === node.path;
  const isSelected = isSelectedFolder || isActiveFile;
  const isDropTarget = isDirectory && dropTargetPath === node.path;
  const isDraggingSelf = dragState?.path === node.path;
  const paddingLeft = 12 + depth * 16;
  const rowStyle = buildTreeRowStyle(isSelected);

  return (
    <>
      <div
        ref={isActiveFile ? activeRowRef : undefined}
        style={{
          ...rowStyle,
          paddingLeft: paddingLeft,
          background: isDropTarget
            ? 'color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-bg-selected))'
            : (hovered && !isSelected ? 'var(--color-tree-row-hover)' : rowStyle.background),
          opacity: isDraggingSelf ? 0.52 : 1,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (isDirectory) {
            onSelectFolder(node.path);
            return;
          }
          onFileSelect(node.path, node.name);
        }}
        onContextMenu={(event) => onContextMenu(event, node)}
        onDragOver={isDirectory ? (event) => onDragOverFolder(event, node) : undefined}
        onDrop={isDirectory ? (event) => onDropOnFolder(event, node) : undefined}
      >
        {isDirectory ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpanded(node.path);
            }}
            style={{
              ...iconButtonStyle,
              width: 18,
              height: 28,
              flexShrink: 0,
              color: 'var(--color-icon-chevron)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            title={isExpanded ? '收起文件夹' : '展开文件夹'}
          >
            <ChevronRight size={15} />
          </button>
        ) : (
          <div style={{ width: 18, flexShrink: 0 }} />
        )}

        {isDirectory ? (
          isExpanded ? (
            <FolderOpen size={14} style={{ color: 'var(--color-icon-folder)', flexShrink: 0 }} />
          ) : (
            <Folder size={14} style={{ color: 'var(--color-icon-folder)', flexShrink: 0 }} />
          )
        ) : (
          <FileText size={14} style={{ opacity: 0.72, flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {isRenaming ? (
            <InlineRename
              initialValue={isDirectory ? node.name : getDisplayName(node.name)}
              onConfirm={(newName) => onConfirmRename(node.path, newName, isDirectory)}
              onCancel={onCancelRename}
            />
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isDirectory ? node.name : getDisplayName(node.name)}
            </span>
          )}
        </div>

        {!isRenaming && (
          <div
            draggable
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onDragStart={(event) => onDragStart(event, node)}
            onDragEnd={onDragEnd}
            style={{
              ...dragHandleStyle,
              opacity: hovered || isSelected || isDraggingSelf ? 1 : 0.72,
            }}
            title={isDirectory ? '拖拽移动文件夹' : '拖拽移动笔记'}
          >
            <GripVertical size={13} />
          </div>
        )}
      </div>

      {isDirectory && isExpanded && node.children?.map((child) => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFolderPath={selectedFolderPath}
          activeFilePath={activeFilePath}
          expandedPaths={expandedPaths}
          renamingPath={renamingPath}
          searchActive={searchActive}
          activeRowRef={activeRowRef}
          dragState={dragState}
          dropTargetPath={dropTargetPath}
          onToggleExpanded={onToggleExpanded}
          onSelectFolder={onSelectFolder}
          onFileSelect={onFileSelect}
          onStartRename={onStartRename}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOverFolder={onDragOverFolder}
          onDropOnFolder={onDropOnFolder}
        />
      ))}
    </>
  );
};

const NoteFileList: React.FC<NoteFileListProps> = ({
  currentVault,
  vaults,
  noteDir,
  tree,
  selectedFolderPath,
  activeFilePath,
  requestedRenamePath,
  searchQuery,
  onSearchQueryChange,
  onVaultChange,
  onFileSelect,
  onSelectFolder,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onRename,
  onMoveNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(noteDir ? [noteDir] : []));
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedRenamePath) return;
    setRenamingPath(requestedRenamePath);
  }, [requestedRenamePath]);

  useEffect(() => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (noteDir) next.add(noteDir);
      return next;
    });
  }, [noteDir]);

  const autoExpandedPaths = useMemo(() => {
    if (!noteDir) return new Set<string>();
    const paths = new Set<string>([noteDir]);
    for (const path of getAncestors(selectedFolderPath, noteDir)) {
      paths.add(path);
    }
    if (activeFilePath) {
      for (const path of getAncestors(activeFilePath, noteDir)) {
        paths.add(path);
      }
    }
    return paths;
  }, [activeFilePath, noteDir, selectedFolderPath]);

  useEffect(() => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const path of autoExpandedPaths) {
        next.add(path);
      }
      return next;
    });
  }, [autoExpandedPaths, tree]);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeFilePath, searchQuery, tree]);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleConfirmRename = useCallback(async (oldPath: string, newName: string, isDirectory: boolean) => {
    if (isDirectory && (newName.includes('/') || newName.includes('\\'))) {
      window.alert('文件夹名称不能包含 / 或 \\');
      return;
    }

    const parentPath = getParentPath(oldPath);
    const nextName = isDirectory ? newName : (newName.endsWith('.md') ? newName : `${newName}.md`);
    const success = await onRename(oldPath, `${parentPath}/${nextName}`, isDirectory);

    if (success) {
      setRenamingPath(null);
    }
  }, [onRename]);

  const openContextMenu = useCallback((event: { clientX: number; clientY: number }, items: ContextMenuItem[]) => {
    const containerBounds = containerRef.current?.getBoundingClientRect();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items,
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

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const clearDragState = useCallback(() => {
    setDragState(null);
    setDropTargetPath(null);
  }, []);

  const handleCreateFolder = useCallback(async (targetDir?: string) => {
    const folderPath = await onCreateFolder(targetDir ?? selectedFolderPath);
    if (folderPath) {
      setExpandedPaths((prev) => new Set(prev).add(targetDir ?? selectedFolderPath));
      setRenamingPath(folderPath);
    }
  }, [onCreateFolder, selectedFolderPath]);

  const buildBlankMenuItems = useCallback((): ContextMenuItem[] => {
    const targetDir = selectedFolderPath || noteDir;
    return [
      {
        label: '新建笔记',
        onSelect: () => {
          onCreateNote(targetDir);
          closeContextMenu();
        },
      },
      {
        label: '新建文件夹',
        onSelect: async () => {
          await handleCreateFolder(targetDir);
          closeContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: '在 Finder 中显示',
        disabled: !noteDir,
        onSelect: () => {
          if (!noteDir) return;
          window.fileApi.showInFolder(noteDir);
          closeContextMenu();
        },
      },
    ];
  }, [closeContextMenu, handleCreateFolder, noteDir, onCreateNote, selectedFolderPath]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: ScanTreeNode) => {
    event.preventDefault();
    event.stopPropagation();

    const items: ContextMenuItem[] = node.isDirectory
      ? [
          {
            label: '新建笔记',
            onSelect: () => {
              onCreateNote(node.path);
              closeContextMenu();
            },
          },
          {
            label: '新建文件夹',
            onSelect: async () => {
              await handleCreateFolder(node.path);
              closeContextMenu();
            },
          },
          { type: 'separator' },
          {
            label: '重命名',
            onSelect: () => {
              setRenamingPath(node.path);
              closeContextMenu();
            },
          },
          {
            label: '删除',
            onSelect: () => {
              onDeleteNote(node.path, node.name, true);
              closeContextMenu();
            },
          },
          {
            label: '在 Finder 中显示',
            onSelect: () => {
              window.fileApi.showInFolder(node.path);
              closeContextMenu();
            },
          },
        ]
      : [
          {
            label: '打开',
            onSelect: () => {
              onFileSelect(node.path, node.name);
              closeContextMenu();
            },
          },
          {
            label: '重命名',
            onSelect: () => {
              setRenamingPath(node.path);
              closeContextMenu();
            },
          },
          {
            label: '删除',
            onSelect: () => {
              onDeleteNote(node.path, node.name, false);
              closeContextMenu();
            },
          },
          {
            label: '在 Finder 中显示',
            onSelect: () => {
              window.fileApi.showInFolder(node.path);
              closeContextMenu();
            },
          },
        ];

    openContextMenu(event, items);
  }, [closeContextMenu, handleCreateFolder, onCreateNote, onDeleteNote, onFileSelect, openContextMenu]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => {
    const nextDragState: DragState = {
      path: node.path,
      isDirectory: node.isDirectory,
    };

    closeContextMenu();
    setRenamingPath((prev) => (prev === node.path ? null : prev));
    setDragState(nextDragState);
    setDropTargetPath(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.path);
  }, [closeContextMenu]);

  const handleDragOverFolder = useCallback((event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => {
    if (!node.isDirectory) return;
    if (!canDropOnFolder(dragState, node.path)) {
      setDropTargetPath(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath(node.path);
  }, [dragState]);

  const handleDropOnFolder = useCallback(async (event: React.DragEvent<HTMLDivElement>, node: ScanTreeNode) => {
    if (!node.isDirectory || !dragState) return;

    event.preventDefault();
    event.stopPropagation();

    if (!canDropOnFolder(dragState, node.path)) {
      clearDragState();
      return;
    }

    const sourcePath = dragState.path;
    const isDirectory = dragState.isDirectory;
    const nextPath = buildMovedPath(sourcePath, node.path);

    clearDragState();
    const moved = await onMoveNode(sourcePath, node.path, isDirectory);
    if (!moved) return;

    setExpandedPaths((prev) => {
      const next = replaceExpandedPaths(prev, sourcePath, nextPath, isDirectory);
      next.add(noteDir);
      next.add(node.path);
      return next;
    });
  }, [clearDragState, dragState, noteDir, onMoveNode]);

  const filteredTree = useMemo(() => filterTreeByQuery(tree, searchQuery), [searchQuery, tree]);
  const isSearchActive = searchQuery.trim().length > 0;
  const visibleCount = countVisibleNotes(filteredTree);

  return (
    <div ref={containerRef} style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <select
              value={currentVault?.id ?? ''}
              onChange={(event) => onVaultChange(event.target.value)}
              style={{
                width: '100%',
                height: 34,
                borderRadius: 10,
                border: '1px solid var(--color-border-primary)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                padding: '0 10px',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {vaults.map((vault) => (
                <option key={vault.id} value={vault.id}>
                  {vault.name}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={noteDir}
            >
              {isSearchActive ? `${visibleCount} 条结果` : `${visibleCount} 条内容`} · {noteDir || '未选择 Vault'}
            </div>
          </div>

          <button
            onClick={() => onCreateNote(selectedFolderPath || noteDir)}
            style={iconButtonStyle}
            title="新建笔记"
          >
            <FilePlus size={15} />
          </button>
          <button
            onClick={() => {
              void handleCreateFolder(selectedFolderPath || noteDir);
            }}
            style={iconButtonStyle}
            title="新建文件夹"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              openContextMenu(
                { clientX: bounds.left, clientY: bounds.bottom + 4 },
                buildBlankMenuItems(),
              );
            }}
            style={iconButtonStyle}
            title="更多"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        <div style={searchBoxStyle}>
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            spellCheck={false}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索当前 Vault..."
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      <div
        style={treeScrollStyle}
        onDragOver={(event) => {
          if (!dragState) return;
          if (event.target === event.currentTarget) {
            setDropTargetPath(null);
          }
        }}
        onDragLeave={(event) => {
          if (!dragState) return;
          if (event.currentTarget === event.target) {
            setDropTargetPath(null);
          }
        }}
        onContextMenu={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          openContextMenu(event, buildBlankMenuItems());
        }}
      >
        <div
          style={{
            ...buildTreeRowStyle(selectedFolderPath === noteDir),
            paddingLeft: 12,
            background: dropTargetPath === noteDir
              ? 'color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-bg-selected))'
              : buildTreeRowStyle(selectedFolderPath === noteDir).background,
          }}
          onClick={() => onSelectFolder(noteDir)}
          onDragOver={(event) => {
            if (!canDropOnFolder(dragState, noteDir)) {
              setDropTargetPath(null);
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetPath(noteDir);
          }}
          onDrop={(event) => {
            if (!dragState) return;
            event.preventDefault();
            event.stopPropagation();
            void handleDropOnFolder(event, {
              name: currentVault?.name ?? '当前 Vault',
              path: noteDir,
              isDirectory: true,
              children: tree,
            });
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            const rootNode: ScanTreeNode = {
              name: currentVault?.name ?? '当前 Vault',
              path: noteDir,
              isDirectory: true,
              children: tree,
            };
            handleNodeContextMenu(event, rootNode);
          }}
        >
          <div style={{ width: 18, flexShrink: 0 }} />
          <FolderOpen size={14} style={{ color: 'var(--color-icon-folder)', flexShrink: 0 }} />
          {renamingPath === noteDir ? (
            <InlineRename
              initialValue={currentVault?.name ?? 'notes'}
              onConfirm={() => setRenamingPath(null)}
              onCancel={() => setRenamingPath(null)}
            />
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentVault?.name ?? '当前 Vault'}
            </span>
          )}
        </div>

        {filteredTree.length === 0 ? (
          <div
            style={{
              padding: '18px 14px',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
            }}
          >
            {isSearchActive ? '没有匹配的笔记。' : '这个 Vault 里还没有笔记内容，先新建一条吧。'}
          </div>
        ) : (
          filteredTree.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              selectedFolderPath={selectedFolderPath}
              activeFilePath={activeFilePath}
              expandedPaths={expandedPaths}
              renamingPath={renamingPath}
              searchActive={isSearchActive}
              activeRowRef={activeRowRef}
              dragState={dragState}
              dropTargetPath={dropTargetPath}
              onToggleExpanded={toggleExpanded}
              onSelectFolder={onSelectFolder}
              onFileSelect={onFileSelect}
              onStartRename={setRenamingPath}
              onConfirmRename={handleConfirmRename}
              onCancelRename={() => setRenamingPath(null)}
              onContextMenu={handleNodeContextMenu}
              onDragStart={handleDragStart}
              onDragEnd={clearDragState}
              onDragOverFolder={handleDragOverFolder}
              onDropOnFolder={handleDropOnFolder}
            />
          ))
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          bounds={contextMenu.bounds}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default NoteFileList;
