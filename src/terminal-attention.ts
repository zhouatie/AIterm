export type TerminalAttentionAgent = 'codex' | 'claude-code' | 'opencode';

export interface TerminalAttention {
  id: string;
  agent: TerminalAttentionAgent;
  event: string;
  message: string;
  timestamp: number;
}

export interface TerminalAttentionCleared {
  id: string;
}

export const TERMINAL_ATTENTION_AGENTS: readonly TerminalAttentionAgent[] = [
  'codex',
  'claude-code',
  'opencode',
];
