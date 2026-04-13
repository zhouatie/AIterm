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
import type { TerminalSessionInfo } from '../preload';
import { useKeyboardShortcuts } from '../ShortcutContext';
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

interface RenameState {
  workspaceId: string;
  value: string;
}

interface TerminalPanelProps {
  onActiveSessionChange?: (sessionId: string) => void;
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_HEADER_HEIGHT = 40;
const SIDEBAR_FOOTER_HEIGHT = 40;
const ROW_HEIGHT = 32;
const SIDEBAR_TOGGLE_SIZE = 24;

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

const TerminalPanel: React.FC<TerminalPanelProps> = ({ onActiveSessionChange }) => {
  const { registerAction } = useKeyboardShortcuts();
  const workspaceCounterRef = useRef(1);
  const initializedRef = useRef(false);
  const workspacesRef = useRef<WorkspaceNode[]>([]);
  const workspaceRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuState, setMenuState] = useState<SidebarMenuState | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);
  const sidebarWidth = sidebarCollapsed ? 0 : SIDEBAR_WIDTH;

  workspacesRef.current = workspaces;

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
    void createWorkspace();
  }, [createWorkspace]);

  useEffect(() => {
    return registerAction('toggle-terminal-sidebar', () => {
      setSidebarCollapsed((prev) => !prev);
    });
  }, [registerAction]);

  useEffect(() => {
    return registerAction('create-workspace', () => {
      void createWorkspace();
    });
  }, [registerAction, createWorkspace]);

  useEffect(() => {
    if (!activeSessionId) return;
    onActiveSessionChange?.(activeSessionId);
  }, [activeSessionId, onActiveSessionChange]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onSessionInfoChanged((info) => {
      applySessionInfo(info);
    });
    return unsubscribe;
  }, [applySessionInfo]);

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
  }, [renameState?.workspaceId]);

  const handleSelectSession = useCallback((sessionId: string) => {
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
  }, []);

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
    try {
      await window.terminalApi.dispose(sessionId);
    } catch {
      // Ignore dispose failures for already-closed sessions.
    }

    let nextActiveSessionId = '';
    let shouldCreateWorkspace = false;

    setWorkspaces((prev) => {
      const currentActiveSessionId = activeSessionId;
      const nextWorkspaces: WorkspaceNode[] = [];

      for (const workspace of prev) {
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

        const nextIndex = Math.min(closingIndex, remainingSessions.length - 1);
        const nextWorkspaceSession = remainingSessions[nextIndex];
        const nextLastActiveSessionId =
          workspace.lastActiveSessionId === sessionId
            ? nextWorkspaceSession.id
            : workspace.lastActiveSessionId;

        nextWorkspaces.push({
          ...workspace,
          currentPath:
            nextLastActiveSessionId === nextWorkspaceSession.id
              ? nextWorkspaceSession.cwd || workspace.currentPath
              : workspace.currentPath,
          lastActiveSessionId: nextLastActiveSessionId,
          sessions: remainingSessions,
        });

        if (currentActiveSessionId === sessionId) {
          nextActiveSessionId = nextWorkspaceSession.id;
        }
      }

      if (nextWorkspaces.length === 0) {
        shouldCreateWorkspace = true;
      } else if (!nextActiveSessionId && activeSessionId !== sessionId) {
        nextActiveSessionId = currentActiveSessionId;
      } else if (!nextActiveSessionId) {
        nextActiveSessionId = nextWorkspaces[0].lastActiveSessionId || nextWorkspaces[0].sessions[0].id;
      }

      return nextWorkspaces;
    });

    if (shouldCreateWorkspace) {
      setActiveSessionId('');
      await createWorkspace();
      return;
    }

    if (nextActiveSessionId) {
      setActiveSessionId(nextActiveSessionId);
    }
  }, [activeSessionId, createWorkspace]);

  const handleStartRename = useCallback((workspaceId: string) => {
    const workspace = workspacesRef.current.find((item) => item.id === workspaceId);
    if (!workspace) return;
    setRenameState({ workspaceId, value: workspace.name });
  }, []);

  const handleCommitRename = useCallback(() => {
    if (!renameState) return;

    const trimmed = renameState.value.trim();
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === renameState.workspaceId
          ? { ...workspace, name: trimmed || workspace.name }
          : workspace,
      ),
    );
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
          handleStartRename(workspace.id);
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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          width: sidebarWidth,
          height: '100%',
          borderRight: sidebarCollapsed ? 'none' : '1px solid var(--color-border-primary)',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.18s ease',
        }}
      >
        <div
          style={{
            height: SIDEBAR_HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? 0 : '0 8px',
            borderBottom: '1px solid var(--color-border-light)',
            flexShrink: 0,
          }}
        >
          {!sidebarCollapsed && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              Terminal
            </span>
          )}

          {!sidebarCollapsed && (
            <button
              onClick={() => void createWorkspace()}
              title="New Workspace"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                borderRadius: 6,
                padding: 0,
                flexShrink: 0,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
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
            padding: sidebarCollapsed ? '6px 0' : '6px 8px 12px',
          }}
        >
          {!sidebarCollapsed && workspaces.map((workspace) => {
            const isWorkspaceActive = workspace.sessions.some((session) => session.id === activeSessionId);
            const showWorkspaceNewButton =
              hoveredWorkspaceId === workspace.id && renameState?.workspaceId !== workspace.id;

            return (
              <div key={workspace.id} style={{ marginBottom: 6 }}>
                <div
                  ref={(element) => {
                    if (element) workspaceRefs.current.set(workspace.id, element);
                    else workspaceRefs.current.delete(workspace.id);
                  }}
                  onClick={() => {
                    if (renameState?.workspaceId === workspace.id) return;
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
                    gap: 6,
                    padding: '0 8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    backgroundColor: isWorkspaceActive ? 'var(--color-bg-hover)' : 'transparent',
                    color: 'var(--color-text-secondary)',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(event) => {
                    setHoveredWorkspaceId(workspace.id);
                    event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  }}
                  onMouseLeave={(event) => {
                    setHoveredWorkspaceId((prev) => (prev === workspace.id ? null : prev));
                    event.currentTarget.style.backgroundColor = isWorkspaceActive
                      ? 'var(--color-bg-hover)'
                      : 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--color-icon-default)',
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

                  {renameState?.workspaceId === workspace.id ? (
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
                        fontSize: 12,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {workspace.name}
                    </span>
                  )}

                  {showWorkspaceNewButton && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void createSessionInWorkspace(workspace.id);
                      }}
                      title="New Tab"
                      style={{
                        width: 18,
                        height: 18,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        borderRadius: '50%',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {workspace.isExpanded && (
                  <div style={{ marginTop: 2 }}>
                    {workspace.sessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      return (
                        <div
                          key={session.id}
                          ref={(element) => {
                            if (element) sessionRefs.current.set(session.id, element);
                            else sessionRefs.current.delete(session.id);
                          }}
                          onClick={() => handleSelectSession(session.id)}
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
                            padding: '0 8px 0 40px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            backgroundColor: isActive ? 'var(--color-bg-selected)' : 'transparent',
                            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            userSelect: 'none',
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.backgroundColor = isActive
                              ? 'var(--color-bg-selected)'
                              : 'var(--color-bg-hover)';
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.backgroundColor = isActive
                              ? 'var(--color-bg-selected)'
                              : 'transparent';
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: isActive
                                ? 'var(--color-accent-primary)'
                                : 'var(--color-icon-default)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 12,
                            }}
                          >
                            {session.displayLabel}
                          </span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCloseSession(workspace.id, session.id);
                            }}
                            title="Close Tab"
                            style={{
                              width: 18,
                              height: 18,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: '50%',
                              backgroundColor: 'transparent',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: 0,
                              flexShrink: 0,
                            }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <X size={12} />
                          </button>
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
              padding: '0 8px 8px',
              borderTop: '1px solid var(--color-border-light)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse Terminal Sidebar"
              style={{
                width: SIDEBAR_TOGGLE_SIZE,
                height: SIDEBAR_TOGGLE_SIZE,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border-primary)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                borderRadius: 999,
                padding: 0,
                boxShadow: '0 2px 6px var(--color-shadow)',
                flexShrink: 0,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
              }}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
          title="Expand Terminal Sidebar"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 8,
            width: SIDEBAR_TOGGLE_SIZE,
            height: SIDEBAR_TOGGLE_SIZE,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border-primary)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            borderRadius: 999,
            padding: 0,
            zIndex: 20,
            boxShadow: '0 2px 6px var(--color-shadow)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
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
