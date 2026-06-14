import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';
import CodePreview from './CodePreview';
import SplitLayout from './SplitLayout';
import { isMarkdownFile } from '../utils/file-types';
import { toggleMarkdownTaskMarker } from '../utils/markdown-task';
import { buildMarkdownCommentAgentPayload } from '../utils/markdown-comment-agent-payload';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import { useKeyboardShortcuts } from '../ShortcutContext';
import type {
  MarkdownCommentAnchor,
  MarkdownCommentLocationStatus,
  MarkdownPreviewComment,
} from '../utils/markdown-comment-types';

interface FilePreviewPanelProps {
  activeSessionId: string | null;
  /** When false, skip CWD sync and file tree reads (panel is collapsed but stays mounted) */
  visible?: boolean;
}

interface FilePreviewSnapshot {
  selectedFile: string | null;
  fileContent: string | null;
  expandedPaths: string[];
}

interface MarkdownCommentDraft {
  mode: 'create' | 'edit';
  anchor?: MarkdownCommentAnchor;
  commentId?: string;
  body: string;
}

const STORAGE_KEY_FILE_TREE_SPLIT_PX = 'filePreviewTreeSplitPx';
const STORAGE_KEY_FILE_TREE_VISIBLE = 'filePreviewTreeVisible';
const FILE_TREE_SIDEBAR_WIDTH = 220;
const ICON_COLOR = 'var(--color-icon-default)';
const ICON_COLOR_ACTIVE = 'var(--color-icon-active)';

const treeToggleButtonBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  background: 'var(--color-bg-secondary)',
  borderRadius: 4,
  cursor: 'pointer',
  color: ICON_COLOR,
  padding: 0,
  boxShadow: '0 1px 4px var(--color-shadow)',
  transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
};

function readFileTreeVisible(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_FILE_TREE_VISIBLE);
  return stored !== null ? stored === 'true' : true;
}

function createCommentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'comment-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function formatCommentTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeQuote(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 90) return normalized;
  return normalized.slice(0, 87) + '...';
}

function isCommentLocated(locationMap: Record<string, boolean>, commentId: string): boolean {
  return locationMap[commentId] !== false;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ activeSessionId, visible = true }) => {
  const { bindings, registerAction } = useKeyboardShortcuts();
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writingTask, setWritingTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [fileTreeVisible, setFileTreeVisible] = useState(readFileTreeVisible);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [markdownComments, setMarkdownComments] = useState<MarkdownPreviewComment[]>([]);
  const [commentLocationMap, setCommentLocationMap] = useState<Record<string, boolean>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSaving, setCommentsSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentNavigationVersion, setCommentNavigationVersion] = useState(0);
  const [commentDraft, setCommentDraft] = useState<MarkdownCommentDraft | null>(null);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);
  const fileTreeActive = visible && fileTreeVisible;
  const rootPathRef = useRef(rootPath);
  const snapshotRef = useRef<Record<string, FilePreviewSnapshot>>({});
  const fileLoadTokenRef = useRef(0);
  const commentLoadTokenRef = useRef(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllCommentsInputRef = useRef<HTMLInputElement | null>(null);
  rootPathRef.current = rootPath;
  const prevFileTreeActiveRef = useRef(fileTreeActive);

  const resetFindState = useCallback(() => {
    setIsFindOpen(false);
    setFindQuery('');
    setCurrentSearchIndex(0);
    setSearchMatchCount(0);
  }, []);

  const resetCommentState = useCallback(() => {
    commentLoadTokenRef.current += 1;
    setMarkdownComments([]);
    setCommentLocationMap({});
    setCommentsLoading(false);
    setCommentsSaving(false);
    setCommentError(null);
    setCommentNotice(null);
    setActiveCommentId(null);
    setCommentNavigationVersion(0);
    setCommentDraft(null);
    setIsCommentPanelOpen(false);
    setSelectedCommentIds([]);
  }, []);

  const openFind = useCallback(() => {
    if (!selectedFile || fileContent === null) return;
    setIsFindOpen(true);
    setCurrentSearchIndex(0);
  }, [fileContent, selectedFile]);

  const findActionTitle = getIconButtonTooltip({
    label: '查找',
    bindings,
    actionId: 'find-in-file-preview',
  });

  const restoreSnapshot = useCallback((nextRootPath: string) => {
    fileLoadTokenRef.current += 1;
    const snapshot = snapshotRef.current[nextRootPath];
    setRootPath(nextRootPath);
    setSelectedFile(snapshot?.selectedFile ?? null);
    setFileContent(snapshot?.fileContent ?? null);
    setWriteError(null);
    setWritingTask(false);
    setExpandedPaths(snapshot?.expandedPaths ?? []);
    setLoadingFile(false);
    resetFindState();
    resetCommentState();
  }, [resetCommentState, resetFindState]);

  useEffect(() => {
    if (!rootPath) return;
    snapshotRef.current[rootPath] = {
      selectedFile,
      fileContent,
      expandedPaths,
    };
  }, [rootPath, selectedFile, fileContent, expandedPaths]);

  useEffect(() => {
    return registerAction('find-in-file-preview', () => {
      openFind();
    });
  }, [openFind, registerAction]);

  useEffect(() => {
    if (!isFindOpen) return;
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, [isFindOpen]);

  useEffect(() => {
    if (!rootPath || !selectedFile || !isMarkdownFile(selectedFile)) {
      resetCommentState();
      return;
    }

    const loadToken = ++commentLoadTokenRef.current;
    setMarkdownComments([]);
    setCommentLocationMap({});
    setCommentsLoading(true);
    setCommentsSaving(false);
    setCommentError(null);
    setCommentNotice(null);
    setActiveCommentId(null);
    setCommentDraft(null);
    setIsCommentPanelOpen(false);
    setSelectedCommentIds([]);

    window.markdownCommentApi.load(rootPath, selectedFile).then((result) => {
      if (commentLoadTokenRef.current !== loadToken) return;
      if (result.error) {
        setCommentError(result.error);
        setMarkdownComments([]);
      } else {
        setMarkdownComments(result.comments ?? []);
      }
    }).catch((err) => {
      if (commentLoadTokenRef.current !== loadToken) return;
      setCommentError((err as Error).message);
      setMarkdownComments([]);
    }).finally(() => {
      if (commentLoadTokenRef.current === loadToken) {
        setCommentsLoading(false);
      }
    });
  }, [resetCommentState, rootPath, selectedFile]);

  // Sync root path with active terminal's cwd (on session switch) — only when the tree is active
  useEffect(() => {
    if (!activeSessionId || !fileTreeActive) return;
    let cancelled = false;

    window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
      if (!cancelled && result?.cwd && result.cwd !== rootPathRef.current) {
        restoreSnapshot(result.cwd);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  // When the file tree becomes active again, re-sync CWD immediately
  useEffect(() => {
    const wasInactive = !prevFileTreeActiveRef.current;
    prevFileTreeActiveRef.current = fileTreeActive;

    if (fileTreeActive && wasInactive && activeSessionId) {
      window.terminalApi.getSessionInfo(activeSessionId).then((result) => {
        if (result?.cwd) {
          restoreSnapshot(result.cwd);
        }
      });
    }
  }, [fileTreeActive, activeSessionId, restoreSnapshot]);

  // Listen for terminal CWD changes and auto-update file tree
  useEffect(() => {
    if (!fileTreeActive) return;
    const unsubscribe = window.terminalApi.onSessionInfoChanged((data) => {
      if (data.id === activeSessionId && data.cwd !== rootPathRef.current) {
        restoreSnapshot(data.cwd);
      }
    });
    return unsubscribe;
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  // Manual refresh: re-fetch terminal CWD and trigger file tree rescan
  const handleRefresh = useCallback(async () => {
    if (!activeSessionId || !fileTreeActive) return;
    try {
      const result = await window.terminalApi.getSessionInfo(activeSessionId);
      if (result?.cwd) {
        if (result.cwd === rootPathRef.current) {
          // Same path — increment refreshKey to force rescan
          setRefreshKey((k) => k + 1);
        } else {
          restoreSnapshot(result.cwd);
        }
      }
    } catch {
      // Ignore refresh errors
    }
  }, [activeSessionId, fileTreeActive, restoreSnapshot]);

  const toggleFileTreePane = useCallback(() => {
    setFileTreeVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_FILE_TREE_VISIBLE, String(next));
      return next;
    });
  }, []);

  const renderFileTreeToggleButton = useCallback((overlay: boolean) => (
    <button
      onClick={toggleFileTreePane}
      title={fileTreeVisible ? '收起文件树边栏' : '展开文件树边栏'}
      style={{
        ...treeToggleButtonBaseStyle,
        ...(overlay
          ? {
              position: 'absolute',
              top: 6,
              left: 8,
              zIndex: 20,
            }
          : {
              flexShrink: 0,
            }),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        e.currentTarget.style.color = ICON_COLOR_ACTIVE;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 6px var(--color-shadow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
        e.currentTarget.style.color = ICON_COLOR;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 4px var(--color-shadow)';
      }}
    >
      {fileTreeVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </button>
  ), [fileTreeVisible, toggleFileTreePane]);

  // Load file content when selection changes
  const handleSelectFile = useCallback(async (filePath: string) => {
    const loadToken = ++fileLoadTokenRef.current;
    setSelectedFile(filePath);
    setLoadingFile(true);
    setWriteError(null);
    setWritingTask(false);
    resetFindState();
    resetCommentState();
    try {
      const result = await window.fileApi.readFile(filePath);
      if (fileLoadTokenRef.current !== loadToken) return;
      if (result.error) {
        setFileContent('Error: ' + result.error);
      } else {
        setFileContent(result.content ?? null);
      }
    } catch (err) {
      if (fileLoadTokenRef.current !== loadToken) return;
      setFileContent('Error: ' + (err as Error).message);
    } finally {
      if (fileLoadTokenRef.current === loadToken) {
        setLoadingFile(false);
      }
    }
  }, [resetCommentState, resetFindState]);

  const handleReloadSelectedFile = useCallback(async () => {
    if (!selectedFile || loadingFile || writingTask) return;

    const loadToken = ++fileLoadTokenRef.current;
    setLoadingFile(true);
    setWriteError(null);
    try {
      const result = await window.fileApi.readFile(selectedFile);
      if (fileLoadTokenRef.current !== loadToken) return;
      if (result.error) {
        setFileContent('Error: ' + result.error);
      } else {
        setFileContent(result.content ?? null);
      }
    } catch (err) {
      if (fileLoadTokenRef.current !== loadToken) return;
      setFileContent('Error: ' + (err as Error).message);
    } finally {
      if (fileLoadTokenRef.current === loadToken) {
        setLoadingFile(false);
      }
    }
  }, [loadingFile, selectedFile, writingTask]);

  const handleTaskCheckboxToggle = useCallback(async (taskIndex: number) => {
    if (!selectedFile || fileContent === null || writingTask) return;

    const result = toggleMarkdownTaskMarker(fileContent, taskIndex);
    if (!result.content) {
      setWriteError(result.error ?? '无法定位对应的任务项。');
      return;
    }

    setWritingTask(true);
    setWriteError(null);
    try {
      const writeResult = await window.fileApi.writeFile(selectedFile, result.content);
      if (writeResult.error) {
        setWriteError(writeResult.error);
        return;
      }
      setFileContent(result.content);
    } catch (err) {
      setWriteError((err as Error).message);
    } finally {
      setWritingTask(false);
    }
  }, [fileContent, selectedFile, writingTask]);

  const persistMarkdownComments = useCallback(async (nextComments: MarkdownPreviewComment[]) => {
    if (!rootPath || !selectedFile || !isMarkdownFile(selectedFile)) return false;

    setCommentsSaving(true);
    setCommentError(null);
    try {
      const result = await window.markdownCommentApi.save(rootPath, selectedFile, nextComments);
      if (result.error) {
        setCommentError(result.error);
        return false;
      }
      setMarkdownComments(result.comments ?? nextComments);
      return true;
    } catch (err) {
      setCommentError((err as Error).message);
      return false;
    } finally {
      setCommentsSaving(false);
    }
  }, [rootPath, selectedFile]);

  const handleCommentAnchorCreate = useCallback((anchor: MarkdownCommentAnchor) => {
    setCommentDraft({ mode: 'create', anchor, body: '' });
    setActiveCommentId(null);
    setIsCommentPanelOpen(true);
    setCommentError(null);
    setCommentNotice(null);
  }, []);

  const handleCommentSelect = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
    setCommentNavigationVersion((version) => version + 1);
    setCommentDraft(null);
    setIsCommentPanelOpen(true);
    setCommentError(null);
    setCommentNotice(null);
  }, []);

  const handleCommentLocationChange = useCallback((statuses: MarkdownCommentLocationStatus[]) => {
    setCommentLocationMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const status of statuses) {
        next[status.commentId] = status.located;
      }

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleConfirmCommentDraft = useCallback(async () => {
    if (!selectedFile || !commentDraft) return;
    const body = commentDraft.body.trim();
    if (!body) {
      setCommentError('评论内容不能为空。');
      return;
    }

    if (commentDraft.mode === 'create' && commentDraft.anchor) {
      const now = new Date().toISOString();
      const comment: MarkdownPreviewComment = {
        id: createCommentId(),
        filePath: selectedFile,
        anchor: commentDraft.anchor,
        body,
        createdAt: now,
        updatedAt: now,
      };
      const nextComments = [...markdownComments, comment];
      if (await persistMarkdownComments(nextComments)) {
        setActiveCommentId(comment.id);
        setCommentDraft(null);
        setIsCommentPanelOpen(true);
      }
      return;
    }

    if (commentDraft.mode === 'edit' && commentDraft.commentId) {
      const now = new Date().toISOString();
      const nextComments = markdownComments.map((comment) => (
        comment.id === commentDraft.commentId
          ? { ...comment, body, updatedAt: now }
          : comment
      ));
      if (await persistMarkdownComments(nextComments)) {
        setActiveCommentId(commentDraft.commentId);
        setCommentDraft(null);
        setIsCommentPanelOpen(true);
      }
    }
  }, [commentDraft, markdownComments, persistMarkdownComments, selectedFile]);

  const handleDeleteActiveComment = useCallback(async () => {
    if (!activeCommentId) return;
    const nextComments = markdownComments.filter((comment) => comment.id !== activeCommentId);
    if (await persistMarkdownComments(nextComments)) {
      setActiveCommentId(null);
      setCommentDraft(null);
      setIsCommentPanelOpen(nextComments.length > 0);
      setSelectedCommentIds((prev) => prev.filter((id) => id !== activeCommentId));
    }
  }, [activeCommentId, markdownComments, persistMarkdownComments]);

  const handleDeleteSelectedComments = useCallback(async () => {
    if (selectedCommentIds.length === 0) return;

    const selectedIdSet = new Set(selectedCommentIds);
    const nextComments = markdownComments.filter((comment) => !selectedIdSet.has(comment.id));
    const deletedCount = markdownComments.length - nextComments.length;
    if (deletedCount === 0) return;

    if (await persistMarkdownComments(nextComments)) {
      if (activeCommentId && selectedIdSet.has(activeCommentId)) {
        setActiveCommentId(null);
        setCommentDraft(null);
      }
      setSelectedCommentIds([]);
      setIsCommentPanelOpen(nextComments.length > 0);
      setCommentNotice(`已删除 ${deletedCount} 条评论。`);
      setCommentError(null);
    }
  }, [activeCommentId, markdownComments, persistMarkdownComments, selectedCommentIds]);

  const handleDeleteUnlocatedComments = useCallback(async () => {
    const unlocatedIdSet = new Set(
      markdownComments
        .filter((comment) => !isCommentLocated(commentLocationMap, comment.id))
        .map((comment) => comment.id),
    );
    if (unlocatedIdSet.size === 0) return;

    const nextComments = markdownComments.filter((comment) => !unlocatedIdSet.has(comment.id));
    if (await persistMarkdownComments(nextComments)) {
      if (activeCommentId && unlocatedIdSet.has(activeCommentId)) {
        setActiveCommentId(null);
        setCommentDraft(null);
      }
      setSelectedCommentIds((prev) => prev.filter((id) => !unlocatedIdSet.has(id)));
      setIsCommentPanelOpen(nextComments.length > 0);
      setCommentNotice(`已清理 ${unlocatedIdSet.size} 条评论。`);
      setCommentError(null);
    }
  }, [activeCommentId, commentLocationMap, markdownComments, persistMarkdownComments]);

  const handleStartEditingActiveComment = useCallback(() => {
    const activeComment = markdownComments.find((comment) => comment.id === activeCommentId);
    if (!activeComment) return;
    setCommentDraft({ mode: 'edit', commentId: activeComment.id, body: activeComment.body });
    setIsCommentPanelOpen(true);
    setCommentError(null);
    setCommentNotice(null);
  }, [activeCommentId, markdownComments]);

  const handleToggleCommentSelection = useCallback((commentId: string) => {
    setSelectedCommentIds((prev) => (
      prev.includes(commentId)
        ? prev.filter((id) => id !== commentId)
        : [...prev, commentId]
    ));
    setCommentError(null);
    setCommentNotice(null);
  }, []);

  const handleToggleAllCommentSelection = useCallback((commentIds: string[], allSelected: boolean) => {
    setSelectedCommentIds(allSelected ? [] : commentIds);
    setCommentError(null);
    setCommentNotice(null);
  }, []);

  const handleSendCommentsToAgent = useCallback((commentsToSend: MarkdownPreviewComment[]) => {
    if (commentsToSend.length === 0) return;
    if (!activeSessionId) {
      setCommentNotice(null);
      setCommentError('当前没有可用的 terminal tab，无法发送评论。');
      return;
    }

    try {
      const payload = buildMarkdownCommentAgentPayload({
        rootPath,
        filePath: selectedFile,
        comments: commentsToSend,
      });
      window.terminalApi.input(activeSessionId, payload);
      const sentIds = commentsToSend.map((comment) => comment.id);
      setSelectedCommentIds((prev) => prev.filter((id) => !sentIds.includes(id)));
      setCommentError(null);
      setCommentNotice(`已发送 ${commentsToSend.length} 条评论到当前 terminal tab。`);
    } catch (err) {
      setCommentNotice(null);
      setCommentError((err as Error).message);
    }
  }, [activeSessionId, rootPath, selectedFile]);

  const handleSearchMatchCountChange = useCallback((count: number) => {
    setSearchMatchCount(count);
    setCurrentSearchIndex((prev) => {
      if (count === 0) return 0;
      return Math.min(prev, count - 1);
    });
  }, []);

  const handleSelectPreviousMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentSearchIndex((prev) => (prev - 1 + searchMatchCount) % searchMatchCount);
  }, [searchMatchCount]);

  const handleSelectNextMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentSearchIndex((prev) => (prev + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const selectedMarkdownFile = !!selectedFile && isMarkdownFile(selectedFile);
  const activeComment = activeCommentId
    ? markdownComments.find((comment) => comment.id === activeCommentId) ?? null
    : null;
  const commentPanelVisible = selectedMarkdownFile
    && !loadingFile
    && (isCommentPanelOpen || !!commentDraft || !!activeComment);
  const unlocatedCommentCount = markdownComments.filter((comment) => commentLocationMap[comment.id] === false).length;
  const selectedComments = markdownComments.filter((comment) => selectedCommentIds.includes(comment.id));
  const selectedCommentCount = selectedComments.length;
  const selectedUnlocatedCommentCount = selectedComments.filter(
    (comment) => !isCommentLocated(commentLocationMap, comment.id),
  ).length;
  const allCommentIds = markdownComments.map((comment) => comment.id);
  const allCommentsSelected = markdownComments.length > 0 && selectedCommentCount === markdownComments.length;
  const someCommentsSelected = selectedCommentCount > 0 && !allCommentsSelected;
  const canSendSelectedComments = selectedCommentCount > 0
    && !!activeSessionId
    && selectedUnlocatedCommentCount === 0;
  const selectedSendTitle = !activeSessionId
    ? '当前没有可用的 terminal tab'
    : selectedUnlocatedCommentCount > 0
      ? '选中包含未定位评论，请逐条确认后发送'
      : '发送选中评论给当前 terminal tab';
  const commentButtonTitle = unlocatedCommentCount > 0
    ? `显示 Markdown 评论，${unlocatedCommentCount} 条未定位`
    : '显示 Markdown 评论';
  const reloadPreviewButtonRight = selectedMarkdownFile ? 74 : 44;

  useEffect(() => {
    if (selectAllCommentsInputRef.current) {
      selectAllCommentsInputRef.current.indeterminate = someCommentsSelected;
    }
  }, [someCommentsSelected]);

  const renderCommentList = () => {
    if (commentsLoading) {
      return <div className="markdown-comment-empty">Loading...</div>;
    }

    if (markdownComments.length === 0) {
      return <div className="markdown-comment-empty">暂无评论</div>;
    }

    return (
      <>
        <div className="markdown-comment-list-toolbar">
          <label
            className="markdown-comment-list-select-all"
            title={allCommentsSelected ? '取消全选当前文件评论' : '全选当前文件评论'}
          >
            <input
              ref={selectAllCommentsInputRef}
              type="checkbox"
              checked={allCommentsSelected}
              onChange={() => handleToggleAllCommentSelection(allCommentIds, allCommentsSelected)}
              aria-label={allCommentsSelected ? '取消全选当前文件评论' : '全选当前文件评论'}
              aria-checked={someCommentsSelected ? 'mixed' : allCommentsSelected}
            />
            <span className="markdown-comment-list-selection-summary">
              {selectedCommentCount > 0 ? `已选择 ${selectedCommentCount} 条` : '全选'}
            </span>
          </label>
          <div className="markdown-comment-list-toolbar-actions">
            <button
              type="button"
              className="markdown-comment-action compact"
              onClick={() => handleSendCommentsToAgent(selectedComments)}
              disabled={!canSendSelectedComments}
              title={selectedSendTitle}
              aria-label="发送选中评论给 agent"
            >
              <Send size={13} />
              发送选中
            </button>
            <button
              type="button"
              className="markdown-comment-action compact danger"
              onClick={handleDeleteSelectedComments}
              disabled={selectedCommentCount === 0 || commentsSaving}
              title="删除选中评论"
              aria-label="删除选中评论"
            >
              <Trash2 size={13} />
              删除
            </button>
          </div>
        </div>
        <div className="markdown-comment-list">
          {markdownComments.map((comment) => {
            const located = isCommentLocated(commentLocationMap, comment.id);
            const selected = selectedCommentIds.includes(comment.id);
            return (
              <div
                key={comment.id}
                className={
                  'markdown-comment-list-item'
                  + (comment.id === activeCommentId ? ' active' : '')
                  + (selected ? ' selected' : '')
                }
              >
                <label className="markdown-comment-select" title="选择评论">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleToggleCommentSelection(comment.id)}
                    aria-label="选择评论"
                  />
                </label>
                <button
                  type="button"
                  className="markdown-comment-list-content"
                  onClick={() => handleCommentSelect(comment.id)}
                  title={comment.body}
                >
                  <span className="markdown-comment-list-quote">{summarizeQuote(comment.anchor.quote)}</span>
                  <span className="markdown-comment-list-body">{comment.body}</span>
                  <span className="markdown-comment-list-meta">
                    {located ? '已定位' : '未定位'} · {formatCommentTimestamp(comment.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="markdown-comment-list-send"
                  onClick={() => handleSendCommentsToAgent([comment])}
                  disabled={!activeSessionId}
                  title={
                    activeSessionId
                      ? located
                        ? '发送此评论给当前 terminal tab'
                        : '未定位，将按原选中文本发送'
                      : '当前没有可用的 terminal tab'
                  }
                  aria-label="发送此评论给 agent"
                >
                  <Send size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const commentPanel = commentPanelVisible ? (
    <div className="markdown-comment-panel" role="dialog" aria-label="Markdown 评论">
      <div className="markdown-comment-panel-header">
        <div className="markdown-comment-panel-title">
          <MessageSquare size={14} />
          <span>评论</span>
          <span className="markdown-comment-count">{markdownComments.length}</span>
        </div>
        <button
          type="button"
          className="markdown-comment-icon-button"
          title="关闭评论"
          aria-label="关闭评论"
          onClick={() => {
            setIsCommentPanelOpen(false);
            setActiveCommentId(null);
            setCommentDraft(null);
          }}
        >
          <X size={14} />
        </button>
      </div>
      {commentError && <div className="markdown-comment-error">{commentError}</div>}
      {commentNotice && <div className="markdown-comment-success">{commentNotice}</div>}
      {unlocatedCommentCount > 0 && !commentDraft && (
        <div className="markdown-comment-warning markdown-comment-warning-row">
          <span>{unlocatedCommentCount} 条未定位</span>
          <button
            type="button"
            className="markdown-comment-warning-action"
            onClick={handleDeleteUnlocatedComments}
            disabled={commentsSaving}
            title="删除未定位评论"
            aria-label="删除未定位评论"
          >
            清理
          </button>
        </div>
      )}
      {commentDraft ? (
        <div className="markdown-comment-editor">
          <textarea
            value={commentDraft.body}
            onChange={(event) => setCommentDraft((prev) => (prev ? { ...prev, body: event.target.value } : prev))}
            placeholder="输入评论"
            aria-label="评论内容"
            autoFocus
          />
          <div className="markdown-comment-actions">
            <button
              type="button"
              className="markdown-comment-action primary"
              onClick={handleConfirmCommentDraft}
              disabled={commentsSaving}
            >
              <Check size={14} />
              保存
            </button>
            <button
              type="button"
              className="markdown-comment-action"
              onClick={() => setCommentDraft(null)}
              disabled={commentsSaving}
            >
              <X size={14} />
              取消
            </button>
          </div>
        </div>
      ) : activeComment ? (
        <div className="markdown-comment-detail">
          <div className="markdown-comment-quote">{summarizeQuote(activeComment.anchor.quote)}</div>
          {!isCommentLocated(commentLocationMap, activeComment.id) && (
            <div className="markdown-comment-warning compact">未定位到正文</div>
          )}
          <div className="markdown-comment-body-text">{activeComment.body}</div>
          <div className="markdown-comment-list-meta">更新于 {formatCommentTimestamp(activeComment.updatedAt)}</div>
          <div className="markdown-comment-actions">
            <button
              type="button"
              className="markdown-comment-action"
              onClick={() => handleSendCommentsToAgent([activeComment])}
              disabled={!activeSessionId}
              title={
                activeSessionId
                  ? isCommentLocated(commentLocationMap, activeComment.id)
                    ? '发送此评论给当前 terminal tab'
                    : '未定位，将按原选中文本发送'
                  : '当前没有可用的 terminal tab'
              }
            >
              <Send size={14} />
              发送给 agent
            </button>
            <button type="button" className="markdown-comment-action" onClick={handleStartEditingActiveComment}>
              <Pencil size={14} />
              编辑
            </button>
            <button type="button" className="markdown-comment-action danger" onClick={handleDeleteActiveComment}>
              <Trash2 size={14} />
              删除
            </button>
          </div>
        </div>
      ) : renderCommentList()}
    </div>
  ) : null;

  const findBar = isFindOpen ? (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 14,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid var(--color-border-primary)',
        background: 'var(--color-surface-content-elevated)',
        boxShadow: '0 14px 28px var(--color-shadow)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
        }}
      >
        <Search size={14} />
      </div>
      <input
        ref={findInputRef}
        value={findQuery}
        onChange={(event) => {
          setFindQuery(event.target.value);
          setCurrentSearchIndex(0);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            resetFindState();
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) {
              handleSelectPreviousMatch();
            } else {
              handleSelectNextMatch();
            }
          }
        }}
        placeholder="查找当前文件"
        spellCheck={false}
        style={{
          width: 220,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          fontSize: 13,
        }}
      />
      <div
        style={{
          minWidth: 52,
          textAlign: 'right',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {searchMatchCount === 0 ? '0' : (currentSearchIndex + 1) + '/' + searchMatchCount}
      </div>
      <button
        type="button"
        onClick={handleSelectPreviousMatch}
        disabled={searchMatchCount === 0}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
          opacity: searchMatchCount === 0 ? 0.4 : 1,
        }}
        title="上一个匹配"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={handleSelectNextMatch}
        disabled={searchMatchCount === 0}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
          opacity: searchMatchCount === 0 ? 0.4 : 1,
        }}
        title="下一个匹配"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={resetFindState}
        style={{
          ...treeToggleButtonBaseStyle,
          width: 22,
          height: 22,
          background: 'transparent',
          boxShadow: 'none',
        }}
        title="关闭查找"
      >
        <X size={14} />
      </button>
    </div>
  ) : null;

  const fileTreePane = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      {/* File tree (includes its own toolbar with refresh) */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rootPath ? (
          <FileTree
            rootPath={rootPath}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onRefresh={handleRefresh}
            refreshKey={refreshKey}
            expandedPaths={expandedPaths}
            onExpandedPathsChange={setExpandedPaths}
            leadingControl={renderFileTreeToggleButton(false)}
          />
        ) : (
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
            Waiting for terminal...
          </div>
        )}
      </div>
    </div>
  );

  const previewPane = (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {selectedFile && !loadingFile && findBar}
      {!isFindOpen && selectedFile && !loadingFile && (
        <button
          type="button"
          onClick={handleReloadSelectedFile}
          title="刷新预览"
          aria-label="刷新预览"
          style={{
            ...treeToggleButtonBaseStyle,
            position: 'absolute',
            top: 10,
            right: reloadPreviewButtonRight,
            zIndex: 15,
            background: 'var(--color-surface-content-elevated)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <RefreshCw size={14} />
        </button>
      )}
      {!isFindOpen && selectedMarkdownFile && !loadingFile && !commentPanelVisible && (
        <button
          type="button"
          onClick={() => setIsCommentPanelOpen(true)}
          title={commentButtonTitle}
          aria-label={commentButtonTitle}
          style={{
            ...treeToggleButtonBaseStyle,
            position: 'absolute',
            top: 10,
            right: 44,
            zIndex: 15,
            background: 'var(--color-surface-content-elevated)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <MessageSquare size={14} />
          {markdownComments.length > 0 && (
            <span className="markdown-comment-toolbar-count">{markdownComments.length}</span>
          )}
          {unlocatedCommentCount > 0 && (
            <span className="markdown-comment-toolbar-warning-count">{unlocatedCommentCount}</span>
          )}
        </button>
      )}
      {!isFindOpen && selectedFile && !loadingFile && (
        <button
          type="button"
          onClick={openFind}
          title={findActionTitle}
          style={{
            ...treeToggleButtonBaseStyle,
            position: 'absolute',
            top: 10,
            right: 14,
            zIndex: 15,
            background: 'var(--color-surface-content-elevated)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Search size={14} />
        </button>
      )}
      {commentPanel}
      {loadingFile ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}
        >
          Loading...
        </div>
      ) : selectedFile && !isMarkdownFile(selectedFile) ? (
        <CodePreview
          content={fileContent}
          filePath={selectedFile}
          searchQuery={findQuery}
          currentSearchIndex={currentSearchIndex}
          onSearchMatchCountChange={handleSearchMatchCountChange}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {writeError && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                zIndex: 10,
                maxWidth: '70%',
                padding: '6px 10px',
                borderRadius: 6,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 2px 8px var(--color-shadow)',
                fontSize: 12,
              }}
            >
              写入失败：{writeError}
            </div>
          )}
          <MarkdownPreview
            content={fileContent}
            filePath={selectedFile}
            onTaskCheckboxToggle={handleTaskCheckboxToggle}
            taskCheckboxDisabled={writingTask}
            searchQuery={findQuery}
            currentSearchIndex={currentSearchIndex}
            onSearchMatchCountChange={handleSearchMatchCountChange}
            comments={markdownComments}
            activeCommentId={activeCommentId}
            activeCommentNavigationVersion={commentNavigationVersion}
            commentGutterHidden={isFindOpen || commentPanelVisible}
            onCommentAnchorCreate={handleCommentAnchorCreate}
            onCommentSelect={handleCommentSelect}
            onCommentLocationChange={handleCommentLocationChange}
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {visible && (!fileTreeVisible || !rootPath) && renderFileTreeToggleButton(true)}
      <SplitLayout
        left={fileTreePane}
        right={previewPane}
        defaultLeftPx={FILE_TREE_SIDEBAR_WIDTH}
        storageKey={STORAGE_KEY_FILE_TREE_SPLIT_PX}
        minLeftPx={150}
        minRightPx={200}
        shadow
        leftCollapsed={!fileTreeVisible}
      />
    </div>
  );
};

export default FilePreviewPanel;
