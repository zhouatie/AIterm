export type TerminalAgentStatusAgent = 'codex' | 'claude-code' | 'opencode';
export type TerminalAgentStatusState = 'running' | 'completed' | 'needs_user' | 'error' | 'idle';

export interface TerminalAgentStatus {
  id: string;
  agent: TerminalAgentStatusAgent;
  state: TerminalAgentStatusState;
  event: string;
  message: string;
  timestamp: number;
}

export interface TerminalAgentStatusCleared {
  id: string;
}

export const TERMINAL_AGENT_STATUS_AGENTS: readonly TerminalAgentStatusAgent[] = [
  'codex',
  'claude-code',
  'opencode',
];

export const TERMINAL_AGENT_STATUS_STATES: readonly TerminalAgentStatusState[] = [
  'running',
  'completed',
  'needs_user',
  'error',
  'idle',
];
