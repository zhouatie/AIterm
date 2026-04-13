import * as pty from 'node-pty';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TerminalSessionInfo {
  id: string;
  cwd: string;
  isGitRepo: boolean;
  branchName: string | null;
  displayLabel: string;
}

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  initialCwd: string;
  lastInfo: TerminalSessionInfo;
}

const sessions = new Map<string, PtySession>();
const nonGitPathInfoCache = new Map<string, Omit<TerminalSessionInfo, 'id'>>();

function getDefaultShell(): string {
  return process.env.SHELL || '/bin/zsh';
}

function getPtyEnv(shell: string): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string'
    )),
  );

  return {
    ...env,
    SHELL: shell,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  };
}

function getLastPathSegment(cwd: string): string {
  const trimmed = cwd.replace(/\/+$/, '');
  if (!trimmed) return cwd;
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || cwd;
}

async function getPathInfo(cwd: string): Promise<Omit<TerminalSessionInfo, 'id'>> {
  const cached = nonGitPathInfoCache.get(cwd);
  if (cached) return cached;

  let isGitRepo = false;
  let branchName: string | null = null;

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', cwd, 'rev-parse', '--is-inside-work-tree'],
      { timeout: 2000 },
    );
    isGitRepo = stdout.trim() === 'true';
  } catch {
    isGitRepo = false;
  }

  if (isGitRepo) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', cwd, 'branch', '--show-current'],
        { timeout: 2000 },
      );
      branchName = stdout.trim() || null;
    } catch {
      branchName = null;
    }
  }

  const info = {
    cwd,
    isGitRepo,
    branchName,
    displayLabel: branchName || getLastPathSegment(cwd),
  };
  if (!isGitRepo) {
    nonGitPathInfoCache.set(cwd, info);
  }
  return info;
}

async function resolveSessionInfo(id: string): Promise<TerminalSessionInfo | null> {
  const session = sessions.get(id);
  if (!session) return null;

  const liveCwd = await getSessionLiveCwd(id);
  if (!liveCwd) return null;

  const pathInfo = await getPathInfo(liveCwd);
  return {
    id,
    ...pathInfo,
  };
}

export function createSession(cols: number, rows: number, cwd?: string): PtySession {
  const id = randomUUID();
  const shell = getDefaultShell();
  const initialCwd = cwd || process.env.HOME || process.cwd();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: initialCwd,
    env: getPtyEnv(shell),
  });

  const session: PtySession = {
    id,
    ptyProcess,
    initialCwd,
    lastInfo: {
      id,
      cwd: initialCwd,
      isGitRepo: false,
      branchName: null,
      displayLabel: getLastPathSegment(initialCwd),
    },
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): PtySession | undefined {
  return sessions.get(id);
}

export function getSessionCwd(id: string): string | undefined {
  const session = sessions.get(id);
  return session?.lastInfo.cwd;
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
  return dynamicCwd ?? session.lastInfo.cwd ?? session.initialCwd;
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

/**
 * Resolve the latest session info and persist it if anything changed.
 * Returns null if unchanged or session not found.
 */
export async function getSessionInfo(id: string): Promise<TerminalSessionInfo | null> {
  const session = sessions.get(id);
  if (!session) return null;

  const nextInfo = await resolveSessionInfo(id);
  if (!nextInfo) return null;

  session.lastInfo = nextInfo;
  return nextInfo;
}

export async function checkAndUpdateSessionInfo(id: string): Promise<TerminalSessionInfo | null> {
  const session = sessions.get(id);
  if (!session) return null;

  const nextInfo = await resolveSessionInfo(id);
  if (!nextInfo) return null;

  const prevInfo = session.lastInfo;
  const changed =
    prevInfo.cwd !== nextInfo.cwd ||
    prevInfo.isGitRepo !== nextInfo.isGitRepo ||
    prevInfo.branchName !== nextInfo.branchName ||
    prevInfo.displayLabel !== nextInfo.displayLabel;

  if (!changed) return null;

  session.lastInfo = nextInfo;
  return nextInfo;
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
