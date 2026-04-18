import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FilePlus, FileText, Folder, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { ScanTreeNode } from '../preload';
import type { NoteWorkbenchView } from '../utils/note-workbench-state';

interface NavigationNoteItem {
  path: string;
  name: string;
  displayName: string;
  folderPath: string;
  mtime: number;
}

interface NoteFileListProps {
  noteDir: string;
  tree: ScanTreeNode[];
  activeView: NoteWorkbenchView;
  selectedFolderPath: string;
  activeFilePath: string | null;
  requestedRenamePath: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  recentNotes: NavigationNoteItem[];
  favoriteNotes: NavigationNoteItem[];
  allNoteCount: number;
  onSelectFolder: (folderPath: string) => void;
  onFileSelect: (filePath: string, fileName: string) => void;
  onCreateNote: (inDir?: string) => void;
  onCreateFolder: (inDir?: string) => Promise<string | null>;
  onDeleteNote: (filePath: string, fileName: string, isDirectory: boolean) => void;
  onRename: (oldPath: string, newPath: string, isDirectory: boolean) => Promise<boolean>;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  background: 'var(--color-bg-secondary)',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  padding: '12px 12px 10px',
  borderBottom: '1px solid var(--color-border-primary)',
};

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  background: 'transparent',
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  padding: 0,
  transition: 'background 0.16s ease, color 0.16s ease',
};

const treeScrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '6px 0 12px',
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 32,
  padding: '0 10px',
  borderRadius: 9,
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-primary)',
};

const actionButtonBaseStyle: React.CSSProperties = {
  ...iconButtonStyle,
  width: 20,
  height: 20,
  opacity: 0,
  pointerEvents: 'none',
  flexShrink: 0,
  transition: 'opacity 0.15s ease, background 0.15s ease, color 0.15s ease',
};

function getDisplayName(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

function getParentPath(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(0, idx) : filePath;
}

function getBaseName(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
}

function getRelativePath(targetPath: string, rootPath: string): string {
  if (targetPath === rootPath) return '根目录';
  if (!targetPath.startsWith(rootPath + '/')) return targetPath;
  return targetPath.slice(rootPath.length + 1);
}

function formatTimeLabel(timestamp: number): string {
  if (!timestamp) return '未知时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
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

function countVisibleNotes(nodes: ScanTreeNode[]): number {
  return nodes.reduce((count, node) => {
    if (!node.isDirectory) return count + 1;
    return count + countVisibleNotes(node.children ?? []);
  }, 0);
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
        borderRadius: 5,
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

function buildTreeRowStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 30,
    paddingRight: 10,
    borderLeft: selected ? '3px solid var(--color-tree-indicator)' : '3px solid transparent',
    borderRadius: 8,
    color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: selected ? 'var(--color-bg-selected)' : 'transparent',
    boxShadow: selected ? 'var(--shadow-tree-row-hover)' : 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 150ms ease, box-shadow 150ms ease, color 0.16s ease',
  };
}

function buildHoverHandlers(selected: boolean, setHovered: (next: boolean) => void) {
  return {
    onMouseEnter: (event: React.MouseEvent<HTMLDivElement>) => {
      setHovered(true);
      if (!selected) {
        event.currentTarget.style.background = 'var(--color-tree-row-hover)';
        event.currentTarget.style.boxShadow = 'var(--shadow-tree-row-hover)';
      }
    },
    onMouseLeave: (event: React.MouseEvent<HTMLDivElement>) => {
      setHovered(false);
      if (!selected) {
        event.currentTarget.style.background = 'transparent';
        event.currentTarget.style.boxShadow = 'none';
      }
    },
  };
}

interface TreeRowProps {
  node: ScanTreeNode;
  depth: number;
  selectedFolderPath: string;
  activeFilePath: string | null;
  expandedPaths: Set<string>;
  renamingPath: string | null;
  searchActive: boolean;
  onToggleExpanded: (path: string) => void;
  onSelectFolder: (folderPath: string) => void;
  onFileSelect: (filePath: string, fileName: string) => void;
  onStartRename: (path: string) => void;
  onConfirmRename: (oldPath: string, newName: string, isDirectory: boolean) => void;
  onCancelRename: () => void;
  onCreateNote: (inDir?: string) => void;
  onDeleteNote: (filePath: string, fileName: string, isDirectory: boolean) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  selectedFolderPath,
  activeFilePath,
  expandedPaths,
  renamingPath,
  searchActive,
  onToggleExpanded,
  onSelectFolder,
  onFileSelect,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onCreateNote,
  onDeleteNote,
}) => {
  const [hovered, setHovered] = useState(false);
  const isDirectory = node.isDirectory;
  const isExpanded = isDirectory ? (searchActive || expandedPaths.has(node.path)) : false;
  const isSelectedFolder = isDirectory && node.path === selectedFolderPath;
  const isActiveFile = !isDirectory && node.path === activeFilePath;
  const isRenaming = renamingPath === node.path;
  const isSelected = isSelectedFolder || isActiveFile;
  const showActions = hovered || isSelected;
  const paddingLeft = 12 + depth * 16;

  return (
    <>
      <div
        style={{
          ...buildTreeRowStyle(isSelected),
          paddingLeft: Math.max(9, paddingLeft - 3),
        }}
        {...buildHoverHandlers(isSelected, setHovered)}
        onClick={() => {
          if (isDirectory) {
            onSelectFolder(node.path);
            if (!searchActive) {
              onToggleExpanded(node.path);
            }
            return;
          }
          onFileSelect(node.path, node.name);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartRename(node.path);
        }}
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

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
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

        {!isRenaming && isDirectory && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onCreateNote(node.path);
            }}
            style={{
              ...actionButtonBaseStyle,
              opacity: showActions ? 1 : 0,
              pointerEvents: showActions ? 'auto' : 'none',
            }}
            title="在此文件夹新建笔记"
          >
            <FilePlus size={13} />
          </button>
        )}

        {!isRenaming && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDeleteNote(node.path, node.name, isDirectory);
            }}
            style={{
              ...actionButtonBaseStyle,
              opacity: showActions ? 1 : 0,
              pointerEvents: showActions ? 'auto' : 'none',
            }}
            title={isDirectory ? '删除文件夹' : '删除笔记'}
          >
            <Trash2 size={13} />
          </button>
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
          onToggleExpanded={onToggleExpanded}
          onSelectFolder={onSelectFolder}
          onFileSelect={onFileSelect}
          onStartRename={onStartRename}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
          onCreateNote={onCreateNote}
          onDeleteNote={onDeleteNote}
        />
      ))}
    </>
  );
};

interface FlatNoteRowProps {
  item: NavigationNoteItem;
  noteDir: string;
  activeFilePath: string | null;
  renamingPath: string | null;
  onFileSelect: (filePath: string, fileName: string) => void;
  onStartRename: (path: string) => void;
  onConfirmRename: (oldPath: string, newName: string, isDirectory: boolean) => void;
  onCancelRename: () => void;
  onDeleteNote: (filePath: string, fileName: string, isDirectory: boolean) => void;
}

const FlatNoteRow: React.FC<FlatNoteRowProps> = ({
  item,
  noteDir,
  activeFilePath,
  renamingPath,
  onFileSelect,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDeleteNote,
}) => {
  const [hovered, setHovered] = useState(false);
  const isSelected = item.path === activeFilePath;
  const isRenaming = renamingPath === item.path;
  const showActions = hovered || isSelected;

  return (
    <div
      style={{
        ...buildTreeRowStyle(isSelected),
        alignItems: 'flex-start',
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 9,
      }}
      {...buildHoverHandlers(isSelected, setHovered)}
      onClick={() => onFileSelect(item.path, item.name)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStartRename(item.path);
      }}
    >
      <div style={{ width: 18, flexShrink: 0 }} />
      <FileText size={14} style={{ opacity: 0.72, flexShrink: 0, marginTop: 2 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {isRenaming ? (
          <InlineRename
            initialValue={item.displayName}
            onConfirm={(newName) => onConfirmRename(item.path, newName, false)}
            onCancel={onCancelRename}
          />
        ) : (
          <>
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text-primary)',
              }}
            >
              {item.displayName}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${getRelativePath(item.folderPath, noteDir)} · ${formatTimeLabel(item.mtime)}`}
            >
              {getRelativePath(item.folderPath, noteDir)} · {formatTimeLabel(item.mtime)}
            </div>
          </>
        )}
      </div>

      {!isRenaming && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDeleteNote(item.path, item.name, false);
          }}
          style={{
            ...actionButtonBaseStyle,
            opacity: showActions ? 1 : 0,
            pointerEvents: showActions ? 'auto' : 'none',
            marginTop: 1,
          }}
          title="删除笔记"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
};

const NoteFileList: React.FC<NoteFileListProps> = ({
  noteDir,
  tree,
  activeView,
  selectedFolderPath,
  activeFilePath,
  requestedRenamePath,
  searchQuery,
  onSearchQueryChange,
  recentNotes,
  favoriteNotes,
  allNoteCount,
  onSelectFolder,
  onFileSelect,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onRename,
}) => {
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set([noteDir]));

  useEffect(() => {
    if (!requestedRenamePath) return;
    setRenamingPath(requestedRenamePath);
  }, [requestedRenamePath]);

  const autoExpandedPaths = useMemo(() => {
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
      next.add(noteDir);
      for (const path of autoExpandedPaths) {
        next.add(path);
      }
      return next;
    });
  }, [autoExpandedPaths, noteDir, tree]);

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

  const handleCreateFolder = useCallback(async () => {
    const folderPath = await onCreateFolder(selectedFolderPath);
    if (folderPath) {
      setExpandedPaths((prev) => new Set(prev).add(selectedFolderPath));
      setRenamingPath(folderPath);
    }
  }, [onCreateFolder, selectedFolderPath]);

  const isSearchActive = searchQuery.trim().length > 0;
  const filteredTree = useMemo(
    () => (activeView === 'all' ? filterTreeByQuery(tree, searchQuery) : []),
    [activeView, searchQuery, tree],
  );
  const flatItems = useMemo(() => {
    const source = activeView === 'recent' ? recentNotes : favoriteNotes;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) => item.displayName.toLowerCase().includes(query));
  }, [activeView, favoriteNotes, recentNotes, searchQuery]);

  const viewTitle = activeView === 'recent'
    ? '最近'
    : activeView === 'favorites'
      ? '收藏'
      : '全部';
  const resultCount = activeView === 'recent'
    ? recentNotes.length
    : activeView === 'favorites'
      ? favoriteNotes.length
      : allNoteCount;
  const visibleCount = activeView === 'all' ? countVisibleNotes(filteredTree) : flatItems.length;

  return (
    <div style={containerStyle}>
      <div style={sectionHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{viewTitle}</div>
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={noteDir}
            >
              {isSearchActive ? `${visibleCount} 条结果` : `${resultCount} 条内容`} · {getBaseName(noteDir) || noteDir}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onCreateNote(selectedFolderPath)}
              style={iconButtonStyle}
              title="新建笔记"
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={() => { void handleCreateFolder(); }}
              style={iconButtonStyle}
              title="新建文件夹"
            >
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        <div style={searchBoxStyle}>
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            spellCheck={false}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索当前视图..."
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

      <div style={treeScrollStyle}>
        {activeView === 'all' && (
          <div
            style={{
              ...buildTreeRowStyle(selectedFolderPath === noteDir),
              minHeight: 30,
              paddingLeft: 9,
            }}
            onClick={() => onSelectFolder(noteDir)}
            onMouseEnter={(event) => {
              if (selectedFolderPath !== noteDir) {
                event.currentTarget.style.background = 'var(--color-tree-row-hover)';
                event.currentTarget.style.boxShadow = 'var(--shadow-tree-row-hover)';
              }
            }}
            onMouseLeave={(event) => {
              if (selectedFolderPath !== noteDir) {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={{ width: 18, flexShrink: 0 }} />
            <FolderOpen size={14} style={{ color: 'var(--color-icon-folder)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>全部目录</span>
          </div>
        )}

        {activeView === 'all' ? (
          filteredTree.length === 0 ? (
            <div
              style={{
                padding: '18px 14px',
                fontSize: 12,
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}
            >
              {isSearchActive ? '没有匹配的笔记。' : '还没有笔记内容，先新建一条吧。'}
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
                onToggleExpanded={toggleExpanded}
                onSelectFolder={onSelectFolder}
                onFileSelect={onFileSelect}
                onStartRename={setRenamingPath}
                onConfirmRename={handleConfirmRename}
                onCancelRename={() => setRenamingPath(null)}
                onCreateNote={onCreateNote}
                onDeleteNote={onDeleteNote}
              />
            ))
          )
        ) : flatItems.length === 0 ? (
          <div
            style={{
              padding: '18px 14px',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
            }}
          >
            {isSearchActive ? '没有匹配的笔记。' : `这个${viewTitle}视图里还没有内容。`}
          </div>
        ) : (
          flatItems.map((item) => (
            <FlatNoteRow
              key={item.path}
              item={item}
              noteDir={noteDir}
              activeFilePath={activeFilePath}
              renamingPath={renamingPath}
              onFileSelect={onFileSelect}
              onStartRename={setRenamingPath}
              onConfirmRename={handleConfirmRename}
              onCancelRename={() => setRenamingPath(null)}
              onDeleteNote={onDeleteNote}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NoteFileList;
