import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
} from 'lucide-react';
import type { TerminalAttention, TerminalSessionInfo } from '../preload';
import { useKeyboardShortcuts } from '../ShortcutContext';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import {
  loadTabState,
  saveTabState,
  saveTabStateSync,
  type PersistedTabState,
} from '../utils/tab-persistence';
import ContextMenu, { createPathMenuItems, type ContextMenuItem } from './ContextMenu';
import TerminalInstance from './TerminalInstance';

interface WorkspaceNode {
  id: string;
  name: string;
  currentPath: string | null;
  lastActiveSessionId: string | null;
  isExpanded: boolean;
  sessions: TerminalSessionInfo[];
}

interface SidebarMenuState {
  x: number;
  y: number;
  workspaceId: string;
  sessionId?: string;
}

interface WorkspaceRenameState {
  type: 'workspace';
  workspaceId: string;
  value: string;
}

interface SessionRenameState {
  type: 'session';
  workspaceId: string;
  sessionId: string;
  value: string;
}

type RenameState = WorkspaceRenameState | SessionRenameState;

interface TerminalPanelProps {
  initialDirectory?: string;
  onActiveSessionChange?: (sessionId: string) => void;
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_HEADER_HEIGHT = 46;
const SIDEBAR_FOOTER_HEIGHT = 48;
const ROW_HEIGHT = 34;
const SIDEBAR_TOGGLE_SIZE = 28;

function getLastPathSegment(cwd: string): string {
  const trimmed = cwd.replace(/\/+$/, '');
  if (!trimmed) return cwd;
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || cwd;
}

function createPlaceholderSessionInfo(id: string, cwd?: string): TerminalSessionInfo {
  const resolvedCwd = cwd || '';
  return {
    id,
    cwd: resolvedCwd,
    isGitRepo: false,
    branchName: null,
    displayLabel: resolvedCwd ? getLastPathSegment(resolvedCwd) : 'terminal',
  };
}

function findWorkspaceBySessionId(workspaces: WorkspaceNode[], sessionId: string): WorkspaceNode | undefined {
  return workspaces.find((workspace) =>
    workspace.sessions.some((session) => session.id === sessionId),
  );
}

function getOrderedSessionIds(workspaces: WorkspaceNode[]): string[] {
  return workspaces.flatMap((workspace) => workspace.sessions.map((session) => session.id));
}

function resolveWorkspaceActiveSessionId(workspace: WorkspaceNode): string {
  if (workspace.lastActiveSessionId
    && workspace.sessions.some((session) => session.id === workspace.lastActiveSessionId)) {
    return workspace.lastActiveSessionId;
  }
  return workspace.sessions[0]?.id || '';
}

function resolveActiveSessionId(workspaces: WorkspaceNode[], preferredSessionId: string): string {
  if (preferredSessionId
    && workspaces.some((workspace) =>
      workspace.sessions.some((session) => session.id === preferredSessionId),
    )) {
    return preferredSessionId;
  }

  const fallbackWorkspace = workspaces[0];
  if (!fallbackWorkspace) return '';
  return resolveWorkspaceActiveSessionId(fallbackWorkspace);
}

interface CloseMutationResult {
  nextWorkspaces: WorkspaceNode[];
  nextActiveSessionId: string;
  shouldCreateWorkspace: boolean;
}

function computeWorkspacesAfterSessionClose(
  workspaces: WorkspaceNode[],
  workspaceId: string,
  sessionId: string,
  activeSessionId: string,
): CloseMutationResult {
  let preferredNextActiveSessionId = activeSessionId === sessionId ? '' : activeSessionId;
  const nextWorkspaces: WorkspaceNode[] = [];

  for (const workspace of workspaces) {
    if (workspace.id !== workspaceId) {
      nextWorkspaces.push(workspace);
      continue;
    }

    const closingIndex = workspace.sessions.findIndex((session) => session.id === sessionId);
    if (closingIndex === -1) {
      nextWorkspaces.push(workspace);
      continue;
    }

    const remainingSessions = workspace.sessions.filter((session) => session.id !== sessionId);
    if (remainingSessions.length === 0) {
      continue;
    }

    const fallbackSession = remainingSessions[Math.min(closingIndex, remainingSessions.length - 1)];
    const nextLastActiveSessionId = resolveActiveSessionId(
      [{
        ...workspace,
        sessions: remainingSessions,
      }],
      workspace.lastActiveSessionId === sessionId ? fallbackSession.id : workspace.lastActiveSessionId || '',
    );

    nextWorkspaces.push({
      ...workspace,
      currentPath:
        nextLastActiveSessionId === fallbackSession.id
          ? fallbackSession.cwd || workspace.currentPath
          : workspace.currentPath,
      lastActiveSessionId: nextLastActiveSessionId,
      sessions: remainingSessions,
    });

    if (activeSessionId === sessionId) {
      preferredNextActiveSessionId = fallbackSession.id;
    }
  }

  return {
    nextWorkspaces,
    nextActiveSessionId: resolveActiveSessionId(nextWorkspaces, preferredNextActiveSessionId),
    shouldCreateWorkspace: nextWorkspaces.length === 0,
  };
}

function computeWorkspacesAfterWorkspaceClose(
  workspaces: WorkspaceNode[],
  workspaceId: string,
  activeSessionId: string,
): CloseMutationResult {
  const closingIndex = workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (closingIndex === -1) {
    return {
      nextWorkspaces: workspaces,
      nextActiveSessionId: resolveActiveSessionId(workspaces, activeSessionId),
      shouldCreateWorkspace: workspaces.length === 0,
    };
  }

  const workspaceToClose = workspaces[closingIndex];
  const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId);
  const isClosingActiveWorkspace = workspaceToClose.sessions.some(
    (session) => session.id === activeSessionId,
  );
  const fallbackWorkspace = nextWorkspaces[Math.min(closingIndex, nextWorkspaces.length - 1)];
  const preferredNextActiveSessionId = isClosingActiveWorkspace
    ? fallbackWorkspace
      ? resolveWorkspaceActiveSessionId(fallbackWorkspace)
      : ''
    : activeSessionId;

  return {
    nextWorkspaces,
    nextActiveSessionId: resolveActiveSessionId(nextWorkspaces, preferredNextActiveSessionId),
    shouldCreateWorkspace: nextWorkspaces.length === 0,
  };
}

function getSessionDisplayLabel(
  session: TerminalSessionInfo,
  sessionNameOverrides: Record<string, string>,
): string {
  return sessionNameOverrides[session.id] || session.displayLabel;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  initialDirectory,
  onActiveSessionChange,
}) => {
  const { bindings, registerAction } = useKeyboardShortcuts();
  const workspaceCounterRef = useRef(1);
  const initializedRef = useRef(false);
  const workspacesRef = useRef<WorkspaceNode[]>([]);
  const sessionNameOverridesRef = useRef<Record<string, string>>({});
  const workspaceRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [sessionNameOverrides, setSessionNameOverrides] = useState<Record<string, string>>({});
  const [attentionBySessionId, setAttentionBySessionId] = useState<Record<string, TerminalAttention>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuState, setMenuState] = useState<SidebarMenuState | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const sidebarWidth = sidebarCollapsed ? 0 : SIDEBAR_WIDTH;
  const renameTargetKey = renameState
    ? renameState.type === 'workspace'
      ? `workspace:${renameState.workspaceId}`
      : `session:${renameState.workspaceId}:${renameState.sessionId}`
    : null;
  const createWorkspaceTitle = getIconButtonTooltip({
    label: '新增 Workspace',
    bindings,
    actionId: 'create-workspace',
  });
  const sidebarToggleTitle = getIconButtonTooltip({
    label: sidebarCollapsed ? '展开 Terminal 侧边栏' : '收起 Terminal 侧边栏',
    bindings,
    actionId: 'toggle-terminal-sidebar',
  });

  workspacesRef.current = workspaces;
  sessionNameOverridesRef.current = sessionNameOverrides;

  const clearSessionAttention = useCallback((sessionId: string) => {
    setAttentionBySessionId((prev) => {
      if (!(sessionId in prev)) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  const applySessionInfo = useCallback((info: TerminalSessionInfo) => {
    setWorkspaces((prev) =>
      prev.map((workspace) => {
        const hasTarget = workspace.sessions.some((session) => session.id === info.id);
        if (!hasTarget) return workspace;

        const nextSessions = workspace.sessions.map((session) =>
          session.id === info.id ? info : session,
        );
        const nextCurrentPath =
          workspace.lastActiveSessionId === info.id
            ? info.cwd || workspace.currentPath
            : workspace.currentPath;

        return {
          ...workspace,
          currentPath: nextCurrentPath,
          sessions: nextSessions,
        };
      }),
    );
  }, []);

  const createWorkspace = useCallback(async (cwd?: string) => {
    const workspaceName = `workspace_${workspaceCounterRef.current++}`;
    const workspaceId = crypto.randomUUID();

    try {
      const { id: sessionId } = await window.terminalApi.create(80, 24, cwd);
      const placeholderSession = createPlaceholderSessionInfo(sessionId, cwd);

      setWorkspaces((prev) => [
        ...prev,
        {
          id: workspaceId,
          name: workspaceName,
          currentPath: placeholderSession.cwd || cwd || null,
          lastActiveSessionId: sessionId,
          isExpanded: true,
          sessions: [placeholderSession],
        },
      ]);
      setActiveSessionId(sessionId);

      const info = await window.terminalApi.getSessionInfo(sessionId);
      if (info) {
        applySessionInfo(info);
      }
    } catch (error) {
      console.error('[TerminalPanel] Failed to create workspace:', error);
      workspaceCounterRef.current -= 1;
    }
  }, [applySessionInfo]);

  const createSessionInWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = workspacesRef.current.find((item) => item.id === workspaceId);
    if (!workspace) return;

    try {
      const { id: sessionId } = await window.terminalApi.create(80, 24, workspace.currentPath || undefined);
      const placeholderSession = createPlaceholderSessionInfo(sessionId, workspace.currentPath || undefined);

      setWorkspaces((prev) =>
        prev.map((item) => {
          if (item.id !== workspaceId) return item;
          return {
            ...item,
            isExpanded: true,
            lastActiveSessionId: sessionId,
            currentPath: item.currentPath || placeholderSession.cwd || null,
            sessions: [...item.sessions, placeholderSession],
          };
        }),
      );
      setActiveSessionId(sessionId);

      const info = await window.terminalApi.getSessionInfo(sessionId);
      if (info) {
        applySessionInfo(info);
      }
    } catch (error) {
      console.error('[TerminalPanel] Failed to create session in workspace:', error);
    }
  }, [applySessionInfo]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const restoreFromPersistedState = async () => {
      const persisted = await loadTabState();
      if (!persisted) {
        void createWorkspace(initialDirectory);
        return;
      }

      try {
        const idMap = new Map<string, string>();
        const restoredWorkspaces: WorkspaceNode[] = [];

        for (const pWorkspace of persisted.workspaces) {
          const restoredSessions: TerminalSessionInfo[] = [];

          for (const pSession of pWorkspace.sessions) {
            try {
              const { id: newSessionId } = await window.terminalApi.create(80, 24, pSession.cwd || undefined);
              idMap.set(pSession.id, newSessionId);
              restoredSessions.push(createPlaceholderSessionInfo(newSessionId, pSession.cwd || undefined));
            } catch {
              // cwd may not exist; retry with no cwd (HOME directory)
              try {
                const { id: newSessionId } = await window.terminalApi.create(80, 24);
                idMap.set(pSession.id, newSessionId);
                restoredSessions.push(createPlaceholderSessionInfo(newSessionId));
              } catch {
                // Skip this session entirely
              }
            }
          }

          if (restoredSessions.length === 0) continue;

          const mappedLastActive = pWorkspace.sessions.find(
            (s) => idMap.has(s.id) && restoredSessions.some((rs) => rs.id === idMap.get(s.id)),
          );
          const lastActiveSessionId = mappedLastActive
            ? idMap.get(mappedLastActive.id) || restoredSessions[0].id
            : restoredSessions[0].id;

          restoredWorkspaces.push({
            id: pWorkspace.id,
            name: pWorkspace.name,
            currentPath: pWorkspace.currentPath,
            lastActiveSessionId,
            isExpanded: pWorkspace.isExpanded,
            sessions: restoredSessions,
          });
        }

        if (restoredWorkspaces.length === 0) {
          void createWorkspace(initialDirectory);
          return;
        }

        // Restore workspace counter from workspace names
        let maxCounter = 0;
        for (const ws of restoredWorkspaces) {
          const match = ws.name.match(/^workspace_(\d+)$/);
          if (match) {
            maxCounter = Math.max(maxCounter, parseInt(match[1], 10));
          }
        }
        workspaceCounterRef.current = maxCounter + 1;

        // Restore sessionNameOverrides with mapped IDs
        const restoredOverrides: Record<string, string> = {};
        for (const [oldId, name] of Object.entries(persisted.sessionNameOverrides)) {
          const newId = idMap.get(oldId);
          if (newId) {
            restoredOverrides[newId] = name;
          }
        }

        // Restore activeSessionId with mapped ID
        const restoredActiveSessionId = idMap.get(persisted.activeSessionId)
          || resolveActiveSessionId(restoredWorkspaces, '');

        setWorkspaces(restoredWorkspaces);
        setActiveSessionId(restoredActiveSessionId);
        setSessionNameOverrides(restoredOverrides);
        setSidebarCollapsed(persisted.sidebarCollapsed);

        // Fetch live session info for all restored sessions
        for (const ws of restoredWorkspaces) {
          for (const session of ws.sessions) {
            window.terminalApi.getSessionInfo(session.id).then((info) => {
              if (info) applySessionInfo(info);
            }).catch(() => { /* ignore */ });
          }
        }
      } catch {
        void createWorkspace(initialDirectory);
      }
    };

    void restoreFromPersistedState();
  }, [createWorkspace, initialDirectory, applySessionInfo]);

  useEffect(() => {
    return registerAction('toggle-terminal-sidebar', () => {
      setSidebarCollapsed((prev) => !prev);
    });
  }, [registerAction]);

  // Build the persisted state snapshot from current React state
  const buildPersistedState = useCallback((): PersistedTabState => ({
    version: 1,
    workspaces: workspacesRef.current.map((ws) => ({
      id: ws.id,
      name: ws.name,
      currentPath: ws.currentPath,
      isExpanded: ws.isExpanded,
      sessions: ws.sessions.map((s) => ({
        id: s.id,
        cwd: s.cwd,
      })),
    })),
    activeSessionId,
    sessionNameOverrides: sessionNameOverridesRef.current,
    sidebarCollapsed,
  }), [activeSessionId, sidebarCollapsed]);

  // Auto-save tab state on changes (fire-and-forget IPC → main process writes to disk)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (workspaces.length === 0) return;
    saveTabState(buildPersistedState());
  }, [workspaces, activeSessionId, sessionNameOverrides, sidebarCollapsed, buildPersistedState]);

  // Sync save on window close — guarantees file is written before process exits
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (workspacesRef.current.length === 0) return;
      saveTabStateSync(buildPersistedState());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [buildPersistedState]);

  useEffect(() => {
    return registerAction('create-workspace', () => {
      void createWorkspace(initialDirectory);
    });
  }, [registerAction, createWorkspace, initialDirectory]);

  useEffect(() => {
    if (!activeSessionId) return;
    onActiveSessionChange?.(activeSessionId);
  }, [activeSessionId, onActiveSessionChange]);

  useEffect(() => {
    const nextActiveSessionId = resolveActiveSessionId(workspaces, activeSessionId);
    if (nextActiveSessionId !== activeSessionId) {
      setActiveSessionId(nextActiveSessionId);
    }
  }, [activeSessionId, workspaces]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onSessionInfoChanged((info) => {
      applySessionInfo(info);
    });
    return unsubscribe;
  }, [applySessionInfo]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onAttention((attention) => {
      setAttentionBySessionId((prev) => ({
        ...prev,
        [attention.id]: attention,
      }));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onAttentionCleared(({ id }) => {
      clearSessionAttention(id);
    });
    return unsubscribe;
  }, [clearSessionAttention]);

  useEffect(() => {
    if (sidebarCollapsed) {
      setMenuState(null);
      return;
    }

    const activeWorkspace = findWorkspaceBySessionId(workspaces, activeSessionId);
    const targetElement =
      sessionRefs.current.get(activeSessionId) ||
      (activeWorkspace ? workspaceRefs.current.get(activeWorkspace.id) : undefined);

    if (!targetElement) return;
    requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [activeSessionId, sidebarCollapsed, workspaces]);

  useEffect(() => {
    if (!renameState) return;
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renameTargetKey]);

  const handleSelectSession = useCallback((sessionId: string) => {
    clearSessionAttention(sessionId);
    setWorkspaces((prev) =>
      prev.map((workspace) => {
        const selectedSession = workspace.sessions.find((session) => session.id === sessionId);
        if (!selectedSession) return workspace;
        return {
          ...workspace,
          lastActiveSessionId: sessionId,
          currentPath: selectedSession.cwd || workspace.currentPath,
        };
      }),
    );
    setActiveSessionId(sessionId);
  }, [clearSessionAttention]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onActivateSession(({ id }) => {
      setSidebarCollapsed(false);
      handleSelectSession(id);
    });
    return unsubscribe;
  }, [handleSelectSession]);

  const selectRelativeTerminalTab = useCallback((direction: -1 | 1) => {
    const sessionIds = getOrderedSessionIds(workspacesRef.current);
    if (sessionIds.length <= 1) return;

    const currentIndex = sessionIds.findIndex((sessionId) => sessionId === activeSessionId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + sessionIds.length) % sessionIds.length;
    const nextSessionId = sessionIds[nextIndex];
    if (!nextSessionId || nextSessionId === activeSessionId) return;

    handleSelectSession(nextSessionId);
  }, [activeSessionId, handleSelectSession]);

  useEffect(() => {
    return registerAction('select-previous-terminal-tab', () => {
      selectRelativeTerminalTab(-1);
    });
  }, [registerAction, selectRelativeTerminalTab]);

  useEffect(() => {
    return registerAction('select-next-terminal-tab', () => {
      selectRelativeTerminalTab(1);
    });
  }, [registerAction, selectRelativeTerminalTab]);

  const getActiveWorkspace = useCallback(() => {
    if (!activeSessionId) return undefined;
    return findWorkspaceBySessionId(workspacesRef.current, activeSessionId);
  }, [activeSessionId]);

  const handleToggleWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, isExpanded: !workspace.isExpanded }
          : workspace,
      ),
    );
  }, []);

  const handleCloseSession = useCallback(async (workspaceId: string, sessionId: string) => {
    const {
      nextWorkspaces,
      nextActiveSessionId,
      shouldCreateWorkspace,
    } = computeWorkspacesAfterSessionClose(
      workspacesRef.current,
      workspaceId,
      sessionId,
      activeSessionId,
    );

    try {
      await window.terminalApi.dispose(sessionId);
    } catch {
      // Ignore dispose failures for already-closed sessions.
    }
    clearSessionAttention(sessionId);
    setWorkspaces(nextWorkspaces);

    setSessionNameOverrides((prev) => {
      if (!(sessionId in prev)) return prev;
      const nextOverrides = { ...prev };
      delete nextOverrides[sessionId];
      return nextOverrides;
    });

    setRenameState((prev) => {
      if (!prev) return prev;
      if (prev.type === 'session' && prev.sessionId === sessionId) return null;
      if (prev.type === 'workspace' && prev.workspaceId === workspaceId) {
        const workspace = workspacesRef.current.find((item) => item.id === workspaceId);
        if (workspace?.sessions.length === 1 && workspace.sessions[0].id === sessionId) {
          return null;
        }
      }
      return prev;
    });

    if (shouldCreateWorkspace) {
      setActiveSessionId('');
      await createWorkspace(initialDirectory);
      return;
    }

    if (nextActiveSessionId) {
      setActiveSessionId(nextActiveSessionId);
    }
  }, [activeSessionId, clearSessionAttention, createWorkspace, initialDirectory]);

  const handleCloseWorkspace = useCallback(async (workspaceId: string) => {
    const workspaceToClose = workspacesRef.current.find((workspace) => workspace.id === workspaceId);
    if (!workspaceToClose) return;
    const {
      nextWorkspaces,
      nextActiveSessionId,
      shouldCreateWorkspace,
    } = computeWorkspacesAfterWorkspaceClose(
      workspacesRef.current,
      workspaceId,
      activeSessionId,
    );

    for (const session of workspaceToClose.sessions) {
      try {
        await window.terminalApi.dispose(session.id);
      } catch {
        // Ignore dispose failures for already-closed sessions.
      }
      clearSessionAttention(session.id);
    }
    setWorkspaces(nextWorkspaces);

    setSessionNameOverrides((prev) => {
      const nextOverrides = { ...prev };
      for (const session of workspaceToClose.sessions) {
        delete nextOverrides[session.id];
      }
      return nextOverrides;
    });

    setRenameState((prev) => (prev?.workspaceId === workspaceId ? null : prev));

    if (shouldCreateWorkspace) {
      setActiveSessionId('');
      await createWorkspace(initialDirectory);
      return;
    }

    if (nextActiveSessionId) {
      setActiveSessionId(nextActiveSessionId);
    }
  }, [activeSessionId, clearSessionAttention, createWorkspace, initialDirectory]);

  const handleStartWorkspaceRename = useCallback((workspaceId: string) => {
    const workspace = workspacesRef.current.find((item) => item.id === workspaceId);
    if (!workspace) return;
    setRenameState({
      type: 'workspace',
      workspaceId,
      value: workspace.name,
    });
  }, []);

  const handleStartSessionRename = useCallback((workspaceId: string, sessionId: string) => {
    const workspace = workspacesRef.current.find((item) => item.id === workspaceId);
    const session = workspace?.sessions.find((item) => item.id === sessionId);
    if (!workspace || !session) return;

    setWorkspaces((prev) =>
      prev.map((item) =>
        item.id === workspaceId
          ? { ...item, isExpanded: true }
          : item,
      ),
    );
    setRenameState({
      type: 'session',
      workspaceId,
      sessionId,
      value: getSessionDisplayLabel(session, sessionNameOverridesRef.current),
    });
  }, []);

  const handleCommitRename = useCallback(() => {
    if (!renameState) return;

    const trimmed = renameState.value.trim();

    if (renameState.type === 'workspace') {
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === renameState.workspaceId
            ? { ...workspace, name: trimmed || workspace.name }
            : workspace,
        ),
      );
    } else if (trimmed) {
      setSessionNameOverrides((prev) => ({
        ...prev,
        [renameState.sessionId]: trimmed,
      }));
    }

    setRenameState(null);
  }, [renameState]);

  const handleCancelRename = useCallback(() => {
    setRenameState(null);
  }, []);

  const menuItems: ContextMenuItem[] = (() => {
    if (!menuState) return [];

    const workspace = workspaces.find((item) => item.id === menuState.workspaceId);
    if (!workspace) return [];

    if (menuState.sessionId) {
      const session = workspace.sessions.find((item) => item.id === menuState.sessionId);
      return createPathMenuItems({
        nodePath: session?.cwd || null,
        rootPath: workspace.currentPath || session?.cwd || null,
        onClose: () => setMenuState(null),
      });
    }

    return [
      {
        label: 'New Tab',
        onSelect: async () => {
          setMenuState(null);
          await createSessionInWorkspace(workspace.id);
        },
      },
      {
        label: 'Rename',
        onSelect: () => {
          setMenuState(null);
          handleStartWorkspaceRename(workspace.id);
        },
      },
      { type: 'separator' },
      ...createPathMenuItems({
        nodePath: workspace.currentPath,
        rootPath: workspace.currentPath,
        onClose: () => setMenuState(null),
      }),
    ];
  })();

  useEffect(() => {
    return registerAction('create-terminal-tab', () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace) return;
      void createSessionInWorkspace(activeWorkspace.id);
    });
  }, [createSessionInWorkspace, getActiveWorkspace, registerAction]);

  useEffect(() => {
    return registerAction('rename-current-workspace', () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace) return;
      handleStartWorkspaceRename(activeWorkspace.id);
    });
  }, [getActiveWorkspace, handleStartWorkspaceRename, registerAction]);

  useEffect(() => {
    return registerAction('rename-current-terminal-tab', () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace || !activeSessionId) return;
      handleStartSessionRename(activeWorkspace.id, activeSessionId);
    });
  }, [activeSessionId, getActiveWorkspace, handleStartSessionRename, registerAction]);

  useEffect(() => {
    return registerAction('close-current-terminal-tab', () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace || !activeSessionId) return;
      void handleCloseSession(activeWorkspace.id, activeSessionId);
    });
  }, [activeSessionId, getActiveWorkspace, handleCloseSession, registerAction]);

  useEffect(() => {
    return registerAction('close-current-workspace', () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace) return;
      void handleCloseWorkspace(activeWorkspace.id);
    });
  }, [getActiveWorkspace, handleCloseWorkspace, registerAction]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-workbench-bg)',
      }}
    >
      <div
        style={{
          width: sidebarWidth,
          height: '100%',
          borderRight: sidebarCollapsed ? 'none' : '1px solid var(--color-window-chrome-border)',
          background: 'var(--color-surface-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: 'var(--color-shadow-inset)',
          backdropFilter: 'blur(18px) saturate(160%)',
          transition: 'width 0.18s ease',
        }}
      >
        <div
          style={{
            height: SIDEBAR_HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? 0 : '0 12px',
            borderBottom: '1px solid var(--color-border-secondary)',
            flexShrink: 0,
          }}
        >
          {!sidebarCollapsed && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontWeight: 600,
              }}
            >
              Terminal
            </span>
          )}

          {!sidebarCollapsed && (
            <button
              onClick={() => void createWorkspace()}
              title={createWorkspaceTitle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                borderRadius: 8,
                padding: 0,
                flexShrink: 0,
                transition: 'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-surface-content-elevated)';
                event.currentTarget.style.borderColor = 'var(--color-border-primary)';
                event.currentTarget.style.color = 'var(--color-text-primary)';
                event.currentTarget.style.boxShadow = 'var(--color-shadow-soft)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
                event.currentTarget.style.borderColor = 'transparent';
                event.currentTarget.style.color = 'var(--color-text-tertiary)';
                event.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed ? '8px 0' : '10px 10px 14px',
          }}
        >
          {!sidebarCollapsed && workspaces.map((workspace) => {
            const isWorkspaceActive = workspace.sessions.some((session) => session.id === activeSessionId);
            const showWorkspaceNewButton =
              (hoveredWorkspaceId === workspace.id || isWorkspaceActive)
              && !(renameState?.type === 'workspace' && renameState.workspaceId === workspace.id);
            const workspaceNewTabTitle = getIconButtonTooltip({
              label: '新增 Terminal Tab',
              bindings: isWorkspaceActive ? bindings : undefined,
              actionId: isWorkspaceActive ? 'create-terminal-tab' : undefined,
            });

            return (
              <div key={workspace.id} style={{ marginBottom: 6 }}>
                <div
                  ref={(element) => {
                    if (element) workspaceRefs.current.set(workspace.id, element);
                    else workspaceRefs.current.delete(workspace.id);
                  }}
                  onClick={() => {
                    if (renameState?.type === 'workspace' && renameState.workspaceId === workspace.id) return;
                    handleToggleWorkspace(workspace.id);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenuState({
                      x: event.clientX,
                      y: event.clientY,
                      workspaceId: workspace.id,
                    });
                  }}
                  style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    backgroundColor:
                      hoveredWorkspaceId === workspace.id
                        ? 'var(--color-sidebar-workspace-hover)'
                        : isWorkspaceActive
                        ? 'var(--color-surface-hover-soft)'
                        : 'transparent',
                    color: 'var(--color-text-secondary)',
                    userSelect: 'none',
                    boxShadow:
                      hoveredWorkspaceId === workspace.id || isWorkspaceActive
                        ? 'var(--color-shadow-inset)'
                        : 'none',
                    transition: 'background-color 0.16s ease, box-shadow 0.16s ease',
                  }}
                  onMouseEnter={(event) => {
                    setHoveredWorkspaceId(workspace.id);
                  }}
                  onMouseLeave={(event) => {
                    setHoveredWorkspaceId((prev) => (prev === workspace.id ? null : prev));
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isWorkspaceActive ? 'var(--color-icon-active)' : 'var(--color-icon-default)',
                    }}
                  >
                    {workspace.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span
                    style={{
                      width: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--color-icon-folder)',
                    }}
                  >
                    <Folder size={14} />
                  </span>

                  {renameState?.type === 'workspace' && renameState.workspaceId === workspace.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameState.value}
                      onChange={(event) =>
                        setRenameState((prev) =>
                          prev ? { ...prev, value: event.target.value } : prev,
                        )
                      }
                      onBlur={handleCommitRename}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleCommitRename();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          handleCancelRename();
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: 6,
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        padding: '4px 6px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 12.5,
                      fontWeight: 600,
                      letterSpacing: 0.1,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {workspace.name}
                  </span>
                  )}

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void createSessionInWorkspace(workspace.id);
                    }}
                    title={workspaceNewTabTitle}
                    style={{
                      width: 18,
                      height: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: 999,
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-muted)',
                      cursor: showWorkspaceNewButton ? 'pointer' : 'default',
                      padding: 0,
                      flexShrink: 0,
                      opacity: showWorkspaceNewButton ? 1 : 0,
                      pointerEvents: showWorkspaceNewButton ? 'auto' : 'none',
                      transition: 'opacity 0.16s ease, background-color 0.16s ease, color 0.16s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = 'var(--color-sidebar-item-hover)';
                      event.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent';
                      event.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {workspace.isExpanded && (
                  <div style={{ marginTop: 4, paddingLeft: 10 }}>
                    {workspace.sessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      const attention = attentionBySessionId[session.id];
                      const hasAttention = !!attention;
                      const isHovered = hoveredSessionId === session.id;
                      const isRenamingSession =
                        renameState?.type === 'session' && renameState.sessionId === session.id;
                      const sessionRenameState =
                        isRenamingSession && renameState?.type === 'session'
                          ? renameState
                          : null;
                      const closeSessionTitle = getIconButtonTooltip({
                        label: '关闭 Terminal Tab',
                        bindings: isActive ? bindings : undefined,
                        actionId: isActive ? 'close-current-terminal-tab' : undefined,
                      });
                      return (
                        <div
                          key={session.id}
                          ref={(element) => {
                            if (element) sessionRefs.current.set(session.id, element);
                            else sessionRefs.current.delete(session.id);
                          }}
                          onClick={() => {
                            if (isRenamingSession) return;
                            handleSelectSession(session.id);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setMenuState({
                              x: event.clientX,
                              y: event.clientY,
                              workspaceId: workspace.id,
                              sessionId: session.id,
                            });
                          }}
                          style={{
                            height: ROW_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '0 10px 0 18px',
                            marginTop: 2,
                            borderRadius: 10,
                            cursor: 'pointer',
                            backgroundColor: isActive
                              ? 'var(--color-sidebar-item-active)'
                              : isHovered
                              ? 'var(--color-sidebar-item-hover)'
                              : 'transparent',
                            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            userSelect: 'none',
                            border: isActive ? '1px solid var(--color-sidebar-item-active-border)' : '1px solid transparent',
                            boxShadow: isActive ? 'var(--color-shadow-inset)' : 'none',
                            transition: 'background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
                          }}
                          onMouseEnter={(event) => {
                            setHoveredSessionId(session.id);
                          }}
                          onMouseLeave={(event) => {
                            setHoveredSessionId((prev) => (prev === session.id ? null : prev));
                          }}
                        >
                          <span
                            title={attention?.message}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: hasAttention
                                ? 'var(--color-attention)'
                                : isActive
                                ? 'var(--color-accent-primary)'
                                : 'var(--color-icon-default)',
                              boxShadow: hasAttention ? '0 0 0 4px var(--color-attention-soft)' : 'none',
                              flexShrink: 0,
                            }}
                          />
                          {isRenamingSession ? (
                            <input
                              ref={renameInputRef}
                              value={sessionRenameState?.value || ''}
                              onChange={(event) =>
                                setRenameState((prev) =>
                                  prev ? { ...prev, value: event.target.value } : prev,
                                )
                              }
                              onBlur={handleCommitRename}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleCommitRename();
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  handleCancelRename();
                                }
                              }}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                border: '1px solid var(--color-border-primary)',
                                borderRadius: 8,
                                backgroundColor: 'var(--color-surface-content-elevated)',
                                color: 'var(--color-text-primary)',
                                fontSize: 12,
                                padding: '4px 6px',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 12.5,
                                fontWeight: isActive ? 600 : 500,
                              }}
                            >
                              {getSessionDisplayLabel(session, sessionNameOverrides)}
                            </span>
                          )}
                          {!isRenamingSession && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCloseSession(workspace.id, session.id);
                              }}
                              title={closeSessionTitle}
                              style={{
                                width: 18,
                                height: 18,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                borderRadius: 999,
                                backgroundColor: 'transparent',
                                color: 'var(--color-text-muted)',
                                cursor: isActive || isHovered ? 'pointer' : 'default',
                                padding: 0,
                                flexShrink: 0,
                                opacity: isActive || isHovered ? 1 : 0,
                                pointerEvents: isActive || isHovered ? 'auto' : 'none',
                                transition: 'opacity 0.16s ease, background-color 0.16s ease, color 0.16s ease',
                              }}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.backgroundColor = 'var(--color-sidebar-item-hover)';
                                event.currentTarget.style.color = hasAttention ? 'var(--color-attention)' : 'var(--color-text-primary)';
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.backgroundColor = 'transparent';
                                event.currentTarget.style.color = 'var(--color-text-muted)';
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!sidebarCollapsed && (
          <div
            style={{
              height: SIDEBAR_FOOTER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 10px 10px',
              borderTop: '1px solid var(--color-border-secondary)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(true)}
              title={sidebarToggleTitle}
              style={{
                width: SIDEBAR_TOGGLE_SIZE,
                height: SIDEBAR_TOGGLE_SIZE,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border-primary)',
                backgroundColor: 'var(--color-surface-sidebar-elevated)',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                borderRadius: 999,
                padding: 0,
                boxShadow: 'var(--color-shadow-soft)',
                flexShrink: 0,
                transition: 'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-surface-content-elevated)';
                event.currentTarget.style.borderColor = 'var(--color-border-strong)';
                event.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-surface-sidebar-elevated)';
                event.currentTarget.style.borderColor = 'var(--color-border-primary)';
                event.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-surface-terminal)',
        }}
      >
        {workspaces.flatMap((workspace) =>
          workspace.sessions.map((session) => (
            <TerminalInstance
              key={session.id}
              sessionId={session.id}
              isActive={session.id === activeSessionId}
            />
          )),
        )}
      </div>

      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title={sidebarToggleTitle}
          style={{
            position: 'absolute',
            bottom: 12,
            left: 10,
            width: SIDEBAR_TOGGLE_SIZE,
            height: SIDEBAR_TOGGLE_SIZE,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            backgroundColor: 'var(--color-surface-sidebar-elevated)',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            borderRadius: 999,
            padding: 0,
            zIndex: 20,
            boxShadow: 'var(--color-shadow-soft)',
            transition: 'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = 'var(--color-surface-content-elevated)';
            event.currentTarget.style.borderColor = 'var(--color-border-strong)';
            event.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'var(--color-surface-sidebar-elevated)';
            event.currentTarget.style.borderColor = 'var(--color-border-primary)';
            event.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <PanelLeftOpen size={14} />
        </button>
      )}

      {menuState && menuItems.length > 0 && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuItems}
          onClose={() => setMenuState(null)}
        />
      )}
    </div>
  );
};

export default TerminalPanel;
