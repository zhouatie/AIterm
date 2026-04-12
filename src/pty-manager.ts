import * as pty from 'node-pty';
import { randomUUID } from 'node:crypto';

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
}

const sessions = new Map<string, PtySession>();

function getDefaultShell(): string {
  return process.env.SHELL || '/bin/zsh';
}

export function createSession(cols: number, rows: number): PtySession {
  const id = randomUUID();
  const shell = getDefaultShell();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: process.env.HOME || process.cwd(),
    env: { ...process.env } as Record<string, string>,
  });

  const session: PtySession = { id, ptyProcess };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): PtySession | undefined {
  return sessions.get(id);
}

export function writeToSession(id: string, data: string): void {
  const session = sessions.get(id);
  if (session) {
    session.ptyProcess.write(data);
  }
}

export function resizeSession(id: string, cols: number, rows: number): void {
  const session = sessions.get(id);
  if (session) {
    session.ptyProcess.resize(cols, rows);
  }
}

export function disposeSession(id: string): void {
  const session = sessions.get(id);
  if (session) {
    session.ptyProcess.kill();
    sessions.delete(id);
  }
}

export function disposeAllSessions(): void {
  for (const [id, session] of sessions) {
    session.ptyProcess.kill();
    sessions.delete(id);
  }
}
