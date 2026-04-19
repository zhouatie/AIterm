import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus, NotebookPen, X } from 'lucide-react';
import type { ScanTreeNode } from '../preload';
import NoteEditor from './NoteEditor';
import NoteFileList from './NoteFileList';
import {
  getActiveNoteVault,
  readNoteVaultSettings,
  resolveNoteVaultSettings,
  saveNoteVaultSettings,
  NOTE_DIRECTORY_CHANGED_EVENT,
  type NoteVaultSettings,
} from '../utils/note-settings';
import * as autosave from '../utils/note-autosave';
import type { AutoSaveStatus } from '../utils/note-autosave';
import {
  cleanupWorkbenchState,
  getVaultWorkbenchState,
  readNoteWorkbenchState,
  removeWorkbenchPath,
  renameWorkbenchPath,
  saveNoteWorkbenchState,
  updateVaultWorkbenchState,
  type NoteWorkbenchState,
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

const explorerPaneStyle: React.CSSProperties = {
  width: 288,
  minWidth: 240,
  maxWidth: '32vw',
  flexShrink: 0,
  borderRight: '1px solid var(--color-border-primary)',
  overflow: 'hidden',
};

function getFileName(filePath: string): string {
  const index = filePath.lastIndexOf('/');
  return index >= 0 ? filePath.slice(index + 1) : filePath;
}

function joinPath(parentPath: string, name: string): string {
  return `${parentPath.replace(/\/+$/, '')}/${name}`;
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
  return JSON.stringify(a) === JSON.stringify(b);
}

const NotePanel: React.FC<NotePanelProps> = ({ isOpen, onClose }) => {
  const [vaultSettings, setVaultSettings] = useState<NoteVaultSettings>(readNoteVaultSettings);
  const [tree, setTree] = useState<ScanTreeNode[]>([]);
  const [workspaceState, setWorkspaceState] = useState<NoteWorkbenchState>(readNoteWorkbenchState);
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusEditorPath, setFocusEditorPath] = useState<string | null>(null);
  const [pendingRenamePath, setPendingRenamePath] = useState<string | null>(null);
  const initialized = useRef(false);
  const currentNoteRef = useRef<CurrentNote | null>(null);

  const activeVault = useMemo(() => getActiveNoteVault(vaultSettings), [vaultSettings]);
  const activeVaultId = activeVault?.id ?? null;
  const noteDir = activeVault?.rootPath ?? '';

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

  const reloadVaultState = useCallback(async (options?: { resetCurrentNote?: boolean; resetSearch?: boolean }) => {
    const settings = await resolveNoteVaultSettings();
    const vault = getActiveNoteVault(settings);

    if (options?.resetCurrentNote !== false && currentNoteRef.current) {
      autosave.flush(currentNoteRef.current.filePath);
      autosave.unregisterFile(currentNoteRef.current.filePath);
      setCurrentNote(null);
      setSaveStatus('saved');
    }

    setVaultSettings(settings);
    setPendingRenamePath(null);
    if (options?.resetSearch !== false) {
      setSearchQuery('');
    }

    if (!vault) {
      setTree([]);
      return;
    }

    await window.fileApi.ensureDir(vault.rootPath);
    await loadTree(vault.rootPath);
  }, [loadTree]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void reloadVaultState({ resetCurrentNote: false, resetSearch: false });

    autosave.startGlobalHandlers();
    return () => {
      autosave.stopGlobalHandlers();
    };
  }, [reloadVaultState]);

  useEffect(() => {
    const handler = () => {
      void reloadVaultState({ resetCurrentNote: true, resetSearch: true });
    };

    window.addEventListener(NOTE_DIRECTORY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(NOTE_DIRECTORY_CHANGED_EVENT, handler);
  }, [reloadVaultState]);

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
    if (!activeVaultId || !noteDir) return;

    const cleaned = cleanupWorkbenchState(workspaceState, activeVaultId, new Set(noteIndex.keys()), folderPaths);
    const normalized = updateVaultWorkbenchState(cleaned, activeVaultId, (prev) => ({
      ...prev,
      selectedFolderPath: prev.selectedFolderPath ?? noteDir,
    }));

    if (!statesEqual(workspaceState, normalized)) {
      updateWorkspaceState(() => normalized);
    }
  }, [activeVaultId, folderPaths, noteDir, noteIndex, updateWorkspaceState, workspaceState]);

  const vaultWorkbenchState = useMemo(
    () => (activeVaultId ? getVaultWorkbenchState(workspaceState, activeVaultId) : { selectedFolderPath: null, currentNotePath: null }),
    [activeVaultId, workspaceState],
  );

  const selectedFolderPath = vaultWorkbenchState.selectedFolderPath ?? noteDir;

  const allNotes = useMemo(
    () => Array.from(noteIndex.values()).sort(
      (a, b) => a.folderPath.localeCompare(b.folderPath) || a.name.localeCompare(b.name),
    ),
    [noteIndex],
  );

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
    options?: { focusEditor?: boolean; syncState?: boolean },
  ) => {
    if (!activeVaultId) return;

    const prevNote = currentNoteRef.current;

    if (prevNote?.filePath === filePath) {
      setFocusEditorPath(options?.focusEditor ? filePath : null);
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
      updateWorkspaceState((prev) => updateVaultWorkbenchState(prev, activeVaultId, (vaultState) => ({
        ...vaultState,
        currentNotePath: filePath,
      })));
    }
  }, [activeVaultId, updateWorkspaceState]);

  useEffect(() => {
    if (!noteDir || !vaultWorkbenchState.currentNotePath) return;
    if (currentNote?.filePath === vaultWorkbenchState.currentNotePath) return;

    if (!noteIndex.has(vaultWorkbenchState.currentNotePath)) {
      return;
    }

    void openNote(vaultWorkbenchState.currentNotePath, undefined, {
      focusEditor: false,
      syncState: false,
    });
  }, [currentNote?.filePath, noteDir, noteIndex, openNote, vaultWorkbenchState.currentNotePath]);

  useEffect(() => {
    if (vaultWorkbenchState.currentNotePath) return;
    if (!currentNote) return;

    autosave.unregisterFile(currentNote.filePath);
    setCurrentNote(null);
    setSaveStatus('saved');
  }, [currentNote, vaultWorkbenchState.currentNotePath]);

  const handleSelectFolder = useCallback((folderPath: string) => {
    if (!activeVaultId) return;
    updateWorkspaceState((prev) => updateVaultWorkbenchState(prev, activeVaultId, (vaultState) => ({
      ...vaultState,
      selectedFolderPath: folderPath,
    })));
  }, [activeVaultId, updateWorkspaceState]);

  const handleVaultChange = useCallback((vaultId: string) => {
    const nextSettings = {
      ...vaultSettings,
      activeVaultId: vaultId,
    };
    setVaultSettings(nextSettings);
    saveNoteVaultSettings(nextSettings);
  }, [vaultSettings]);

  const createNote = useCallback(async (inDir?: string) => {
    if (!activeVaultId) return;
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

    updateWorkspaceState((prev) => updateVaultWorkbenchState(prev, activeVaultId, (vaultState) => ({
      ...vaultState,
      selectedFolderPath: targetDir,
      currentNotePath: filePath,
    })));
    await loadTree(noteDir);
    await openNote(filePath, `${name}.md`, { focusEditor: true, syncState: false });
  }, [activeVaultId, loadTree, noteDir, openNote, selectedFolderPath, updateWorkspaceState]);

  const createFolder = useCallback(async (inDir?: string): Promise<string | null> => {
    if (!activeVaultId) return null;
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

    updateWorkspaceState((prev) => updateVaultWorkbenchState(prev, activeVaultId, (vaultState) => ({
      ...vaultState,
      selectedFolderPath: folderPath,
    })));
    setPendingRenamePath(folderPath);
    await loadTree(noteDir);
    return folderPath;
  }, [activeVaultId, loadTree, noteDir, selectedFolderPath, updateWorkspaceState]);

  const handleRename = useCallback(async (oldPath: string, newPath: string, isDirectory: boolean): Promise<boolean> => {
    if (!activeVaultId) return false;
    if (oldPath === newPath) {
      setPendingRenamePath(null);
      return true;
    }

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

    updateWorkspaceState((prev) => renameWorkbenchPath(prev, activeVaultId, oldPath, newPath, isDirectory));

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
  }, [activeVaultId, loadTree, noteDir, updateWorkspaceState]);

  const handleMoveNode = useCallback(async (
    sourcePath: string,
    targetDirPath: string,
    isDirectory: boolean,
  ): Promise<boolean> => {
    if (!activeVaultId) return false;

    const sourceName = getFileName(sourcePath);
    const currentParentPath = getParentPath(sourcePath);
    if (currentParentPath === targetDirPath) {
      return false;
    }

    if (isDirectory && (targetDirPath === sourcePath || targetDirPath.startsWith(sourcePath + '/'))) {
      return false;
    }

    return handleRename(sourcePath, joinPath(targetDirPath, sourceName), isDirectory);
  }, [activeVaultId, handleRename]);

  const handleDelete = useCallback(async (filePath: string, _fileName: string, isDirectory: boolean) => {
    if (!activeVaultId) return;

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

    const fallbackNote = allNotes.find((item) => (
      isDirectory ? !item.path.startsWith(filePath + '/') : item.path !== filePath
    )) ?? null;

    if (isCurrentDeleted && currentNoteRef.current) {
      autosave.flush(currentNoteRef.current.filePath);
    }

    const result = await window.fileApi.deleteFile(filePath);
    if (result.error) {
      window.alert(result.error);
      return;
    }

    updateWorkspaceState((prev) => removeWorkbenchPath(prev, activeVaultId, filePath, isDirectory));
    await loadTree(noteDir);

    if (isCurrentDeleted) {
      if (currentNoteRef.current) {
        autosave.unregisterFile(currentNoteRef.current.filePath);
      }
      setCurrentNote(null);
      setSaveStatus('saved');
      if (fallbackNote) {
        await openNote(fallbackNote.path, fallbackNote.name, { focusEditor: false, syncState: true });
      }
    }
  }, [activeVaultId, allNotes, loadTree, noteDir, openNote, updateWorkspaceState]);

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
          <div style={explorerPaneStyle}>
            {activeVault && noteDir && (
              <NoteFileList
                currentVault={activeVault}
                vaults={vaultSettings.vaults}
                noteDir={noteDir}
                tree={tree}
                selectedFolderPath={selectedFolderPath}
                activeFilePath={currentNote?.filePath ?? null}
                requestedRenamePath={pendingRenamePath}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onVaultChange={handleVaultChange}
                onSelectFolder={handleSelectFolder}
                onFileSelect={(filePath, fileName) => {
                  void openNote(filePath, fileName, { focusEditor: false, syncState: true });
                }}
                onCreateNote={createNote}
                onCreateFolder={createFolder}
                onDeleteNote={handleDelete}
                onRename={handleRename}
                onMoveNode={handleMoveNode}
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
                      <span>{activeVault?.name ?? '当前 Vault'}</span>
                      <span>·</span>
                      <span>{getRelativePath(currentNoteMeta.folderPath, noteDir)}</span>
                      <span>·</span>
                      <span>{statusLabel}</span>
                    </div>
                  </div>
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
                  <div style={{ fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    在 {activeVault?.name ?? '当前 Vault'} 里开始写一条新笔记
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                    从左侧文件树打开笔记，
                    <br />
                    或者直接在当前选中文件夹下新建一条开始记录。
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
