import * as pty from 'node-pty';
import { randomUUID } from 'node:crypto';
import { execFile, type ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execFileAsync = promisify(execFile);
const LOGIN_SHELL_ENV_TIMEOUT_MS = 3000;
const LOGIN_SHELL_ENV_SENTINEL = '\x1eAITERM_ENV_START\x1e\x00';

export interface TerminalSessionInfo {
  id: string;
  cwd: string;
  isGitRepo: boolean;
  branchName: string | null;
  gitRoot: string | null;
  displayLabel: string;
}

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  initialCwd: string;
  lastInfo: TerminalSessionInfo;
}

export interface PtyNotificationEnv {
  url: string;
  token: string;
}

const sessions = new Map<string, PtySession>();
const nonGitPathInfoCache = new Map<string, Omit<TerminalSessionInfo, 'id'>>();
let loginShellEnvPromise: Promise<Record<string, string>> | null = null;

function getDefaultShell(): string {
  return process.env.SHELL || '/bin/zsh';
}

function getDefaultCwd(): string {
  return process.env.HOME || process.cwd();
}

function decodeLsofEscapedPath(cwd: string): string {
  if (!cwd.includes('\\x')) return cwd;

  return cwd.replace(/(?:\\x[0-9A-Fa-f]{2})+/g, (sequence) => {
    const hex = sequence.replace(/\\x/g, '');
    return Buffer.from(hex, 'hex').toString('utf8');
  });
}

async function isDirectory(cwd: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(cwd);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveInitialCwd(cwd?: string): Promise<string> {
  const fallbackCwd = getDefaultCwd();
  if (!cwd) return fallbackCwd;

  const decodedCwd = decodeLsofEscapedPath(cwd);
  const candidates = decodedCwd === cwd ? [cwd] : [cwd, decodedCwd];

  for (const candidate of candidates) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }

  console.warn(`[pty-manager] Requested cwd does not exist, falling back to ${fallbackCwd}:`, cwd);
  return fallbackCwd;
}

function getStringProcessEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string'
    )),
  );
}

function parseNullDelimitedEnv(output: string): Record<string, string> {
  const sentinelIndex = output.indexOf(LOGIN_SHELL_ENV_SENTINEL);
  if (sentinelIndex === -1) return {};

  const envOutput = output.slice(sentinelIndex + LOGIN_SHELL_ENV_SENTINEL.length);
  const env: Record<string, string> = {};
  for (const entry of envOutput.split('\x00')) {
    if (!entry) continue;

    const equalsIndex = entry.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = entry.slice(0, equalsIndex);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    env[key] = entry.slice(equalsIndex + 1);
  }
  return env;
}

function getShellBasename(shell: string): string {
  const parts = shell.split('/');
  return parts[parts.length - 1] || 'zsh';
}

async function resolveLoginShellEnv(shell: string): Promise<Record<string, string>> {
  if (process.platform !== 'darwin') return {};

  try {
    const options: ExecFileOptionsWithStringEncoding & { argv0: string } = {
      argv0: `-${getShellBasename(shell)}`,
      encoding: 'utf8',
      env: getStringProcessEnv(),
      timeout: LOGIN_SHELL_ENV_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    };
    const { stdout } = await execFileAsync(
      shell,
      ['-lc', `printf '\\036AITERM_ENV_START\\036\\0'; command env -0`],
      options,
    );
    return parseNullDelimitedEnv(stdout);
  } catch (error) {
    console.warn('Failed to resolve login shell environment for PTY:', error);
    return {};
  }
}

async function getLoginShellEnv(shell: string): Promise<Record<string, string>> {
  if (process.platform !== 'darwin') return {};
  if (!loginShellEnvPromise) {
    loginShellEnvPromise = resolveLoginShellEnv(shell);
  }
  return loginShellEnvPromise;
}

async function getPtyEnv(
  shell: string,
  sessionId: string,
  notificationEnv?: PtyNotificationEnv,
): Promise<Record<string, string>> {
  const env = getStringProcessEnv();
  const loginShellEnv = await getLoginShellEnv(shell);

  return {
    ...env,
    ...loginShellEnv,
    SHELL: shell,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    ...(notificationEnv
      ? {
          AITEM_TERMINAL_SESSION_ID: sessionId,
          AITEM_NOTIFY_URL: notificationEnv.url,
          AITEM_NOTIFY_TOKEN: notificationEnv.token,
        }
      : {}),
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
  let gitRoot: string | null = null;

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

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', cwd, 'rev-parse', '--show-toplevel'],
        { timeout: 2000 },
      );
      gitRoot = stdout.trim() || null;
    } catch {
      gitRoot = null;
    }
  }

  const info = {
    cwd,
    isGitRepo,
    branchName,
    gitRoot,
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

export async function createSession(
  cols: number,
  rows: number,
  cwd?: string,
  notificationEnv?: PtyNotificationEnv,
): Promise<PtySession> {
  const id = randomUUID();
  const shell = getDefaultShell();
  let initialCwd = await resolveInitialCwd(cwd);
  const env = await getPtyEnv(shell, id, notificationEnv);

  let ptyProcess: pty.IPty;
  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: initialCwd,
      env,
    });
  } catch (error) {
    const fallbackCwd = getDefaultCwd();
    if (!cwd || initialCwd === fallbackCwd) {
      throw error;
    }

    console.warn(`[pty-manager] Failed to spawn PTY in ${initialCwd}, retrying in ${fallbackCwd}:`, error);
    initialCwd = fallbackCwd;
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: initialCwd,
      env,
    });
  }

  const session: PtySession = {
    id,
    ptyProcess,
    initialCwd,
    lastInfo: {
      id,
      cwd: initialCwd,
      isGitRepo: false,
      branchName: null,
      gitRoot: null,
      displayLabel: getLastPathSegment(initialCwd),
    },
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): PtySession | undefined {
  return sessions.get(id);
}

export function hasSession(id: string): boolean {
  return sessions.has(id);
}

export function hasActiveSessions(): boolean {
  return sessions.size > 0;
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
          const rawCwd = lines[i + 1].slice(1); // strip 'n' prefix
          const decodedCwd = decodeLsofEscapedPath(rawCwd);
          if (decodedCwd !== rawCwd && !(await isDirectory(rawCwd)) && await isDirectory(decodedCwd)) {
            return decodedCwd;
          }
          return rawCwd;
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
    try {
      session.ptyProcess.resize(cols, rows);
    } catch {
      // PTY process may already be closed (EBADF); silently ignore
    }
  }
}

export function disposeSession(id: string): void {
  const session = sessions.get(id);
  if (session) {
    try {
      session.ptyProcess.kill();
    } catch {
      // PTY process may already be gone; registry cleanup is still required.
    }
    sessions.delete(id);
  }
}

export function disposeAllSessions(): void {
  for (const [id, session] of sessions) {
    try {
      session.ptyProcess.kill();
    } catch {
      // Keep shutdown idempotent even if a PTY has already exited.
    }
    sessions.delete(id);
  }
}
