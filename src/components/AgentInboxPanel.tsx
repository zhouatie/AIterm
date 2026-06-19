import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircleWarning,
  PlayCircle,
  TerminalSquare,
  X,
} from 'lucide-react';
import type {
  TerminalAgentStatus,
  TerminalAgentStatusState,
} from '../preload';
import { useAgentStatus } from '../contexts/agent-status';

interface AgentInboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_PRIORITY: Record<TerminalAgentStatusState, number> = {
  needs_user: 4,
  error: 3,
  running: 2,
  completed: 1,
  idle: 0,
};

const STATUS_LABELS: Record<TerminalAgentStatusState, string> = {
  needs_user: '待确认',
  error: '异常',
  running: '执行中',
  completed: '已完成',
  idle: '空闲',
};

function getAgentDisplayName(agent: TerminalAgentStatus['agent']): string {
  if (agent === 'claude-code') return 'Claude Code';
  if (agent === 'opencode') return 'OpenCode';
  return 'Codex';
}

function getStatusIcon(status: TerminalAgentStatusState) {
  if (status === 'needs_user') return <MessageCircleWarning size={14} />;
  if (status === 'error') return <AlertCircle size={14} />;
  if (status === 'running') return <Loader2 size={14} className="agent-inbox-spinner" />;
  if (status === 'completed') return <CheckCircle2 size={14} />;
  return <PlayCircle size={14} />;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AgentInboxPanel: React.FC<AgentInboxPanelProps> = ({ isOpen, onClose }) => {
  const {
    agentStatusBySessionId,
    sessionSummariesById,
    activateSession,
  } = useAgentStatus();

  const entries = useMemo(() => (
    Object.values(agentStatusBySessionId)
      .filter((status) => status.state !== 'idle')
      .sort((a, b) => (
        STATUS_PRIORITY[b.state] - STATUS_PRIORITY[a.state]
        || b.timestamp - a.timestamp
        || a.id.localeCompare(b.id)
      ))
  ), [agentStatusBySessionId]);

  if (!isOpen) return null;

  return (
    <div className="agent-inbox-popover" role="dialog" aria-label="Agent Inbox">
      <div className="agent-inbox-header">
        <div className="agent-inbox-title">
          <TerminalSquare size={15} />
          <span>Agent Inbox</span>
          {entries.length > 0 && <span className="agent-inbox-count">{entries.length}</span>}
        </div>
        <button
          type="button"
          className="agent-inbox-icon-button"
          onClick={onClose}
          title="关闭 Agent Inbox"
          aria-label="关闭 Agent Inbox"
        >
          <X size={14} />
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="agent-inbox-empty">
          <CheckCircle2 size={18} />
          <span>暂无 agent 状态</span>
        </div>
      ) : (
        <div className="agent-inbox-list">
          {entries.map((status: TerminalAgentStatus) => {
            const session = sessionSummariesById[status.id];
            const canActivate = !!session;
            return (
              <button
                key={status.id}
                type="button"
                className={'agent-inbox-item ' + status.state}
                onClick={() => {
                  const didActivate = activateSession(status.id);
                  if (didActivate) onClose();
                }}
                disabled={!canActivate}
                title={canActivate ? '激活对应 terminal session' : 'terminal session 已不存在'}
              >
                <span className="agent-inbox-status-icon" aria-hidden="true">
                  {getStatusIcon(status.state)}
                </span>
                <span className="agent-inbox-item-main">
                  <span className="agent-inbox-item-line">
                    <span className="agent-inbox-agent">{getAgentDisplayName(status.agent)}</span>
                    <span className="agent-inbox-status-label">{STATUS_LABELS[status.state]}</span>
                    <span className="agent-inbox-time">{formatTimestamp(status.timestamp)}</span>
                  </span>
                  <span className="agent-inbox-message">{status.message}</span>
                  <span className="agent-inbox-session">
                    {session ? `${session.workspaceName} / ${session.label}` : 'session 已关闭'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentInboxPanel;
