import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  FileText,
  Folder,
  FolderGit2,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  TerminalSquare,
  X,
} from 'lucide-react';
import type { TerminalAgentStatus, TerminalAgentStatusState, TerminalSessionInfo } from '../preload';
import type {
  OpenSpecArtifactId,
  OpenSpecArtifactStatus,
  OpenSpecChangeSummary,
  OpenSpecNextAction,
  OpenSpecWorkflowSummary,
} from '../utils/openspec-workflow';
import { isTerminalKeyboardTarget, useKeyboardShortcuts } from '../ShortcutContext';
import { getIconButtonTooltip } from '../utils/icon-button-tooltips';
import {
  loadTabState,
  saveTabState,
  saveTabStateSync,
  type PersistedTabState,
} from '../utils/tab-persistence';
import ContextMenu, { createPathMenuItems, type ContextMenuItem } from './ContextMenu';
import TerminalInstance from './TerminalInstance';
import type { TerminalInstanceHandle, TerminalScrollState } from './TerminalInstance';
import TerminalSearchBar from './TerminalSearchBar';
import { useTerminalUi } from '../contexts/terminal-ui';
import { useAgentStatus, type TerminalSessionSummary } from '../contexts/agent-status';
import {
  buildSddCommandPayload,
  getSddIntentSummary,
  isHighRiskSddAction,
  mapNextActionToCommandAction,
  parseSddCommand,
  type SddCommandAction,
  type SddCommandIntent,
  type SddCommandPayload,
} from '../utils/sdd-command-router';

interface WorkspaceNode {
  id: string;
  name: string;
  currentPath: string | null;
  lastActiveSessionId: string | null;
  isExpanded: boolean;
  sessions: TerminalSessionInfo[];
}

type SidebarMode = 'terminal' | 'spec';

interface SpecProjectSession {
  sessionId: string;
  workspaceId: string;
  workspaceName: string;
  sessionLabel: string;
  agentStatus?: TerminalAgentStatus;
  priority: number;
  order: number;
}

interface SpecProjectGroup {
  rootPath: string;
  rootLabel: string;
  sessions: SpecProjectSession[];
  targetSessionId: string | null;
  targetWorkspaceName: string | null;
  targetSessionLabel: string | null;
}

interface SpecChangeNavigationItem {
  key: string;
  project: SpecProjectGroup;
  change: OpenSpecChangeSummary;
  changes: OpenSpecChangeSummary[];
}

interface SpecProjectReadState {
  rootPath: string;
  loading: boolean;
  error: string | null;
  summary: OpenSpecWorkflowSummary | null;
}

interface SpecNavigationNotice {
  type: 'info' | 'error';
  message: string;
}

type SpecSelectableSkillAction = Extract<
  SddCommandAction,
  'continue' | 'update-change' | 'apply' | 'verify' | 'review' | 'archive'
>;

interface SpecSkillOption {
  action: SpecSelectableSkillAction;
  label: string;
  description: string;
  recommended: boolean;
}

interface PendingSpecSkillSelect {
  targetSessionId: string;
  targetSessionLabel: string;
  changeLabel: string;
  change: OpenSpecChangeSummary;
  changes: OpenSpecChangeSummary[];
  rootPath: string;
  options: SpecSkillOption[];
}

interface PendingSpecTerminalSelect {
  mode: 'activate' | 'next-step';
  rootPath: string;
  changeLabel: string;
  change: OpenSpecChangeSummary;
  changes: OpenSpecChangeSummary[];
  sessions: SpecProjectSession[];
}

interface PendingSpecAction {
  targetSessionId: string;
  targetSessionLabel: string;
  changeLabel: string;
  rootPath: string;
  change: OpenSpecChangeSummary;
  intent: SddCommandIntent;
  payload: SddCommandPayload;
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

interface DragState {
  sessionId: string;
  sourceWorkspaceId: string;
}

interface DropTarget {
  workspaceId: string;
  insertIndex: number;
}

interface TerminalPanelProps {
  initialDirectory?: string;
  preferWebglRenderer?: boolean;
  onActiveSessionChange?: (sessionId: string) => void;
}

const SIDEBAR_WIDTH = 224;
const SIDEBAR_HEADER_HEIGHT = 40;
const SIDEBAR_FOOTER_HEIGHT = 38;
const ROW_HEIGHT = 30;
const SIDEBAR_TOGGLE_SIZE = 26;
const TERMINAL_SCROLL_CONTROL_SIZE = 28;
/** Duration (ms) for the sidebar collapse/expand animation. */
const SIDEBAR_COLLAPSE_MS = 180;
const CLEAR_ON_SELECT_STATES: readonly TerminalAgentStatusState[] = [
  'needs_user',
  'completed',
  'error',
];
const AGENT_STATUS_PRIORITY: Record<TerminalAgentStatusState, number> = {
  needs_user: 5,
  error: 4,
  running: 3,
  completed: 2,
  idle: 1,
};

const SPEC_ACTION_LABELS: Record<OpenSpecNextAction, string> = {
  'create-proposal': '补 proposal',
  'create-prd': '补 PRD',
  'continue-design-specs': '补 design/specs',
  'create-tasks': '补 tasks',
  apply: 'Apply',
  'verify-review-archive': 'Verify / Review / Archive',
  inspect: '检查 tasks',
};

const SPEC_ARTIFACT_LABELS: Record<OpenSpecArtifactId, string> = {
  proposal: 'proposal',
  prd: 'PRD',
  design: 'design',
  specs: 'specs',
  tasks: 'tasks',
  task: 'TASK',
};

const SPEC_MAIN_SKILL_FLOW: readonly SpecSelectableSkillAction[] = [
  'continue',
  'apply',
  'verify',
  'review',
  'archive',
];

function getLastPathSegment(cwd: string): string {
  const trimmed = cwd.replace(/\/+$/, '');
  if (!trimmed) return cwd;
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || cwd;
}

function getWorkflowLabel(workflow: OpenSpecChangeSummary['workflow']): string {
  return workflow === 'raven' ? 'RavenSpec' : 'OpenSpec';
}

function getProjectRootPath(session: TerminalSessionInfo): string | null {
  const rootPath = session.gitRoot || session.cwd;
  const trimmed = rootPath?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

function getSpecChangeBindingKey(rootPath: string, change: OpenSpecChangeSummary): string {
  return JSON.stringify([rootPath, change.workflow, change.name]);
}

function isAgentCandidateStatus(status: TerminalAgentStatus | undefined): boolean {
  return !!status
    && (status.state === 'running' || status.state === 'needs_user' || status.state === 'error');
}

function getTaskProgressLabel(change: OpenSpecChangeSummary): string {
  const progress = change.taskProgress;
  if (!progress.hasTasksFile) return 'tasks 缺失';
  if (!progress.hasCheckboxes) return '无可统计任务';
  return `${progress.completed}/${progress.total}`;
}

function getArtifactTitle(artifact: OpenSpecArtifactStatus): string {
  const label = SPEC_ARTIFACT_LABELS[artifact.id];
  if (artifact.state === 'missing') return `${label} 尚未创建`;
  if (artifact.id === 'specs') return `打开 specs，${artifact.count ?? 0} 个 spec`;
  return `打开 ${label}`;
}

function getArtifactPath(artifact: OpenSpecArtifactStatus): string | null {
  if (artifact.state !== 'present') return null;
  return artifact.path;
}

function shouldConfirmSpecAction(intent: SddCommandIntent): boolean {
  return isHighRiskSddAction(intent.action)
    || intent.skippedActions.length > 0
    || intent.confidence === 'needs-confirmation';
}

function getCurrentSpecSkillAction(nextAction: OpenSpecNextAction): SpecSelectableSkillAction {
  const commandAction = mapNextActionToCommandAction(nextAction);
  if (commandAction === 'apply'
    || commandAction === 'verify'
    || commandAction === 'continue') {
    return commandAction;
  }
  return 'update-change';
}

function getSpecSkillLabel(
  workflow: OpenSpecChangeSummary['workflow'],
  action: SpecSelectableSkillAction,
): string {
  if (workflow === 'raven') {
    if (action === 'continue') return 'RavenSpec Continue Change';
    if (action === 'update-change') return 'DDD Update Change';
    if (action === 'apply') return 'RavenSpec Apply Change';
    if (action === 'verify') return 'RavenSpec Verify Change';
    if (action === 'review') return 'RavenSpec Plan Review';
    return 'RavenSpec Archive Change';
  }

  if (action === 'continue') return 'OpenSpec Continue Change';
  if (action === 'update-change') return 'OpenSpec Update Change';
  if (action === 'apply') return 'OpenSpec Apply Change';
  if (action === 'verify') return 'OpenSpec Verify Change';
  if (action === 'review') return 'OpenSpec Review';
  return 'OpenSpec Archive Change';
}

function getSpecSkillDescription(action: SpecSelectableSkillAction): string {
  if (action === 'continue') return '补齐当前 change 的下一份产物';
  if (action === 'update-change') return '更新并收敛当前 change 文档';
  if (action === 'apply') return '执行当前 change 的实现任务';
  if (action === 'verify') return '验证实现是否满足 change';
  if (action === 'review') return '评审当前 change 或实现';
  return '归档当前 change';
}

function createSpecSkillCommandText(action: SpecSelectableSkillAction): string {
  if (action === 'continue') return '继续当前';
  if (action === 'update-change') return '更新当前 change';
  if (action === 'apply') return '执行当前';
  if (action === 'verify') return '验证当前';
  if (action === 'review') return '评审当前';
  return '归档当前';
}

function getSpecSkillOptions(change: OpenSpecChangeSummary): SpecSkillOption[] {
  const currentAction = getCurrentSpecSkillAction(change.nextAction);
  const actions: SpecSelectableSkillAction[] = [];

  if (currentAction === 'update-change') {
    actions.push('update-change', 'apply', 'verify', 'review', 'archive');
  } else {
    const currentIndex = Math.max(0, SPEC_MAIN_SKILL_FLOW.indexOf(currentAction));
    for (const action of SPEC_MAIN_SKILL_FLOW.slice(currentIndex)) {
      actions.push(action);
      if ((action === 'continue' || action === 'apply') && currentAction === action) {
        actions.push('update-change');
      }
    }
  }

  return actions.map((action) => ({
    action,
    label: getSpecSkillLabel(change.workflow, action),
    description: getSpecSkillDescription(action),
    recommended: action === currentAction,
  }));
}

function createPlaceholderSessionInfo(id: string, cwd?: string): TerminalSessionInfo {
  const resolvedCwd = cwd || '';
  return {
    id,
    cwd: resolvedCwd,
    isGitRepo: false,
    branchName: null,
    gitRoot: null,
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

function getAgentDisplayName(agent: TerminalAgentStatus['agent']): string {
  if (agent === 'claude-code') return 'Claude Code';
  if (agent === 'opencode') return 'OpenCode';
  return 'Codex';
}

function getAgentStatusLabel(state: TerminalAgentStatusState): string {
  if (state === 'running') return '执行中';
  if (state === 'completed') return '执行完成';
  if (state === 'needs_user') return '待确认';
  if (state === 'error') return '异常';
  return '空闲';
}

function getAgentStatusColor(state: TerminalAgentStatusState, isActive: boolean): string {
  if (state === 'running') return 'var(--color-agent-status-running)';
  if (state === 'completed') return 'var(--color-agent-status-completed)';
  if (state === 'needs_user') return 'var(--color-attention)';
  if (state === 'error') return 'var(--color-agent-status-error)';
  return isActive ? 'var(--color-accent-primary)' : 'var(--color-tab-inactive-dot)';
}

function getAgentStatusSoftColor(state: TerminalAgentStatusState): string {
  if (state === 'running') return 'var(--color-agent-status-running-soft)';
  if (state === 'completed') return 'var(--color-agent-status-completed-soft)';
  if (state === 'needs_user') return 'var(--color-attention-soft)';
  if (state === 'error') return 'var(--color-agent-status-error-soft)';
  return 'transparent';
}

function getAgentStatusTooltip(status: TerminalAgentStatus | undefined): string | undefined {
  if (!status || status.state === 'idle') return undefined;
  const label = getAgentStatusLabel(status.state);
  const agent = getAgentDisplayName(status.agent);
  return `${agent} · ${label}\n${status.message}`;
}

function areTerminalScrollStatesEqual(
  left: TerminalScrollState | null,
  right: TerminalScrollState | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.isNormalBuffer === right.isNormalBuffer
    && left.hasScrollback === right.hasScrollback
    && left.isAtTop === right.isAtTop
    && left.isAtBottom === right.isAtBottom;
}

function resolveHighestAgentStatus(
  statuses: Iterable<TerminalAgentStatus>,
): TerminalAgentStatus | undefined {
  let highest: TerminalAgentStatus | undefined;
  for (const status of statuses) {
    if (status.state === 'idle') continue;
    if (!highest || AGENT_STATUS_PRIORITY[status.state] > AGENT_STATUS_PRIORITY[highest.state]) {
      highest = status;
    }
  }
  return highest;
}

function moveSessionBetweenWorkspaces(
  workspaces: WorkspaceNode[],
  dragState: DragState,
  dropTarget: DropTarget,
  activeSessionId: string,
): WorkspaceNode[] {
  if (dragState.sessionId === '' || dropTarget.workspaceId === '') {
    return workspaces;
  }

  const sourceWorkspace = findWorkspaceBySessionId(workspaces, dragState.sessionId);
  const targetWorkspace = workspaces.find((workspace) => workspace.id === dropTarget.workspaceId);
  if (!sourceWorkspace || !targetWorkspace) return workspaces;

  const sourceIndex = sourceWorkspace.sessions.findIndex((session) => session.id === dragState.sessionId);
  if (sourceIndex === -1) return workspaces;

  const movingSession = sourceWorkspace.sessions[sourceIndex];
  if (!movingSession) return workspaces;

  const sameWorkspace = sourceWorkspace.id === dropTarget.workspaceId;
  const rawInsertIndex = Math.max(0, Math.min(dropTarget.insertIndex, targetWorkspace.sessions.length));
  const normalizedInsertIndex = sameWorkspace && rawInsertIndex > sourceIndex
    ? rawInsertIndex - 1
    : rawInsertIndex;

  if (sameWorkspace && normalizedInsertIndex === sourceIndex) {
    return workspaces;
  }

  const nextWorkspaces: WorkspaceNode[] = [];

  for (const workspace of workspaces) {
    if (workspace.id === sourceWorkspace.id && workspace.id === dropTarget.workspaceId) {
      const remainingSessions = workspace.sessions.filter((session) => session.id !== dragState.sessionId);
      const boundedInsertIndex = Math.max(0, Math.min(normalizedInsertIndex, remainingSessions.length));
      const nextSessions = [...remainingSessions];
      nextSessions.splice(boundedInsertIndex, 0, movingSession);
      nextWorkspaces.push({
        ...workspace,
        isExpanded: true,
        sessions: nextSessions,
      });
      continue;
    }

    if (workspace.id === sourceWorkspace.id) {
      const remainingSessions = workspace.sessions.filter((session) => session.id !== dragState.sessionId);
      if (remainingSessions.length === 0) {
        continue;
      }
      nextWorkspaces.push({
        ...workspace,
        lastActiveSessionId:
          workspace.lastActiveSessionId === dragState.sessionId
            ? resolveWorkspaceActiveSessionId({ ...workspace, sessions: remainingSessions })
            : workspace.lastActiveSessionId,
        currentPath:
          workspace.lastActiveSessionId === dragState.sessionId
            ? remainingSessions[0]?.cwd || workspace.currentPath
            : workspace.currentPath,
        sessions: remainingSessions,
      });
      continue;
    }

    if (workspace.id === dropTarget.workspaceId) {
      const boundedInsertIndex = Math.max(0, Math.min(rawInsertIndex, workspace.sessions.length));
      const nextSessions = [...workspace.sessions];
      nextSessions.splice(boundedInsertIndex, 0, movingSession);
      nextWorkspaces.push({
        ...workspace,
        lastActiveSessionId:
          activeSessionId === movingSession.id ? movingSession.id : workspace.lastActiveSessionId,
        currentPath:
          activeSessionId === movingSession.id ? movingSession.cwd || workspace.currentPath : workspace.currentPath,
        isExpanded: true,
        sessions: nextSessions,
      });
      continue;
    }

    nextWorkspaces.push(workspace);
  }

  return nextWorkspaces;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  initialDirectory,
  preferWebglRenderer = true,
  onActiveSessionChange,
}) => {
  const revealTerminalUi = useTerminalUi();
  const { bindings, registerAction } = useKeyboardShortcuts();
  const workspaceCounterRef = useRef(1);
  const initializedRef = useRef(false);
  const workspacesRef = useRef<WorkspaceNode[]>([]);
  const sessionNameOverridesRef = useRef<Record<string, string>>({});
  const dragSnapshotRef = useRef<WorkspaceNode[] | null>(null);
  const didDropRef = useRef(false);
  const workspaceRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const specChangeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const renameInputRef = useRef<HTMLInputElement>(null);
  const specLoadTokenRef = useRef(0);
  const {
    agentStatusBySessionId,
    clearSessionAgentStatus,
    setSessionSummaries,
    registerSessionActivator,
  } = useAgentStatus();

  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [sessionNameOverrides, setSessionNameOverrides] = useState<Record<string, string>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('terminal');
  const [specRefreshVersion, setSpecRefreshVersion] = useState(0);
  const [specProjectStates, setSpecProjectStates] = useState<Record<string, SpecProjectReadState>>({});
  const [specNavigationNotice, setSpecNavigationNotice] = useState<SpecNavigationNotice | null>(null);
  const [specSessionBindings, setSpecSessionBindings] = useState<Record<string, string>>({});
  const [activeSpecChangeKey, setActiveSpecChangeKey] = useState<string | null>(null);
  const [pendingSpecTerminalSelect, setPendingSpecTerminalSelect] = useState<PendingSpecTerminalSelect | null>(null);
  const [pendingSpecSkillSelect, setPendingSpecSkillSelect] = useState<PendingSpecSkillSelect | null>(null);
  const [pendingSpecAction, setPendingSpecAction] = useState<PendingSpecAction | null>(null);
  const [menuState, setMenuState] = useState<SidebarMenuState | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isCmdHeld, setIsCmdHeld] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [activeScrollState, setActiveScrollState] = useState<TerminalScrollState | null>(null);
  const terminalInstanceRefs = useRef<Map<string, TerminalInstanceHandle>>(new Map());
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
  const refreshSpecTitle = '刷新 Spec';
  const sidebarToggleTitle = getIconButtonTooltip({
    label: sidebarCollapsed ? '展开 Terminal 侧边栏' : '收起 Terminal 侧边栏',
    bindings,
    actionId: 'toggle-terminal-sidebar',
  });

  workspacesRef.current = workspaces;
  sessionNameOverridesRef.current = sessionNameOverrides;

  const specProjectGroups = useMemo<SpecProjectGroup[]>(() => {
    const groups = new Map<string, SpecProjectSession[]>();
    let order = 0;

    for (const workspace of workspaces) {
      for (const session of workspace.sessions) {
        const rootPath = getProjectRootPath(session);
        if (!rootPath) continue;

        const groupSessions = groups.get(rootPath) ?? [];
        groupSessions.push({
          sessionId: session.id,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          sessionLabel: getSessionDisplayLabel(session, sessionNameOverrides),
          agentStatus: agentStatusBySessionId[session.id],
          priority: session.id === activeSessionId
            ? 3
            : workspace.lastActiveSessionId === session.id
            ? 2
            : 1,
          order: order++,
        });
        groups.set(rootPath, groupSessions);
      }
    }

    return [...groups.entries()]
      .map(([rootPath, sessions]) => {
        const sortedSessions = [...sessions].sort((a, b) => (
          b.priority - a.priority || a.order - b.order
        ));
        const targetSession = sortedSessions[0] ?? null;
        return {
          rootPath,
          rootLabel: getLastPathSegment(rootPath),
          sessions: sortedSessions,
          targetSessionId: targetSession?.sessionId ?? null,
          targetWorkspaceName: targetSession?.workspaceName ?? null,
          targetSessionLabel: targetSession?.sessionLabel ?? null,
        };
      })
      .sort((a, b) => a.rootLabel.localeCompare(b.rootLabel) || a.rootPath.localeCompare(b.rootPath));
  }, [activeSessionId, agentStatusBySessionId, sessionNameOverrides, workspaces]);

  const specProjectRootsKey = useMemo(
    () => specProjectGroups.map((group) => group.rootPath).join('\n'),
    [specProjectGroups],
  );
  const specProjectRootPaths = useMemo(
    () => specProjectRootsKey ? specProjectRootsKey.split('\n') : [],
    [specProjectRootsKey],
  );

  const updateActiveScrollState = useCallback((nextState: TerminalScrollState | null) => {
    setActiveScrollState((prevState) =>
      areTerminalScrollStatesEqual(prevState, nextState) ? prevState : nextState,
    );
  }, []);

  const refreshActiveTerminalScrollState = useCallback(() => {
    if (!activeSessionId) {
      updateActiveScrollState(null);
      return;
    }

    updateActiveScrollState(
      terminalInstanceRefs.current.get(activeSessionId)?.getScrollState() ?? null,
    );
  }, [activeSessionId, updateActiveScrollState]);

  const handleTerminalScrollStateChange = useCallback((
    sessionId: string,
    nextState: TerminalScrollState,
  ) => {
    if (sessionId !== activeSessionId) return;
    updateActiveScrollState(nextState);
  }, [activeSessionId, updateActiveScrollState]);

  const handleTerminalUserInput = useCallback((sessionId: string) => {
    clearSessionAgentStatus(sessionId, CLEAR_ON_SELECT_STATES);
  }, [clearSessionAgentStatus]);

  const scrollActiveTerminal = useCallback((direction: 'top' | 'bottom'): boolean => {
    if (!activeSessionId) return false;
    const terminalHandle = terminalInstanceRefs.current.get(activeSessionId);
    const scrollState = terminalHandle?.getScrollState();
    if (!terminalHandle || !scrollState?.isNormalBuffer) return false;

    if (!scrollState.hasScrollback) {
      terminalHandle.getTerminal()?.focus();
      updateActiveScrollState(scrollState);
      return true;
    }

    if (direction === 'top') {
      if (scrollState.isAtTop) {
        updateActiveScrollState(scrollState);
        return true;
      }
      terminalHandle.scrollToTop();
    } else {
      if (scrollState.isAtBottom) {
        updateActiveScrollState(scrollState);
        return true;
      }
      terminalHandle.scrollToBottom();
    }

    updateActiveScrollState(terminalHandle.getScrollState());
    return true;
  }, [activeSessionId, updateActiveScrollState]);

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

  useEffect(() => {
    return registerAction('toggle-terminal-sidebar-mode', () => {
      setSidebarMode((prev) => (prev === 'terminal' ? 'spec' : 'terminal'));
    });
  }, [registerAction]);

  // 按住 Command 时在 tab 旁边临时显示跳转序号 + terminal-local shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta') setIsCmdHeld(true);
      // Cmd+F to toggle terminal search bar
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        if (!isTerminalKeyboardTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        setSearchBarVisible((v) => !v);
        return;
      }

      if (
        event.metaKey
        && !event.ctrlKey
        && !event.altKey
        && !event.shiftKey
        && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        if (!isTerminalKeyboardTarget(event.target)) return;
        const didHandle = scrollActiveTerminal(event.key === 'ArrowUp' ? 'top' : 'bottom');
        if (!didHandle) return;
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta') setIsCmdHeld(false);
    };
    const handleBlur = () => setIsCmdHeld(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [scrollActiveTerminal]);

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
    const summaries: TerminalSessionSummary[] = workspaces.flatMap((workspace) =>
      workspace.sessions.map((session) => ({
        id: session.id,
        label: getSessionDisplayLabel(session, sessionNameOverrides),
        cwd: session.cwd,
        workspaceName: workspace.name,
      })),
    );
    setSessionSummaries(summaries);
  }, [sessionNameOverrides, setSessionSummaries, workspaces]);

  useEffect(() => {
    if (sidebarMode !== 'spec') return;

    const rootPaths = specProjectRootPaths;
    const loadToken = ++specLoadTokenRef.current;

    if (rootPaths.length === 0) {
      setSpecProjectStates({});
      setSpecNavigationNotice(null);
      return;
    }

    setSpecProjectStates((prev) => {
      const next: Record<string, SpecProjectReadState> = {};
      for (const rootPath of rootPaths) {
        next[rootPath] = {
          rootPath,
          loading: true,
          error: null,
          summary: prev[rootPath]?.summary ?? null,
        };
      }
      return next;
    });

    Promise.all(rootPaths.map(async (rootPath): Promise<SpecProjectReadState> => {
      try {
        const result = await window.openspecWorkflowApi.read(rootPath);
        if (result.error) {
          return {
            rootPath,
            loading: false,
            error: result.error,
            summary: null,
          };
        }
        return {
          rootPath,
          loading: false,
          error: null,
          summary: result.summary ?? null,
        };
      } catch (err) {
        return {
          rootPath,
          loading: false,
          error: (err as Error).message,
          summary: null,
        };
      }
    })).then((results) => {
      if (specLoadTokenRef.current !== loadToken) return;
      setSpecProjectStates(Object.fromEntries(results.map((result) => [result.rootPath, result])));
    }).catch(() => {
      // Individual reads already map errors into project states.
    });
  }, [sidebarMode, specProjectRootPaths, specRefreshVersion]);

  useEffect(() => {
    updateActiveScrollState(null);
    const frame = requestAnimationFrame(refreshActiveTerminalScrollState);
    return () => cancelAnimationFrame(frame);
  }, [refreshActiveTerminalScrollState, updateActiveScrollState]);

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
    if (sidebarMode === 'spec') {
      setMenuState(null);
      setHoveredWorkspaceId(null);
      setHoveredSessionId(null);
    } else {
      setPendingSpecTerminalSelect(null);
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
    }
  }, [sidebarMode]);

  useEffect(() => {
    if (!renameState) return;
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renameTargetKey]);

  const handleSelectSession = useCallback((sessionId: string) => {
    clearSessionAgentStatus(sessionId, CLEAR_ON_SELECT_STATES);
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
  }, [clearSessionAgentStatus]);

  const handleActivateSessionFromNotification = useCallback((sessionId: string): boolean => {
    if (!findWorkspaceBySessionId(workspacesRef.current, sessionId)) return false;

    revealTerminalUi();
    setSidebarCollapsed(false);
    handleSelectSession(sessionId);

    requestAnimationFrame(() => {
      terminalInstanceRefs.current.get(sessionId)?.getTerminal()?.focus();
    });
    return true;
  }, [handleSelectSession, revealTerminalUi]);

  useEffect(() => (
    registerSessionActivator(handleActivateSessionFromNotification)
  ), [handleActivateSessionFromNotification, registerSessionActivator]);

  useEffect(() => {
    const unsubscribe = window.terminalApi.onActivateSession(({ id }) => {
      handleActivateSessionFromNotification(id);
    });
    return unsubscribe;
  }, [handleActivateSessionFromNotification]);

  const selectRelativeTerminalSession = useCallback((direction: -1 | 1) => {
    const sessionIds = getOrderedSessionIds(workspacesRef.current);
    if (sessionIds.length <= 1) return;

    const currentIndex = sessionIds.findIndex((sessionId) => sessionId === activeSessionId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + sessionIds.length) % sessionIds.length;
    const nextSessionId = sessionIds[nextIndex];
    if (!nextSessionId || nextSessionId === activeSessionId) return;

    handleSelectSession(nextSessionId);
  }, [activeSessionId, handleSelectSession]);

  // 按 1-based 编号直接跳转到指定 terminal tab；超出范围时静默无效
  const selectTerminalTabByIndex = useCallback((oneBased: number) => {
    const sessionIds = getOrderedSessionIds(workspacesRef.current);
    if (oneBased < 1 || oneBased > sessionIds.length) return;
    const targetId = sessionIds[oneBased - 1];
    if (!targetId) return;
    handleSelectSession(targetId);
  }, [handleSelectSession]);

  useEffect(() => {
    const cleanups = [
      registerAction('select-terminal-tab-1', () => selectTerminalTabByIndex(1)),
      registerAction('select-terminal-tab-2', () => selectTerminalTabByIndex(2)),
      registerAction('select-terminal-tab-3', () => selectTerminalTabByIndex(3)),
      registerAction('select-terminal-tab-4', () => selectTerminalTabByIndex(4)),
      registerAction('select-terminal-tab-5', () => selectTerminalTabByIndex(5)),
      registerAction('select-terminal-tab-6', () => selectTerminalTabByIndex(6)),
      registerAction('select-terminal-tab-7', () => selectTerminalTabByIndex(7)),
      registerAction('select-terminal-tab-8', () => selectTerminalTabByIndex(8)),
      // select-terminal-tab-9 固定跳转到最后一个 tab（与浏览器 / iTerm2 行为一致）
      registerAction('select-terminal-tab-9', () => {
        const sessionIds = getOrderedSessionIds(workspacesRef.current);
        if (sessionIds.length === 0) return;
        const lastId = sessionIds[sessionIds.length - 1];
        if (lastId) handleSelectSession(lastId);
      }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [registerAction, selectTerminalTabByIndex, handleSelectSession]);

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
    clearSessionAgentStatus(sessionId);
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
  }, [activeSessionId, clearSessionAgentStatus, createWorkspace, initialDirectory]);

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
      clearSessionAgentStatus(session.id);
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
  }, [activeSessionId, clearSessionAgentStatus, createWorkspace, initialDirectory]);

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

  const clearDragState = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
    dragSnapshotRef.current = null;
    didDropRef.current = false;
  }, []);

  const updateDropTarget = useCallback((nextTarget: DropTarget | null) => {
    setDropTarget((prev) => {
      if (!prev && !nextTarget) return prev;
      if (prev && nextTarget
        && prev.workspaceId === nextTarget.workspaceId
        && prev.insertIndex === nextTarget.insertIndex) {
        return prev;
      }
      return nextTarget;
    });
  }, []);

  const handleSessionDragStart = useCallback((
    event: React.DragEvent<HTMLDivElement>,
    workspaceId: string,
    sessionId: string,
  ) => {
    if (renameState?.type === 'session' && renameState.sessionId === sessionId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sessionId);
    dragSnapshotRef.current = workspacesRef.current;
    didDropRef.current = false;
    setDragState({
      sessionId,
      sourceWorkspaceId: workspaceId,
    });
    updateDropTarget(null);
  }, [renameState, updateDropTarget]);

  const handleSessionDragEnd = useCallback(() => {
    if (!didDropRef.current && dragSnapshotRef.current) {
      setWorkspaces(dragSnapshotRef.current);
    }
    clearDragState();
  }, [clearDragState]);

  const handleSessionDragOver = useCallback((
    event: React.DragEvent<HTMLDivElement>,
    workspaceId: string,
    sessionIndex: number,
  ) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const bounds = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY >= bounds.top + bounds.height / 2;
    const nextTarget = {
      workspaceId,
      insertIndex: sessionIndex + (isAfter ? 1 : 0),
    };
    updateDropTarget(nextTarget);
    const nextWorkspaces = moveSessionBetweenWorkspaces(
      workspacesRef.current,
      dragState,
      nextTarget,
      activeSessionId,
    );
    if (nextWorkspaces !== workspacesRef.current) {
      setWorkspaces(nextWorkspaces);
    }
  }, [activeSessionId, dragState, updateDropTarget]);

  const handleWorkspaceDragOver = useCallback((
    event: React.DragEvent<HTMLDivElement>,
    workspaceId: string,
    fallbackInsertIndex: number,
  ) => {
    if (!dragState) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const nextTarget = {
      workspaceId,
      insertIndex: fallbackInsertIndex,
    };
    updateDropTarget(nextTarget);
    const expandedWorkspaces = workspacesRef.current.map((workspace) =>
      workspace.id === workspaceId && !workspace.isExpanded
        ? { ...workspace, isExpanded: true }
        : workspace,
    );
    const nextWorkspaces = moveSessionBetweenWorkspaces(
      expandedWorkspaces,
      dragState,
      nextTarget,
      activeSessionId,
    );
    if (nextWorkspaces !== workspacesRef.current) {
      setWorkspaces(nextWorkspaces);
    } else if (expandedWorkspaces !== workspacesRef.current) {
      setWorkspaces(expandedWorkspaces);
    }
  }, [activeSessionId, dragState, updateDropTarget]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    didDropRef.current = true;
    clearDragState();
  }, [clearDragState, dragState]);

  const handleRefreshSpecProjects = useCallback(() => {
    setSpecRefreshVersion((version) => version + 1);
  }, []);

  const handleOpenSpecArtifact = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    artifact: OpenSpecArtifactStatus,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const artifactPath = getArtifactPath(artifact);
    if (!artifactPath) return;
    window.fileApi.openFilePreview(artifactPath);
  }, []);

  const executeSpecActionPayload = useCallback((
    targetSessionId: string,
    targetSessionLabel: string,
    payload: SddCommandPayload,
  ): boolean => {
    if (!findWorkspaceBySessionId(workspacesRef.current, targetSessionId)) {
      setSpecNavigationNotice({ type: 'error', message: '目标 terminal tab 不可用，无法执行下一步操作。' });
      return false;
    }

    window.terminalApi.input(targetSessionId, `${payload.terminalInput}\r`);
    setSpecNavigationNotice({ type: 'info', message: `已在 ${targetSessionLabel} 执行下一步操作。` });
    return true;
  }, []);

  const bindSpecChangeSession = useCallback((
    rootPath: string,
    change: OpenSpecChangeSummary,
    sessionId: string,
  ) => {
    const bindingKey = getSpecChangeBindingKey(rootPath, change);
    setSpecSessionBindings((prev) => (
      prev[bindingKey] === sessionId ? prev : { ...prev, [bindingKey]: sessionId }
    ));
  }, []);

  const clearSpecChangeBinding = useCallback((
    rootPath: string,
    change: OpenSpecChangeSummary,
  ) => {
    const bindingKey = getSpecChangeBindingKey(rootPath, change);
    setSpecSessionBindings((prev) => {
      if (!prev[bindingKey]) return prev;
      const next = { ...prev };
      delete next[bindingKey];
      return next;
    });
  }, []);

  const getAvailableSpecSessions = useCallback((project: SpecProjectGroup): SpecProjectSession[] => (
    project.sessions.filter((session) => findWorkspaceBySessionId(workspacesRef.current, session.sessionId))
  ), []);

  const resolveSpecChangeSession = useCallback((
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
    mode: PendingSpecTerminalSelect['mode'],
  ): SpecProjectSession | null => {
    const bindingKey = getSpecChangeBindingKey(project.rootPath, change);
    const boundSessionId = specSessionBindings[bindingKey] ?? null;
    const availableSessions = getAvailableSpecSessions(project);

    if (boundSessionId) {
      const boundSession = availableSessions.find((session) => session.sessionId === boundSessionId) ?? null;
      if (boundSession) return boundSession;
      clearSpecChangeBinding(project.rootPath, change);
    }

    if (availableSessions.length === 0) {
      setPendingSpecTerminalSelect(null);
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: '无法定位对应 terminal tab。' });
      return null;
    }

    const agentCandidates = availableSessions.filter((session) => (
      isAgentCandidateStatus(session.agentStatus)
    ));
    const autoSelectedSession = agentCandidates.length === 1
      ? agentCandidates[0]
      : availableSessions.length === 1
        ? availableSessions[0]
        : null;

    if (autoSelectedSession) {
      bindSpecChangeSession(project.rootPath, change, autoSelectedSession.sessionId);
      return autoSelectedSession;
    }

    setPendingSpecSkillSelect(null);
    setPendingSpecAction(null);
    setSpecNavigationNotice(null);
    setPendingSpecTerminalSelect({
      mode,
      rootPath: project.rootPath,
      changeLabel: `${getWorkflowLabel(change.workflow)} · ${change.name}`,
      change,
      changes,
      sessions: availableSessions,
    });
    return null;
  }, [
    bindSpecChangeSession,
    clearSpecChangeBinding,
    getAvailableSpecSessions,
    specSessionBindings,
  ]);

  const openSpecSkillSelectForSession = useCallback((
    rootPath: string,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
    targetSession: SpecProjectSession,
  ) => {
    if (!findWorkspaceBySessionId(workspacesRef.current, targetSession.sessionId)) {
      clearSpecChangeBinding(rootPath, change);
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: '目标 terminal tab 不可用，无法执行下一步操作。' });
      return;
    }

    const options = getSpecSkillOptions(change);
    if (options.length === 0) {
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: '当前没有可用的下一步 Skill。' });
      return;
    }

    setPendingSpecAction(null);
    setSpecNavigationNotice(null);
    setPendingSpecSkillSelect({
      targetSessionId: targetSession.sessionId,
      targetSessionLabel: targetSession.sessionLabel,
      changeLabel: `${getWorkflowLabel(change.workflow)} · ${change.name}`,
      change,
      changes,
      rootPath,
      options,
    });
  }, [clearSpecChangeBinding]);

  const activateSpecProjectSession = useCallback((session: SpecProjectSession) => {
    handleSelectSession(session.sessionId);

    requestAnimationFrame(() => {
      terminalInstanceRefs.current.get(session.sessionId)?.getTerminal()?.focus();
    });
  }, [handleSelectSession]);

  const handleOpenSpecSkillSelect = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const targetSession = resolveSpecChangeSession(project, change, changes, 'next-step');
    if (!targetSession) return;
    openSpecSkillSelectForSession(project.rootPath, change, changes, targetSession);
  }, [openSpecSkillSelectForSession, resolveSpecChangeSession]);

  const handleOpenSpecTerminalSelect = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const availableSessions = getAvailableSpecSessions(project);
    if (availableSessions.length === 0) {
      clearSpecChangeBinding(project.rootPath, change);
      setPendingSpecTerminalSelect(null);
      setSpecNavigationNotice({ type: 'error', message: '无法定位对应 terminal tab。' });
      return;
    }

    setPendingSpecSkillSelect(null);
    setPendingSpecAction(null);
    setSpecNavigationNotice(null);
    setPendingSpecTerminalSelect({
      mode: 'activate',
      rootPath: project.rootPath,
      changeLabel: `${getWorkflowLabel(change.workflow)} · ${change.name}`,
      change,
      changes,
      sessions: availableSessions,
    });
  }, [clearSpecChangeBinding, getAvailableSpecSessions]);

  const handleSelectSpecSkill = useCallback((action: SpecSelectableSkillAction) => {
    if (!pendingSpecSkillSelect) return;

    const {
      targetSessionId,
      targetSessionLabel,
      change,
      changes,
      rootPath,
      changeLabel,
    } = pendingSpecSkillSelect;

    if (!findWorkspaceBySessionId(workspacesRef.current, targetSessionId)) {
      clearSpecChangeBinding(rootPath, change);
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: '目标 terminal tab 不可用，无法执行下一步操作。' });
      return;
    }

    const text = createSpecSkillCommandText(action);
    const intent = parseSddCommand({
      text,
      rootPath,
      currentChange: { workflow: change.workflow, changeName: change.name, rootPath },
      changes,
      nextActionChange: change,
    });

    if (intent.confidence === 'unsupported' || intent.confidence === 'ambiguous') {
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: intent.message ?? '无法生成下一步操作。' });
      return;
    }

    try {
      const payload = buildSddCommandPayload(intent);
      setPendingSpecSkillSelect(null);
      if (shouldConfirmSpecAction(intent)) {
        setPendingSpecAction({
          targetSessionId,
          targetSessionLabel,
          changeLabel,
          rootPath,
          change,
          intent,
          payload,
        });
        setSpecNavigationNotice(null);
        return;
      }

      setPendingSpecAction(null);
      executeSpecActionPayload(targetSessionId, targetSessionLabel, payload);
    } catch (err) {
      setPendingSpecSkillSelect(null);
      setPendingSpecAction(null);
      setSpecNavigationNotice({ type: 'error', message: (err as Error).message });
    }
  }, [clearSpecChangeBinding, executeSpecActionPayload, pendingSpecSkillSelect]);

  const handleConfirmSpecAction = useCallback(() => {
    if (!pendingSpecAction) return;
    if (!executeSpecActionPayload(
      pendingSpecAction.targetSessionId,
      pendingSpecAction.targetSessionLabel,
      pendingSpecAction.payload,
    )) {
      clearSpecChangeBinding(pendingSpecAction.rootPath, pendingSpecAction.change);
      return;
    }
    setPendingSpecAction(null);
  }, [clearSpecChangeBinding, executeSpecActionPayload, pendingSpecAction]);

  const handleCancelSpecAction = useCallback(() => {
    setPendingSpecAction(null);
    setSpecNavigationNotice({ type: 'info', message: '已取消下一步操作。' });
  }, []);

  const handleCancelSpecSkillSelect = useCallback(() => {
    setPendingSpecSkillSelect(null);
    setSpecNavigationNotice({ type: 'info', message: '已取消下一步选择。' });
  }, []);

  const handleCancelSpecTerminalSelect = useCallback(() => {
    setPendingSpecTerminalSelect(null);
    setSpecNavigationNotice({ type: 'info', message: '已取消 terminal 绑定。' });
  }, []);

  const handleSelectSpecTerminal = useCallback((sessionId: string) => {
    if (!pendingSpecTerminalSelect) return;
    const targetSession = pendingSpecTerminalSelect.sessions.find((session) => session.sessionId === sessionId);
    if (!targetSession || !findWorkspaceBySessionId(workspacesRef.current, sessionId)) {
      clearSpecChangeBinding(pendingSpecTerminalSelect.rootPath, pendingSpecTerminalSelect.change);
      setPendingSpecTerminalSelect(null);
      setSpecNavigationNotice({ type: 'error', message: '目标 terminal tab 不可用，请重新选择。' });
      return;
    }

    bindSpecChangeSession(
      pendingSpecTerminalSelect.rootPath,
      pendingSpecTerminalSelect.change,
      targetSession.sessionId,
    );
    setPendingSpecTerminalSelect(null);
    setSpecNavigationNotice(null);

    if (pendingSpecTerminalSelect.mode === 'activate') {
      activateSpecProjectSession(targetSession);
      return;
    }

    openSpecSkillSelectForSession(
      pendingSpecTerminalSelect.rootPath,
      pendingSpecTerminalSelect.change,
      pendingSpecTerminalSelect.changes,
      targetSession,
    );
  }, [
    activateSpecProjectSession,
    bindSpecChangeSession,
    clearSpecChangeBinding,
    openSpecSkillSelectForSession,
    pendingSpecTerminalSelect,
  ]);

  const handleSelectSpecProjectSession = useCallback((
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
  ) => {
    setActiveSpecChangeKey(getSpecChangeBindingKey(project.rootPath, change));
    const targetSession = resolveSpecChangeSession(project, change, changes, 'activate');
    if (!targetSession) return;

    setSpecNavigationNotice(null);
    activateSpecProjectSession(targetSession);
  }, [activateSpecProjectSession, resolveSpecChangeSession]);

  const handleSpecChangeKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLDivElement>,
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    handleSelectSpecProjectSession(project, change, changes);
  }, [handleSelectSpecProjectSession]);

  const getVisibleSpecChangeNavigationItems = useCallback((): SpecChangeNavigationItem[] => {
    const items: SpecChangeNavigationItem[] = [];

    for (const project of specProjectGroups) {
      const projectState = specProjectStates[project.rootPath];
      if (!projectState || projectState.loading || projectState.error) continue;

      const changes = projectState.summary?.changes ?? [];
      if (changes.length === 0) continue;

      for (const change of changes) {
        items.push({
          key: getSpecChangeBindingKey(project.rootPath, change),
          project,
          change,
          changes,
        });
      }
    }

    return items;
  }, [specProjectGroups, specProjectStates]);

  const selectRelativeSpecChangeCard = useCallback((direction: -1 | 1) => {
    const items = getVisibleSpecChangeNavigationItems();
    if (items.length === 0) return;

    let currentIndex = activeSpecChangeKey
      ? items.findIndex((item) => item.key === activeSpecChangeKey)
      : -1;

    if (currentIndex === -1 && activeSessionId) {
      currentIndex = items.findIndex((item) => specSessionBindings[item.key] === activeSessionId);
    }

    if (currentIndex === -1 && activeSessionId) {
      currentIndex = items.findIndex((item) => (
        item.project.sessions.some((session) => session.sessionId === activeSessionId)
      ));
    }

    const nextIndex = currentIndex === -1
      ? direction === 1 ? 0 : items.length - 1
      : (currentIndex + direction + items.length) % items.length;
    const targetItem = items[nextIndex];
    if (!targetItem) return;

    setActiveSpecChangeKey(targetItem.key);
    requestAnimationFrame(() => {
      specChangeRefs.current.get(targetItem.key)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    handleSelectSpecProjectSession(targetItem.project, targetItem.change, targetItem.changes);
  }, [
    activeSessionId,
    activeSpecChangeKey,
    getVisibleSpecChangeNavigationItems,
    handleSelectSpecProjectSession,
    specSessionBindings,
  ]);

  const selectRelativeTerminalNavigationItem = useCallback((direction: -1 | 1) => {
    if (!sidebarCollapsed && sidebarMode === 'spec') {
      selectRelativeSpecChangeCard(direction);
      return;
    }

    selectRelativeTerminalSession(direction);
  }, [
    selectRelativeSpecChangeCard,
    selectRelativeTerminalSession,
    sidebarCollapsed,
    sidebarMode,
  ]);

  useEffect(() => {
    return registerAction('select-previous-terminal-tab', () => {
      selectRelativeTerminalNavigationItem(-1);
    });
  }, [registerAction, selectRelativeTerminalNavigationItem]);

  useEffect(() => {
    return registerAction('select-next-terminal-tab', () => {
      selectRelativeTerminalNavigationItem(1);
    });
  }, [registerAction, selectRelativeTerminalNavigationItem]);

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

  // 按编号跳转时每个 session 对应的显示数字：1–8 为位置序号，最后一个固定为 9，其余为 null
  const orderedSessionIds = getOrderedSessionIds(workspaces);
  const getTabShortcutNumber = (sessionId: string): string | null => {
    const index = orderedSessionIds.indexOf(sessionId);
    const total = orderedSessionIds.length;
    if (index === -1) return null;
    if (index === total - 1) return '9';
    if (index < 8) return String(index + 1);
    return null;
  };
  const renderSpecChangeCard = (
    project: SpecProjectGroup,
    change: OpenSpecChangeSummary,
    changes: OpenSpecChangeSummary[],
  ) => {
    const bindingKey = getSpecChangeBindingKey(project.rootPath, change);
    const boundSessionId = specSessionBindings[bindingKey] ?? null;
    const boundSession = boundSessionId
      ? project.sessions.find((session) => session.sessionId === boundSessionId) ?? null
      : null;
    const targetSessionLabel = boundSession?.sessionLabel ?? project.targetSessionLabel ?? '未绑定';
    const targetWorkspaceLabel = boundSession?.workspaceName ?? project.targetWorkspaceName ?? 'workspace';
    const targetTitle = `重新绑定 terminal：${targetWorkspaceLabel} / ${targetSessionLabel}`;
    const isActiveSpecChange = activeSpecChangeKey === bindingKey;

    return (
      <div
        key={bindingKey}
        ref={(element) => {
          if (element) {
            specChangeRefs.current.set(bindingKey, element);
          } else {
            specChangeRefs.current.delete(bindingKey);
          }
        }}
        className={'terminal-spec-change-card' + (isActiveSpecChange ? ' active' : '')}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectSpecProjectSession(project, change, changes)}
        onKeyDown={(event) => handleSpecChangeKeyDown(event, project, change, changes)}
        title={`绑定/切换右侧 terminal：${targetWorkspaceLabel} / ${targetSessionLabel}`}
      >
        <div className="terminal-spec-change-card-header">
          <div className="terminal-spec-change-title" title={change.name}>
            <span className="terminal-spec-workflow">{getWorkflowLabel(change.workflow)}</span>
            <span>{change.name}</span>
          </div>
          <span className="terminal-spec-next-action">{SPEC_ACTION_LABELS[change.nextAction]}</span>
        </div>

        <div className="terminal-spec-artifact-grid">
          {change.artifactIds.map((artifactId) => {
            const artifact = change.artifacts[artifactId];
            if (!artifact) return null;
            const present = artifact.state === 'present';
            return (
              <button
                key={artifact.id}
                type="button"
                className={'terminal-spec-artifact-pill' + (present ? ' present' : ' missing')}
                onClick={(event) => handleOpenSpecArtifact(event, artifact)}
                disabled={!present}
                title={getArtifactTitle(artifact)}
              >
                {present ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                <span>{SPEC_ARTIFACT_LABELS[artifact.id]}</span>
                {artifact.id === 'specs' && present && (
                  <span className="terminal-spec-artifact-count">{artifact.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="terminal-spec-change-footer">
          <span className="terminal-spec-task-progress">
            <ListChecks size={12} />
            {getTaskProgressLabel(change)}
          </span>
          <button
            type="button"
            className="terminal-spec-next-step"
            onClick={(event) => handleOpenSpecTerminalSelect(event, project, change, changes)}
            title={targetTitle}
          >
            <TerminalSquare size={11} />
            <span>目标：{targetSessionLabel}</span>
          </button>
          <button
            type="button"
            className="terminal-spec-next-step"
            onClick={(event) => handleOpenSpecSkillSelect(event, project, change, changes)}
            title={`选择下一步 Skill：${SPEC_ACTION_LABELS[change.nextAction]}，目标 ${targetSessionLabel}`}
          >
            <ChevronRight size={11} />
            <span>下一步</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSpecProjectGroup = (project: SpecProjectGroup) => {
    const projectState = specProjectStates[project.rootPath];
    const loading = projectState?.loading ?? false;
    const error = projectState?.error ?? null;
    const changes = projectState?.summary?.changes ?? [];

    if (!loading && !error && changes.length === 0) {
      return null;
    }

    return (
      <section key={project.rootPath} className="terminal-spec-project">
        <div className="terminal-spec-project-header">
          <FolderGit2 size={13} />
          <div className="terminal-spec-project-title">
            <span title={project.rootPath}>{project.rootLabel}</span>
            <small title={project.rootPath}>{project.rootPath}</small>
          </div>
        </div>

        {loading && (
          <div className="terminal-spec-state">
            <RefreshCw size={13} className="terminal-spec-spin" />
            <span>Loading...</span>
          </div>
        )}

        {!loading && error && (
          <div className="terminal-spec-state error">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && changes.length > 0 && (
          <div className="terminal-spec-change-list">
            {changes.map((change) => renderSpecChangeCard(project, change, changes))}
          </div>
        )}
      </section>
    );
  };

  const aggregateAgentStatus = resolveHighestAgentStatus(Object.values(agentStatusBySessionId));
  const aggregateAgentStatusTooltip = getAgentStatusTooltip(aggregateAgentStatus);
  const sidebarToggleTitleWithStatus = aggregateAgentStatusTooltip
    ? `${sidebarToggleTitle}\n${aggregateAgentStatusTooltip}`
    : sidebarToggleTitle;
  const showTerminalScrollControls = Boolean(
    activeScrollState?.isNormalBuffer && activeScrollState.hasScrollback,
  );
  const isScrollToTopDisabled = !activeScrollState || activeScrollState.isAtTop;
  const isScrollToBottomDisabled = !activeScrollState || activeScrollState.isAtBottom;
  const scrollControlTop = searchBarVisible ? 50 : 12;

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
      {/* Outer wrapper — controls layout width; delays width→0 until animation ends */}
      <div
        style={{
          width: sidebarWidth,
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden',
          // Collapse: delay width→0 until transform animation finishes (no reflow during animation)
          // Expand: restore width immediately so terminal area shrinks in sync with slide-in
          transition: sidebarCollapsed
            ? `width 0s ${SIDEBAR_COLLAPSE_MS}ms`
            : 'width 0s',
        }}
      >
        {/* Inner content — compositor-only transform animation, no layout reflow */}
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: '100%',
            borderRight: '1px solid var(--color-window-chrome-border)',
            background: 'var(--color-surface-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--color-shadow-inset)',
            backdropFilter: 'blur(24px) saturate(180%)',
            transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition: `transform ${SIDEBAR_COLLAPSE_MS}ms ease`,
          }}
        >
        <div
          style={{
            height: SIDEBAR_HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? 0 : '0 10px',
            borderBottom: '1px solid var(--color-border-secondary)',
            flexShrink: 0,
          }}
        >
          {!sidebarCollapsed && (
            <div className="terminal-sidebar-mode-switch" role="tablist" aria-label="Terminal 侧边栏模式">
              <button
                type="button"
                role="tab"
                aria-selected={sidebarMode === 'terminal'}
                className={'terminal-sidebar-mode-button' + (sidebarMode === 'terminal' ? ' active' : '')}
                onClick={() => setSidebarMode('terminal')}
              >
                Terminal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarMode === 'spec'}
                className={'terminal-sidebar-mode-button' + (sidebarMode === 'spec' ? ' active' : '')}
                onClick={() => setSidebarMode('spec')}
              >
                Spec
              </button>
            </div>
          )}

          {!sidebarCollapsed && sidebarMode === 'terminal' && (
            <button
              onClick={() => void createWorkspace()}
              title={createWorkspaceTitle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
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
              <Plus size={14} />
            </button>
          )}
          {!sidebarCollapsed && sidebarMode === 'spec' && (
            <button
              type="button"
              onClick={handleRefreshSpecProjects}
              title={refreshSpecTitle}
              aria-label={refreshSpecTitle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
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
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed ? '8px 0' : '8px 8px 10px',
          }}
        >
          {!sidebarCollapsed && sidebarMode === 'terminal' && workspaces.map((workspace) => {
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
              <div key={workspace.id} style={{ marginBottom: 4 }}>
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
                  onDragOver={(event) => {
                    if (!workspace.isExpanded) {
                      handleWorkspaceDragOver(event, workspace.id, workspace.sessions.length);
                    }
                  }}
                  onDrop={handleDrop}
                  style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    backgroundColor:
                      dragState && dropTarget?.workspaceId === workspace.id && !workspace.isExpanded
                        ? 'var(--color-sidebar-workspace-hover)'
                        : hoveredWorkspaceId === workspace.id
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
                      width: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isWorkspaceActive ? 'var(--color-icon-active)' : 'var(--color-icon-default)',
                    }}
                  >
                    {workspace.isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                  <span
                    style={{
                      width: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--color-icon-folder)',
                    }}
                  >
                    <Folder size={13} />
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
                        padding: '3px 5px',
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
                      width: 16,
                      height: 16,
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
                    <Plus size={11} />
                  </button>
                </div>

                {workspace.isExpanded && (
                  <div
                    style={{ marginTop: 2, paddingLeft: 6 }}
                    onDragOver={(event) => {
                      if (!dragState) return;
                      if (workspace.sessions.length > 0) return;
                      handleWorkspaceDragOver(event, workspace.id, 0);
                    }}
                    onDrop={handleDrop}
                  >
                    {workspace.sessions.map((session, sessionIndex) => {
                      const isActive = session.id === activeSessionId;
                      const agentStatus = agentStatusBySessionId[session.id];
                      const hasAgentStatus = !!agentStatus && agentStatus.state !== 'idle';
                      const agentStatusTitle = getAgentStatusTooltip(agentStatus);
                      const agentStatusColor = agentStatus
                        ? getAgentStatusColor(agentStatus.state, isActive)
                        : getAgentStatusColor('idle', isActive);
                      const agentStatusSoftColor = agentStatus
                        ? getAgentStatusSoftColor(agentStatus.state)
                        : 'transparent';
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
                      const isDraggingSelf = dragState?.sessionId === session.id;
                      return (
                        <div
                          key={session.id}
                          draggable={!isRenamingSession}
                          ref={(element) => {
                            if (element) sessionRefs.current.set(session.id, element);
                            else sessionRefs.current.delete(session.id);
                          }}
                          onDragStart={(event) => handleSessionDragStart(event, workspace.id, session.id)}
                          onDragEnd={handleSessionDragEnd}
                          onDragOver={(event) => handleSessionDragOver(event, workspace.id, sessionIndex)}
                          onDrop={handleDrop}
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
                            gap: 4,
                            padding: '0 6px 0 10px',
                            marginTop: 1,
                            marginBottom: 1,
                            borderRadius: 8,
                            cursor: isRenamingSession ? 'text' : 'grab',
                            backgroundColor: isDraggingSelf
                              ? 'var(--color-sidebar-item-hover)'
                              : isActive
                              ? 'var(--color-tab-active-bg)'
                              : isHovered
                              ? 'var(--color-sidebar-item-hover)'
                              : 'transparent',
                            color: isActive ? 'var(--color-text-primary)' : 'var(--color-tab-inactive-text)',
                            userSelect: 'none',
                            border: isActive
                              ? '1px solid var(--color-tab-active-border)'
                              : isDraggingSelf
                              ? '1px solid var(--color-border-primary)'
                              : '1px solid transparent',
                            boxShadow: isDraggingSelf
                              ? 'var(--shadow-tab-hover)'
                              : isActive
                              ? 'var(--shadow-tab-active), var(--color-tab-active-inset)'
                              : isHovered
                              ? 'var(--shadow-tab-hover)'
                              : 'none',
                            opacity: isDraggingSelf ? 0.72 : 1,
                            transform: isDraggingSelf ? 'scale(0.985)' : 'scale(1)',
                            backdropFilter: isActive ? 'blur(12px) saturate(150%)' : undefined,
                            WebkitBackdropFilter: isActive ? 'blur(12px) saturate(150%)' : undefined,
                            transition: 'background-color 0.12s ease-out, border-color 0.12s ease-out, box-shadow 0.12s ease-out, color 0.12s ease-out, opacity 0.12s ease-out, transform 0.12s ease-out',
                          }}
                          onMouseEnter={() => {
                            setHoveredSessionId(session.id);
                          }}
                          onMouseLeave={() => {
                            setHoveredSessionId((prev) => (prev === session.id ? null : prev));
                          }}
                        >
                             <span
                               style={{
                                 width: 10,
                                 flexShrink: 0,
                                 fontSize: 10,
                                 fontVariantNumeric: 'tabular-nums',
                                 fontFamily: 'monospace',
                                 color: 'var(--color-text-muted)',
                                 opacity: isCmdHeld ? 0.75 : 0,
                                 textAlign: 'right',
                                 transition: 'opacity 0.1s ease',
                                 lineHeight: 1,
                               }}
                             >
                               {getTabShortcutNumber(session.id)}
                             </span>
                             <span
                               title={agentStatusTitle}
                               style={{
                                 width: 6,
                                 height: 13,
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 flexShrink: 0,
                                 marginRight: 6,
                               }}
                             >
                               <span
                                 style={{
                                   width: 5,
                                   height: 5,
                                   borderRadius: agentStatus?.state === 'completed' ? 2 : '50%',
                                   backgroundColor: agentStatusColor,
                                   boxShadow: hasAgentStatus
                                     ? `0 0 0 4px ${agentStatusSoftColor}`
                                     : 'none',
                                   transform: agentStatus?.state === 'error' ? 'rotate(45deg)' : 'none',
                                   animation:
                                     agentStatus?.state === 'running'
                                       ? 'agent-status-breathe 1.4s ease-in-out infinite'
                                       : agentStatus?.state === 'needs_user'
                                       ? 'agent-status-pulse 1.6s ease-in-out infinite'
                                       : 'none',
                                 }}
                               />
                             </span>
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
                                  padding: '3px 5px',
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
                                  width: 14,
                                  height: 14,
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
                                  event.currentTarget.style.color = agentStatus?.state === 'needs_user'
                                    ? 'var(--color-attention)'
                                    : 'var(--color-text-primary)';
                                }}
                                onMouseLeave={(event) => {
                                  event.currentTarget.style.backgroundColor = 'transparent';
                                  event.currentTarget.style.color = 'var(--color-text-muted)';
                                }}
                              >
                                <X size={10} />
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
          {!sidebarCollapsed && sidebarMode === 'spec' && (
            <div className="terminal-spec-sidebar">
              {specNavigationNotice && (
                <div className={'terminal-spec-state ' + (specNavigationNotice.type === 'error' ? 'error' : 'notice')}>
                  {specNavigationNotice.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                  <span>{specNavigationNotice.message}</span>
                </div>
              )}
              {pendingSpecTerminalSelect && (
                <div className="terminal-spec-skill-select" role="dialog" aria-label="绑定目标 Terminal">
                  <div className="terminal-spec-confirm-header">
                    <span>绑定 Terminal</span>
                    <button
                      type="button"
                      className="terminal-spec-confirm-close"
                      onClick={handleCancelSpecTerminalSelect}
                      title="取消"
                      aria-label="取消 terminal 绑定"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="terminal-spec-confirm-meta">
                    <span>{pendingSpecTerminalSelect.changeLabel}</span>
                    <span>{pendingSpecTerminalSelect.mode === 'next-step' ? '用于下一步' : '用于卡片定位'}</span>
                  </div>
                  <div className="terminal-spec-skill-options">
                    {pendingSpecTerminalSelect.sessions.map((session) => {
                      const agentStatus = session.agentStatus;
                      const agentLabel = agentStatus
                        ? `${getAgentDisplayName(agentStatus.agent)} · ${getAgentStatusLabel(agentStatus.state)}`
                        : '普通 terminal';
                      return (
                        <button
                          key={session.sessionId}
                          type="button"
                          className={'terminal-spec-skill-option' + (isAgentCandidateStatus(agentStatus) ? ' recommended' : '')}
                          onClick={() => handleSelectSpecTerminal(session.sessionId)}
                        >
                          <span className="terminal-spec-skill-option-label">
                            {session.sessionLabel}
                            <em>{session.workspaceName}</em>
                          </span>
                          <small>{agentLabel}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {pendingSpecSkillSelect && (
                <div className="terminal-spec-skill-select" role="dialog" aria-label="选择下一步 Skill">
                  <div className="terminal-spec-confirm-header">
                    <span>选择下一步</span>
                    <button
                      type="button"
                      className="terminal-spec-confirm-close"
                      onClick={handleCancelSpecSkillSelect}
                      title="取消"
                      aria-label="取消下一步选择"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="terminal-spec-confirm-meta">
                    <span>{pendingSpecSkillSelect.changeLabel}</span>
                    <span>目标：{pendingSpecSkillSelect.targetSessionLabel}</span>
                    <span>推荐：{SPEC_ACTION_LABELS[pendingSpecSkillSelect.change.nextAction]}</span>
                  </div>
                  <div className="terminal-spec-skill-options">
                    {pendingSpecSkillSelect.options.map((option) => (
                      <button
                        key={option.action}
                        type="button"
                        className={'terminal-spec-skill-option' + (option.recommended ? ' recommended' : '')}
                        onClick={() => handleSelectSpecSkill(option.action)}
                      >
                        <span className="terminal-spec-skill-option-label">
                          {option.label}
                          {option.recommended && <em>推荐</em>}
                        </span>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pendingSpecAction && (
                <div className="terminal-spec-confirm">
                  <div className="terminal-spec-confirm-header">
                    <span>确认执行 Skill</span>
                    <button
                      type="button"
                      className="terminal-spec-confirm-close"
                      onClick={handleCancelSpecAction}
                      title="取消"
                      aria-label="取消下一步操作"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="terminal-spec-confirm-meta">
                    <span>{pendingSpecAction.changeLabel}</span>
                    <span>目标：{pendingSpecAction.targetSessionLabel}</span>
                    <span>{getSddIntentSummary(pendingSpecAction.intent)}</span>
                  </div>
                  <pre className="terminal-spec-confirm-payload">{pendingSpecAction.payload.preview}</pre>
                  <div className="terminal-spec-confirm-actions">
                    <button
                      type="button"
                      className="terminal-spec-confirm-action primary"
                      onClick={handleConfirmSpecAction}
                    >
                      执行
                    </button>
                    <button
                      type="button"
                      className="terminal-spec-confirm-action"
                      onClick={handleCancelSpecAction}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
              {specProjectGroups.length === 0 ? (
                <div className="terminal-spec-state empty">
                  <FileText size={14} />
                  <span>没有可读取的项目目录</span>
                </div>
              ) : (
                specProjectGroups.map((project) => renderSpecProjectGroup(project))
              )}
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div
            style={{
              height: SIDEBAR_FOOTER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 8px 8px',
              borderTop: '1px solid var(--color-border-secondary)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(true)}
              title={sidebarToggleTitleWithStatus}
              style={{
                position: 'relative',
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
              <PanelLeftClose size={13} />
              {aggregateAgentStatus && (
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: 2,
                    width: 6,
                    height: 6,
                    borderRadius: aggregateAgentStatus.state === 'completed' ? 2 : '50%',
                    backgroundColor: getAgentStatusColor(aggregateAgentStatus.state, false),
                    boxShadow: `0 0 0 3px ${getAgentStatusSoftColor(aggregateAgentStatus.state)}`,
                    transform: aggregateAgentStatus.state === 'error' ? 'rotate(45deg)' : 'none',
                    animation:
                      aggregateAgentStatus.state === 'running'
                        ? 'agent-status-breathe 1.4s ease-in-out infinite'
                        : aggregateAgentStatus.state === 'needs_user'
                        ? 'agent-status-pulse 1.6s ease-in-out infinite'
                        : 'none',
                  }}
                />
              )}
            </button>
          </div>
        )}
        </div>
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
              ref={(handle) => {
                if (handle) {
                  terminalInstanceRefs.current.set(session.id, handle);
                } else {
                  terminalInstanceRefs.current.delete(session.id);
                }
              }}
              sessionId={session.id}
              isActive={session.id === activeSessionId}
              preferWebglRenderer={preferWebglRenderer}
              onUserInput={handleTerminalUserInput}
              onScrollStateChange={handleTerminalScrollStateChange}
            />
          )),
        )}

        {showTerminalScrollControls && (
          <div
            style={{
              position: 'absolute',
              top: scrollControlTop,
              right: 16,
              zIndex: 9,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              padding: 4,
              border: '1px solid var(--color-border-primary)',
              borderRadius: 8,
              backgroundColor: 'color-mix(in srgb, var(--color-surface-terminal) 84%, transparent)',
              boxShadow: 'var(--color-shadow-soft)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              transition: 'top 0.16s ease, opacity 0.16s ease',
            }}
          >
            <button
              type="button"
              aria-label="滚动到最上"
              title="滚动到最上 (Command + ↑)"
              disabled={isScrollToTopDisabled}
              onClick={() => {
                scrollActiveTerminal('top');
              }}
              style={{
                width: TERMINAL_SCROLL_CONTROL_SIZE,
                height: TERMINAL_SCROLL_CONTROL_SIZE,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid transparent',
                borderRadius: 6,
                backgroundColor: isScrollToTopDisabled
                  ? 'transparent'
                  : 'var(--color-surface-content-elevated)',
                color: isScrollToTopDisabled
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-secondary)',
                cursor: isScrollToTopDisabled ? 'default' : 'pointer',
                opacity: isScrollToTopDisabled ? 0.42 : 0.92,
                padding: 0,
                transition: 'background-color 0.16s ease, color 0.16s ease, opacity 0.16s ease',
              }}
            >
              <ChevronsUp size={16} />
            </button>
            <button
              type="button"
              aria-label="滚动到最下"
              title="滚动到最下 (Command + ↓)"
              disabled={isScrollToBottomDisabled}
              onClick={() => {
                scrollActiveTerminal('bottom');
              }}
              style={{
                width: TERMINAL_SCROLL_CONTROL_SIZE,
                height: TERMINAL_SCROLL_CONTROL_SIZE,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid transparent',
                borderRadius: 6,
                backgroundColor: isScrollToBottomDisabled
                  ? 'transparent'
                  : 'var(--color-surface-content-elevated)',
                color: isScrollToBottomDisabled
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-secondary)',
                cursor: isScrollToBottomDisabled ? 'default' : 'pointer',
                opacity: isScrollToBottomDisabled ? 0.42 : 0.92,
                padding: 0,
                transition: 'background-color 0.16s ease, color 0.16s ease, opacity 0.16s ease',
              }}
            >
              <ChevronsDown size={16} />
            </button>
          </div>
        )}

        {searchBarVisible && activeSessionId && (
          <TerminalSearchBar
            searchAddon={terminalInstanceRefs.current.get(activeSessionId)?.getSearchAddon() ?? null}
            initialQuery={terminalInstanceRefs.current.get(activeSessionId)?.getSelection() ?? ''}
            onClose={() => setSearchBarVisible(false)}
          />
        )}
      </div>

      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title={sidebarToggleTitleWithStatus}
          style={{
            position: 'absolute',
            bottom: 10,
            left: 8,
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
          <PanelLeftOpen size={13} />
          {aggregateAgentStatus && (
            <span
              style={{
                position: 'absolute',
                right: 2,
                top: 2,
                width: 6,
                height: 6,
                borderRadius: aggregateAgentStatus.state === 'completed' ? 2 : '50%',
                backgroundColor: getAgentStatusColor(aggregateAgentStatus.state, false),
                boxShadow: `0 0 0 3px ${getAgentStatusSoftColor(aggregateAgentStatus.state)}`,
                transform: aggregateAgentStatus.state === 'error' ? 'rotate(45deg)' : 'none',
                animation:
                  aggregateAgentStatus.state === 'running'
                    ? 'agent-status-breathe 1.4s ease-in-out infinite'
                    : aggregateAgentStatus.state === 'needs_user'
                    ? 'agent-status-pulse 1.6s ease-in-out infinite'
                    : 'none',
              }}
            />
          )}
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
