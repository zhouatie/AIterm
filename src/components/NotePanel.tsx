import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock3,
  FilePlus,
  FolderOpen,
  NotebookPen,
  Star,
  X,
} from 'lucide-react';
import type { ScanTreeNode } from '../preload';
import NoteEditor from './NoteEditor';
import NoteFileList from './NoteFileList';
import { resolveNoteDirectory, NOTE_DIRECTORY_CHANGED_EVENT } from '../utils/note-settings';
import * as autosave from '../utils/note-autosave';
import type { AutoSaveStatus } from '../utils/note-autosave';
import {
  cleanupWorkbenchState,
  readNoteWorkbenchState,
  RECENT_NOTES_LIMIT,
  removeWorkbenchPath,
  renameWorkbenchPath,
  saveNoteWorkbenchState,
  toggleFavoritePath,
  touchRecentNote,
  type NoteWorkbenchState,
  type NoteWorkbenchView,
} from '../utils/note-workbench-state';

interface NotePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CurrentNote {
  filePath: string;
  fileName: string;
  content: string;
}

interface NoteListItem {
  path: string;
  name: string;
  displayName: string;
  folderPath: string;
  mtime: number;
}

const panelContainerStyle = (isOpen: boolean): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  padding: 16,
  background: 'color-mix(in srgb, var(--color-bg-primary) 78%, transparent)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  opacity: isOpen ? 1 : 0,
  pointerEvents: isOpen ? 'auto' : 'none',
  transform: isOpen ? 'translateY(0)' : 'translateY(12px)',
  transition: 'opacity 240ms ease, transform 280ms ease',
});

const shellStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  borderRadius: 18,
  overflow: 'hidden',
  background: 'var(--color-surface-content)',
  border: '1px solid var(--color-border-primary)',
  boxShadow: '0 24px 80px color-mix(in srgb, var(--color-shadow) 64%, transparent)',
};

const headerButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  border: 'none',
  background: 'transparent',
  borderRadius: 8,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  padding: 0,
  transition: 'background 0.16s ease, color 0.16s ease, transform 0.16s ease',
};

const floatingCloseButtonStyle: React.CSSProperties = {
  ...headerButtonStyle,
  position: 'absolute',
  top: 14,
  right: 14,
  width: 32,
  height: 32,
  zIndex: 2,
  border: '1px solid var(--color-border-primary)',
  background: 'color-mix(in srgb, var(--color-surface-content) 88%, transparent)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: '0 10px 28px color-mix(in srgb, var(--color-shadow) 18%, transparent)',
};

const viewRailStyle: React.CSSProperties = {
  width: 58,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '14px 6px',
  borderRight: '1px solid var(--color-border-primary)',
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-primary) 10%, transparent) 0%, transparent 40%)',
};

const folderPaneStyle: React.CSSProperties = {
  width: 248,
  minWidth: 216,
  maxWidth: '26vw',
  flexShrink: 0,
  borderRight: '1px solid var(--color-border-primary)',
  overflow: 'hidden',
};

function getFileName(filePath: string): string {
  const index = filePath.lastIndexOf('/');
  return index >= 0 ? filePath.slice(index + 1) : filePath;
}

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

function normalizeTree(nodes: ScanTreeNode[]): ScanTreeNode[] {
  return nodes
    .map((node) => {
      if (node.isDirectory) {
        return {
          ...node,
          children: normalizeTree(node.children ?? []),
        };
      }

      return /\.md$/i.test(node.name) ? node : null;
    })
    .filter((node): node is ScanTreeNode => node !== null);
}

function collectFolderPaths(nodes: ScanTreeNode[], rootPath: string): Set<string> {
  const result = new Set<string>([rootPath]);

  const visit = (items: ScanTreeNode[]): void => {
    for (const node of items) {
      if (!node.isDirectory) continue;
      result.add(node.path);
      visit(node.children ?? []);
    }
  };

  visit(nodes);
  return result;
}

function collectNoteIndex(nodes: ScanTreeNode[], rootPath: string): Map<string, NoteListItem> {
  const result = new Map<string, NoteListItem>();

  const visit = (items: ScanTreeNode[], currentFolderPath: string): void => {
    for (const node of items) {
      if (node.isDirectory) {
        visit(node.children ?? [], node.path);
        continue;
      }

      result.set(node.path, {
        path: node.path,
        name: node.name,
        displayName: getDisplayName(node.name),
        folderPath: currentFolderPath,
        mtime: node.mtime ?? 0,
      });
    }
  };

  visit(nodes, rootPath);
  return result;
}

function statesEqual(a: NoteWorkbenchState, b: NoteWorkbenchState): boolean {
  if (
    a.activeView !== b.activeView
    || a.selectedFolderPath !== b.selectedFolderPath
    || a.currentNotePath !== b.currentNotePath
    || a.favorites.length !== b.favorites.length
    || a.recent.length !== b.recent.length
  ) {
    return false;
  }

  for (let index = 0; index < a.favorites.length; index += 1) {
    if (a.favorites[index] !== b.favorites[index]) return false;
  }

  for (let index = 0; index < a.recent.length; index += 1) {
    if (
      a.recent[index].path !== b.recent[index].path
      || a.recent[index].accessedAt !== b.recent[index].accessedAt
    ) {
      return false;
    }
  }

  return true;
}

const NotePanel: React.FC<NotePanelProps> = ({ isOpen, onClose }) => {
  const [noteDir, setNoteDir] = useState('');
  const [tree, setTree] = useState<ScanTreeNode[]>([]);
  const [workspaceState, setWorkspaceState] = useState<NoteWorkbenchState>(() => {
    const stored = readNoteWorkbenchState();
    return {
      ...stored,
      selectedFolderPath: stored.selectedFolderPath ?? null,
    };
  });
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusEditorPath, setFocusEditorPath] = useState<string | null>(null);
  const [pendingRenamePath, setPendingRenamePath] = useState<string | null>(null);
  const initialized = useRef(false);
  const currentNoteRef = useRef<CurrentNote | null>(null);

  useEffect(() => {
    currentNoteRef.current = currentNote;
  }, [currentNote]);

  const updateWorkspaceState = useCallback((updater: (prev: NoteWorkbenchState) => NoteWorkbenchState) => {
    setWorkspaceState((prev) => {
      const next = updater(prev);
      if (statesEqual(prev, next)) return prev;
      saveNoteWorkbenchState(next);
      return next;
    });
  }, []);

  const loadTree = useCallback(async (rootPath: string) => {
    const result = await window.fileApi.scanNotes(rootPath);
    if (result.error) {
      console.error('[NotePanel] Failed to scan notes:', result.error);
      return;
    }

    setTree(normalizeTree(result.tree ?? []));
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      const dir = await resolveNoteDirectory();
      await window.fileApi.ensureDir(dir);
      setNoteDir(dir);
      await loadTree(dir);
    })();

    autosave.startGlobalHandlers();
    return () => {
      autosave.stopGlobalHandlers();
    };
  }, [loadTree]);

  useEffect(() => {
    const handler = () => {
      void (async () => {
        const dir = await resolveNoteDirectory();
        await window.fileApi.ensureDir(dir);
        if (currentNoteRef.current) {
          autosave.flush(currentNoteRef.current.filePath);
          autosave.unregisterFile(currentNoteRef.current.filePath);
          setCurrentNote(null);
          setSaveStatus('saved');
        }
        setNoteDir(dir);
        setPendingRenamePath(null);
        await loadTree(dir);
      })();
    };

    window.addEventListener(NOTE_DIRECTORY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(NOTE_DIRECTORY_CHANGED_EVENT, handler);
  }, [loadTree]);

  useEffect(() => {
    if (!isOpen) {
      autosave.flushAll();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = autosave.subscribeStatus((filePath, status) => {
      if (currentNoteRef.current?.filePath === filePath) {
        setSaveStatus(status);
      }
    });

    return unsubscribe;
  }, []);

  const noteIndex = useMemo(() => collectNoteIndex(tree, noteDir), [tree, noteDir]);
  const folderPaths = useMemo(() => collectFolderPaths(tree, noteDir), [tree, noteDir]);

  useEffect(() => {
    if (!noteDir) return;

    const nextState = cleanupWorkbenchState(workspaceState, new Set(noteIndex.keys()), folderPaths);
    const selectedFolderPath = nextState.selectedFolderPath ?? noteDir;
    const normalized = {
      ...nextState,
      selectedFolderPath,
    };

    if (!statesEqual(workspaceState, normalized)) {
      updateWorkspaceState(() => normalized);
    }
  }, [folderPaths, noteDir, noteIndex, updateWorkspaceState, workspaceState]);

  const selectedFolderPath = workspaceState.selectedFolderPath ?? noteDir;

  const allNotes = useMemo(
    () => Array.from(noteIndex.values()).sort(
      (a, b) => a.folderPath.localeCompare(b.folderPath) || a.name.localeCompare(b.name),
    ),
    [noteIndex],
  );

  const favoriteNotes = useMemo(
    () => workspaceState.favorites
      .map((path) => noteIndex.get(path))
      .filter((item): item is NoteListItem => Boolean(item)),
    [noteIndex, workspaceState.favorites],
  );

  const recentNotes = useMemo(
    () => workspaceState.recent
      .map((entry) => {
        const item = noteIndex.get(entry.path);
        return item ? { ...item, mtime: entry.accessedAt } : null;
      })
      .filter((item): item is NoteListItem => Boolean(item))
      .slice(0, RECENT_NOTES_LIMIT),
    [noteIndex, workspaceState.recent],
  );

  const currentViewNotes = useMemo(() => {
    if (workspaceState.activeView === 'recent') return recentNotes;
    if (workspaceState.activeView === 'favorites') return favoriteNotes;
    return allNotes;
  }, [allNotes, favoriteNotes, recentNotes, workspaceState.activeView]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return currentViewNotes;
    return currentViewNotes.filter((item) => item.displayName.toLowerCase().includes(query));
  }, [currentViewNotes, searchQuery]);

  const currentNoteMeta = currentNote ? noteIndex.get(currentNote.filePath) ?? {
    path: currentNote.filePath,
    name: currentNote.fileName,
    displayName: getDisplayName(currentNote.fileName),
    folderPath: getParentPath(currentNote.filePath),
    mtime: 0,
  } : null;

  const openNote = useCallback(async (
    filePath: string,
    fileName?: string,
    options?: { focusEditor?: boolean; touchRecent?: boolean; syncState?: boolean },
  ) => {
    const prevNote = currentNoteRef.current;

    if (prevNote?.filePath === filePath) {
      setFocusEditorPath(options?.focusEditor ? filePath : null);
      if (options?.touchRecent !== false) {
        updateWorkspaceState((prev) => touchRecentNote({ ...prev, currentNotePath: filePath }, filePath));
      }
      return;
    }

    if (prevNote) {
      autosave.flush(prevNote.filePath);
    }

    const result = await window.fileApi.readFile(filePath);
    if (result.error) {
      console.error('[NotePanel] Failed to read note:', result.error);
      return;
    }

    if (prevNote) {
      autosave.unregisterFile(prevNote.filePath);
    }

    const content = result.content ?? '';
    const nextFileName = fileName ?? getFileName(filePath);

    autosave.registerFile(filePath, content);
    setCurrentNote({
      filePath,
      fileName: nextFileName,
      content,
    });
    setSaveStatus(autosave.getStatus(filePath));
    setFocusEditorPath(options?.focusEditor ? filePath : null);

    if (options?.syncState !== false) {
      updateWorkspaceState((prev) => touchRecentNote({ ...prev, currentNotePath: filePath }, filePath));
    }
  }, [updateWorkspaceState]);

  useEffect(() => {
    if (!noteDir || !workspaceState.currentNotePath) return;
    if (currentNote?.filePath === workspaceState.currentNotePath) return;

    if (!noteIndex.has(workspaceState.currentNotePath)) {
      return;
    }

    void openNote(workspaceState.currentNotePath, undefined, {
      focusEditor: false,
      touchRecent: false,
      syncState: false,
    });
  }, [currentNote?.filePath, noteDir, noteIndex, openNote, workspaceState.currentNotePath]);

  useEffect(() => {
    if (workspaceState.currentNotePath) return;
    if (!currentNote) return;

    autosave.unregisterFile(currentNote.filePath);
    setCurrentNote(null);
    setSaveStatus('saved');
  }, [currentNote, workspaceState.currentNotePath]);

  const setCurrentView = useCallback((view: NoteWorkbenchView) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      activeView: view,
    }));
    setSearchQuery('');
  }, [updateWorkspaceState]);

  const handleSelectFolder = useCallback((folderPath: string) => {
    updateWorkspaceState((prev) => ({
      ...prev,
      selectedFolderPath: folderPath,
    }));
  }, [updateWorkspaceState]);

  const createNote = useCallback(async (inDir?: string) => {
    const targetDir = inDir || selectedFolderPath || noteDir;
    if (!targetDir) return;

    let name = '未命名';
    let suffix = 0;
    let filePath = `${targetDir}/${name}.md`;

    while (true) {
      const result = await window.fileApi.readFile(filePath);
      if (result.error) break;
      suffix += 1;
      name = `未命名-${suffix}`;
      filePath = `${targetDir}/${name}.md`;
    }

    const writeResult = await window.fileApi.writeFile(filePath, '');
    if (writeResult.error) {
      window.alert(writeResult.error);
      return;
    }

    updateWorkspaceState((prev) => ({
      ...prev,
      selectedFolderPath: targetDir,
    }));
    await loadTree(noteDir);
    await openNote(filePath, `${name}.md`, { focusEditor: true });
  }, [loadTree, noteDir, openNote, selectedFolderPath, updateWorkspaceState]);

  const createFolder = useCallback(async (inDir?: string): Promise<string | null> => {
    const targetDir = inDir || selectedFolderPath || noteDir;
    if (!targetDir) return null;

    let name = '新建文件夹';
    let suffix = 0;
    let folderPath = `${targetDir}/${name}`;

    while (true) {
      const result = await window.fileApi.readDir(folderPath);
      if (result.error) break;
      suffix += 1;
      name = `新建文件夹-${suffix}`;
      folderPath = `${targetDir}/${name}`;
    }

    const ensureResult = await window.fileApi.ensureDir(folderPath);
    if (ensureResult.error) {
      window.alert(ensureResult.error);
      return null;
    }

    updateWorkspaceState((prev) => ({
      ...prev,
      activeView: 'all',
      selectedFolderPath: folderPath,
    }));
    setPendingRenamePath(folderPath);
    await loadTree(noteDir);
    return folderPath;
  }, [loadTree, noteDir, selectedFolderPath, updateWorkspaceState]);

  const handleRename = useCallback(async (oldPath: string, newPath: string, isDirectory: boolean): Promise<boolean> => {
    const prevNote = currentNoteRef.current;
    const affectsCurrent = prevNote
      ? (prevNote.filePath === oldPath || (isDirectory && prevNote.filePath.startsWith(oldPath + '/')))
      : false;

    if (affectsCurrent && prevNote) {
      autosave.flush(prevNote.filePath);
    }

    const result = await window.fileApi.rename(oldPath, newPath);
    if (result.error) {
      window.alert(result.error);
      return false;
    }

    updateWorkspaceState((prev) => renameWorkbenchPath(prev, oldPath, newPath, isDirectory));

    if (affectsCurrent && prevNote) {
      const nextPath = isDirectory
        ? newPath + prevNote.filePath.slice(oldPath.length)
        : newPath;
      autosave.unregisterFile(prevNote.filePath);
      autosave.registerFile(nextPath, prevNote.content);
      setCurrentNote({
        ...prevNote,
        filePath: nextPath,
        fileName: getFileName(nextPath),
      });
      setSaveStatus(autosave.getStatus(nextPath));
      setFocusEditorPath(nextPath);
    }

    await loadTree(noteDir);
    setPendingRenamePath(null);
    return true;
  }, [loadTree, noteDir, updateWorkspaceState]);

  const handleDelete = useCallback(async (filePath: string, _fileName: string, isDirectory: boolean) => {
    const confirmed = window.confirm(
      isDirectory
        ? '确定要删除这个文件夹及其所有内容吗？此操作不可撤销。'
        : '确定要删除这个笔记吗？此操作不可撤销。',
    );
    if (!confirmed) return;

    const isCurrentDeleted = currentNoteRef.current
      ? (currentNoteRef.current.filePath === filePath
        || (isDirectory && currentNoteRef.current.filePath.startsWith(filePath + '/')))
      : false;

    const sourceList = visibleNotes.length > 0 ? visibleNotes : currentViewNotes;
    const currentIndex = currentNoteRef.current
      ? sourceList.findIndex((item) => item.path === currentNoteRef.current?.filePath)
      : -1;
    const fallbackCandidates = sourceList.filter((item) => {
      if (isDirectory) return !item.path.startsWith(filePath + '/');
      return item.path !== filePath;
    });
    const fallbackNote = currentIndex >= 0
      ? fallbackCandidates[Math.min(currentIndex, fallbackCandidates.length - 1)] ?? null
      : fallbackCandidates[0] ?? null;

    if (isCurrentDeleted && currentNoteRef.current) {
      autosave.flush(currentNoteRef.current.filePath);
    }

    const result = await window.fileApi.deleteFile(filePath);
    if (result.error) {
      window.alert(result.error);
      return;
    }

    updateWorkspaceState((prev) => removeWorkbenchPath(prev, filePath, isDirectory));
    await loadTree(noteDir);

    if (isCurrentDeleted) {
      if (currentNoteRef.current) {
        autosave.unregisterFile(currentNoteRef.current.filePath);
      }
      setCurrentNote(null);
      setSaveStatus('saved');
      if (fallbackNote) {
        await openNote(fallbackNote.path, fallbackNote.name, { focusEditor: false });
      } else {
        updateWorkspaceState((prev) => ({
          ...prev,
          currentNotePath: null,
        }));
      }
    }
  }, [currentViewNotes, loadTree, noteDir, openNote, updateWorkspaceState, visibleNotes]);

  const toggleFavorite = useCallback(() => {
    if (!currentNote) return;
    updateWorkspaceState((prev) => toggleFavoritePath(prev, currentNote.filePath));
  }, [currentNote, updateWorkspaceState]);

  const handleContentChange = useCallback((markdown: string) => {
    setCurrentNote((prev) => {
      if (!prev) return prev;
      autosave.onContentChange(prev.filePath, markdown);
      return {
        ...prev,
        content: markdown,
      };
    });
  }, []);

  const isFavorite = currentNote ? workspaceState.favorites.includes(currentNote.filePath) : false;

  const viewConfigs: Array<{
    id: NoteWorkbenchView;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = [
    {
      id: 'recent',
      label: '最近',
      icon: <Clock3 size={16} />,
      count: recentNotes.length,
    },
    {
      id: 'favorites',
      label: '收藏',
      icon: <Star size={16} />,
      count: favoriteNotes.length,
    },
    {
      id: 'all',
      label: '全部',
      icon: <FolderOpen size={16} />,
      count: allNotes.length,
    },
  ];

  const statusLabel = saveStatus === 'editing'
    ? '编辑中'
    : saveStatus === 'saving'
      ? '保存中'
      : '已保存';

  return (
    <div style={panelContainerStyle(isOpen)}>
      <div style={shellStyle}>
        <button
          onClick={onClose}
          style={floatingCloseButtonStyle}
          title="关闭笔记面板"
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={viewRailStyle}>
            {viewConfigs.map((view) => {
              const active = workspaceState.activeView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    padding: 0,
                    margin: '0 auto',
                    borderRadius: 12,
                    border: active ? '1px solid var(--color-border-primary)' : '1px solid transparent',
                    background: active ? 'var(--color-surface-content-elevated)' : 'transparent',
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.16s ease, border-color 0.16s ease, color 0.16s ease',
                  }}
                  title={`${view.label} (${view.count})`}
                >
                  <span style={{ opacity: active ? 1 : 0.72 }}>{view.icon}</span>
                </button>
              );
            })}
          </div>

          <div style={folderPaneStyle}>
            {noteDir && (
              <NoteFileList
                noteDir={noteDir}
                tree={tree}
                activeView={workspaceState.activeView}
                selectedFolderPath={selectedFolderPath}
                activeFilePath={currentNote?.filePath ?? null}
                requestedRenamePath={pendingRenamePath}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                recentNotes={recentNotes}
                favoriteNotes={favoriteNotes}
                allNoteCount={allNotes.length}
                onSelectFolder={handleSelectFolder}
                onFileSelect={(filePath, fileName) => {
                  void openNote(filePath, fileName, { focusEditor: false });
                }}
                onCreateNote={createNote}
                onCreateFolder={createFolder}
                onDeleteNote={handleDelete}
                onRename={handleRename}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {currentNote && currentNoteMeta ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--color-border-primary)',
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-primary) 6%, transparent) 0%, transparent 100%)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {currentNoteMeta.displayName}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <span>{getRelativePath(currentNoteMeta.folderPath, noteDir)}</span>
                      <span>·</span>
                      <span>{statusLabel}</span>
                    </div>
                  </div>

                  <button
                    onClick={toggleFavorite}
                    style={{
                      ...headerButtonStyle,
                      color: isFavorite ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                      background: isFavorite ? 'var(--color-bg-selected)' : 'transparent',
                    }}
                    title={isFavorite ? '取消收藏' : '收藏这条笔记'}
                  >
                    <Star size={16} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
                  </button>
                </div>

                <NoteEditor
                  key={currentNote.filePath}
                  content={currentNote.content}
                  fileKey={currentNote.filePath}
                  onContentChange={handleContentChange}
                  autoFocus={focusEditorPath === currentNote.filePath}
                />
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 18,
                  color: 'var(--color-text-muted)',
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <NotebookPen size={44} style={{ opacity: 0.34 }} />
                <div>
                  <div style={{ fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>开始写一条新笔记</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                    从左侧导航树里打开笔记，
                    <br />
                    也可以直接新建一条开始记录。
                  </div>
                </div>
                <button
                  onClick={() => { void createNote(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--color-border-primary)',
                    background: 'var(--color-surface-content-elevated)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <FilePlus size={15} />
                  新建笔记
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotePanel;
