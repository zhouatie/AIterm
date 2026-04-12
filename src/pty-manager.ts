import * as pty from 'node-pty';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  cwd: string;
}

const sessions = new Map<string, PtySession>();

function getDefaultShell(): string {
  return process.env.SHELL || '/bin/zsh';
}

export function createSession(cols: number, rows: number): PtySession {
  const id = randomUUID();
  const shell = getDefaultShell();
  const cwd = process.env.HOME || process.cwd();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: { ...process.env } as Record<string, string>,
  });

  const session: PtySession = { id, ptyProcess, cwd };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): PtySession | undefined {
  return sessions.get(id);
}

export function getSessionCwd(id: string): string | undefined {
  const session = sessions.get(id);
  return session?.cwd;
}

/**
 * Get the live working directory of a PTY session by querying the OS.
 * Falls back to the initial cwd if detection fails.
 */
export async function getSessionLiveCwd(id: string): Promise<string | null> {
  const session = sessions.get(id);
  if (!session) return null;

  const pid = session.ptyProcess.pid;
  const dynamicCwd = await getProcessCwd(pid);
  return dynamicCwd ?? session.cwd;
}

/**
 * macOS: use `lsof` to read the current working directory of a process.
 * Linux: read /proc/<pid>/cwd symlink.
 */
async function getProcessCwd(pid: number): Promise<string | null> {
  try {
    if (process.platform === 'darwin') {
      // Use full path — Electron may not have /usr/sbin in PATH
      const { stdout } = await execFileAsync(
        '/usr/sbin/lsof',
        ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'],
        { timeout: 3000 },
      );
      // Parse: look for 'fcwd' line, next line starting with 'n' is the path
      const lines = stdout.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === 'fcwd' && i + 1 < lines.length && lines[i + 1].startsWith('n')) {
          return lines[i + 1].slice(1); // strip 'n' prefix
        }
      }
    } else if (process.platform === 'linux') {
      const { readlink } = await import('node:fs/promises');
      return await readlink(`/proc/${pid}/cwd`);
    }
  } catch {
    // Detection failed — fall through to null
  }
  return null;
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
