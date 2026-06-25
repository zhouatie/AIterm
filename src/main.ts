import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  nativeTheme,
  Notification,
  dialog,
  type SaveDialogOptions,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { Dirent } from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import { randomBytes } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import started from 'electron-squirrel-startup';
import {
  createSession,
  writeToSession,
  resizeSession,
  disposeSession,
  disposeAllSessions,
  getSessionInfo,
  checkAndUpdateSessionInfo,
  hasSession,
  hasActiveSessions,
  type PtyNotificationEnv,
} from './pty-manager';
import {
  TERMINAL_AGENT_STATUS_AGENTS,
  TERMINAL_AGENT_STATUS_STATES,
  type TerminalAgentStatus,
  type TerminalAgentStatusAgent,
  type TerminalAgentStatusState,
} from './terminal-attention';
import {
  startLiveViewServer,
  stopLiveViewServer,
  broadcastEvent,
  setCheckoutTrigger,
} from './live-view-server';
import type {
  MarkdownCommentAnchor,
  MarkdownPreviewComment,
} from './utils/markdown-comment-types';
import type {
  OpenSpecArtifactId,
  OpenSpecArtifactStatus,
  OpenSpecChangeSummary,
  OpenSpecNextAction,
  OpenSpecTaskProgress,
  OpenSpecWorkflowId,
  OpenSpecWorkflowSummary,
} from './utils/openspec-workflow';

// Register checkout trigger: when the server needs a fresh FullSnapshot
// (stale buffer + new client connected), it calls this to tell the renderer
// to stop and restart rrweb recording, which emits a fresh Meta+FullSnapshot.
setCheckoutTrigger(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('live-view:force-checkout');
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let attentionServer: http.Server | null = null;
let attentionNotifyUrl = '';
let attentionNotifyToken = '';
const agentStatusBySessionId = new Map<string, TerminalAgentStatus>();
const agentNotificationsBySessionId = new Map<string, Notification>();
const manualInterruptBySessionId = new Map<string, number>();
const TERMINAL_OUTPUT_FLUSH_MS = 16;
const TERMINAL_CLOSE_CONFIRM_BUTTON_INDEX = 1;
const MANUAL_INTERRUPT_SUPPRESS_MS = 2500;
const AITERM_RELEASES_URL = 'https://github.com/zhouatie/AIterm/releases';
const AITERM_LATEST_RELEASE_API_URL = 'https://api.github.com/repos/zhouatie/AIterm/releases/latest';
const AITERM_RELEASES_HOSTNAME = 'github.com';
const AITERM_RELEASES_PATH_PREFIX = '/zhouatie/AIterm/releases';
const EXTERNAL_WEB_URL_PROTOCOLS = new Set(['http:', 'https:']);
const UPDATE_CHECK_TIMEOUT_MS = 10000;
const UPDATE_CHECK_MAX_RESPONSE_BYTES = 1024 * 1024;

interface AppUpdateCheckSuccess {
  ok: true;
  currentVersion: string;
  latestVersion: string;
  latestTag: string;
  releaseName: string | null;
  releaseUrl: string;
  hasUpdate: boolean;
}

interface AppUpdateCheckFailure {
  ok: false;
  currentVersion: string;
  releaseUrl: string;
  error: string;
}

type AppUpdateCheckResult = AppUpdateCheckSuccess | AppUpdateCheckFailure;

interface GitHubLatestReleaseResponse {
  tag_name?: unknown;
  html_url?: unknown;
  name?: unknown;
}

interface TerminalStreamState {
  attached: boolean;
  pendingOutput: string;
  liveBatch: string;
  flushTimer: ReturnType<typeof setTimeout> | null;
}

interface TerminalTranscriptReadSuccess {
  ok: true;
  content: string;
  byteLength: number;
  updatedAt: number | null;
}

interface TerminalTranscriptFailure {
  ok: false;
  error: string;
}

interface TerminalTranscriptSearchMatch {
  index: number;
  line: number;
  column: number;
  preview: string;
}

interface TerminalTranscriptSearchSuccess {
  ok: true;
  query: string;
  matches: TerminalTranscriptSearchMatch[];
}

interface TerminalTranscriptExportSuccess {
  ok: true;
  canceled: boolean;
  filePath: string | null;
}

interface TerminalTranscriptMutationSuccess {
  ok: true;
}

function getUpdateErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '检查更新失败';
}

function getExternalLinkOpenErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '无法打开外部链接';
}

function parseReleaseVersion(version: string): [number, number, number] | null {
  const match = version.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const parsed = match.slice(1).map((part) => Number(part));
  if (parsed.some((part) => !Number.isSafeInteger(part) || part < 0)) return null;

  return [parsed[0], parsed[1], parsed[2]];
}

function formatReleaseVersion(version: [number, number, number]): string {
  return version.join('.');
}

function compareReleaseVersions(
  currentVersion: [number, number, number],
  latestVersion: [number, number, number],
): number {
  for (let index = 0; index < currentVersion.length; index++) {
    if (currentVersion[index] < latestVersion[index]) return -1;
    if (currentVersion[index] > latestVersion[index]) return 1;
  }
  return 0;
}

function isAllowedReleaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && parsed.hostname === AITERM_RELEASES_HOSTNAME
      && (
        parsed.pathname === AITERM_RELEASES_PATH_PREFIX
        || parsed.pathname.startsWith(`${AITERM_RELEASES_PATH_PREFIX}/`)
      );
  } catch {
    return false;
  }
}

function resolveReleaseUrl(url?: string): string | null {
  if (!url) return AITERM_RELEASES_URL;
  if (!isAllowedReleaseUrl(url)) return null;
  return url;
}

function resolveExternalWebUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    if (!EXTERNAL_WEB_URL_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function requestJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'AIterm-update-check',
        },
      },
    );

    request.setTimeout(UPDATE_CHECK_TIMEOUT_MS, () => {
      request.destroy(new Error('检查更新超时'));
    });

    request.on('response', (response) => {
      const statusCode = response.statusCode ?? 0;
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        body += chunk;
        if (body.length > UPDATE_CHECK_MAX_RESPONSE_BYTES) {
          request.destroy(new Error('Release 响应过大'));
        }
      });
      response.on('end', () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`GitHub Release 请求失败：${statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('GitHub Release 响应不是有效 JSON'));
        }
      });
    });

    request.on('error', (error) => reject(error));
  });
}

function isGitHubLatestReleaseResponse(data: unknown): data is GitHubLatestReleaseResponse {
  return typeof data === 'object' && data !== null;
}

async function checkForManualUpdate(): Promise<AppUpdateCheckResult> {
  const currentVersion = app.getVersion();

  try {
    const releaseData = await requestJson(AITERM_LATEST_RELEASE_API_URL);
    if (!isGitHubLatestReleaseResponse(releaseData)) {
      throw new Error('GitHub Release 响应格式无效');
    }

    const latestTag = typeof releaseData.tag_name === 'string' ? releaseData.tag_name.trim() : '';
    const latestReleaseUrl = typeof releaseData.html_url === 'string'
      ? resolveReleaseUrl(releaseData.html_url)
      : null;
    const latestVersion = parseReleaseVersion(latestTag);
    const parsedCurrentVersion = parseReleaseVersion(currentVersion);

    if (!latestTag || !latestVersion) {
      throw new Error('无法解析最新 Release 版本');
    }
    if (!parsedCurrentVersion) {
      throw new Error('无法解析当前应用版本');
    }
    if (!latestReleaseUrl) {
      throw new Error('GitHub Release URL 不在允许范围内');
    }

    const releaseName = typeof releaseData.name === 'string' && releaseData.name.trim()
      ? releaseData.name.trim()
      : null;

    return {
      ok: true,
      currentVersion,
      latestVersion: formatReleaseVersion(latestVersion),
      latestTag,
      releaseName,
      releaseUrl: latestReleaseUrl,
      hasUpdate: compareReleaseVersions(parsedCurrentVersion, latestVersion) < 0,
    };
  } catch (error) {
    return {
      ok: false,
      currentVersion,
      releaseUrl: AITERM_RELEASES_URL,
      error: getUpdateErrorMessage(error),
    };
  }
}

const terminalStreamStates = new Map<string, TerminalStreamState>();
const terminalTranscriptBySessionId = new Map<string, string>();
const terminalTranscriptsDir = path.join(app.getPath('userData'), 'terminal-transcripts');
const TRANSCRIPT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function getTerminalOutputChannel(id: string): string {
  return `terminal:output:${id}`;
}

function getTerminalExitChannel(id: string): string {
  return `terminal:exit:${id}`;
}

function ensureTerminalStreamState(id: string): TerminalStreamState {
  const existing = terminalStreamStates.get(id);
  if (existing) return existing;

  const created: TerminalStreamState = {
    attached: false,
    pendingOutput: '',
    liveBatch: '',
    flushTimer: null,
  };
  terminalStreamStates.set(id, created);
  return created;
}

function flushTerminalOutput(id: string): void {
  const state = terminalStreamStates.get(id);
  if (!state) return;

  const data = state.liveBatch;
  state.liveBatch = '';
  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }

  if (!data) return;

  if (state.attached && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(getTerminalOutputChannel(id), data);
    return;
  }

  state.pendingOutput += data;
}

function queueTerminalOutput(id: string, data: string): void {
  if (!data) return;

  const state = ensureTerminalStreamState(id);
  state.liveBatch += data;
  if (state.flushTimer) return;

  state.flushTimer = setTimeout(() => {
    flushTerminalOutput(id);
  }, TERMINAL_OUTPUT_FLUSH_MS);
}

function attachTerminalOutput(id: string): string {
  const state = ensureTerminalStreamState(id);
  flushTerminalOutput(id);
  state.attached = true;
  const bufferedData = state.pendingOutput;
  state.pendingOutput = '';
  return bufferedData;
}

function detachTerminalOutput(id: string): void {
  const state = terminalStreamStates.get(id);
  if (!state) return;
  state.attached = false;
}

function clearTerminalStreamState(id: string): void {
  const state = terminalStreamStates.get(id);
  if (state?.flushTimer) {
    clearTimeout(state.flushTimer);
  }
  terminalStreamStates.delete(id);
}

function clearAllTerminalStreamStates(): void {
  for (const id of terminalStreamStates.keys()) {
    clearTerminalStreamState(id);
  }
}

function getTranscriptErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Transcript 操作失败';
}

function isValidTranscriptId(transcriptId: unknown): transcriptId is string {
  return typeof transcriptId === 'string'
    && transcriptId.length > 0
    && transcriptId.length <= 128
    && TRANSCRIPT_ID_PATTERN.test(transcriptId);
}

function ensureTranscriptsDir(): void {
  fs.mkdirSync(terminalTranscriptsDir, { recursive: true });
}

function getTranscriptPath(transcriptId: string): string {
  if (!isValidTranscriptId(transcriptId)) {
    throw new Error('无效的 transcript 标识');
  }
  return path.join(terminalTranscriptsDir, `${transcriptId}.raw`);
}

function touchTranscript(transcriptId: string): void {
  ensureTranscriptsDir();
  fs.closeSync(fs.openSync(getTranscriptPath(transcriptId), 'a'));
}

function registerTerminalTranscriptSession(sessionId: string, transcriptId: string): void {
  touchTranscript(transcriptId);
  terminalTranscriptBySessionId.set(sessionId, transcriptId);
}

function unregisterTerminalTranscriptSession(sessionId: string): void {
  terminalTranscriptBySessionId.delete(sessionId);
}

function appendTerminalTranscriptById(transcriptId: string, data: string): void {
  if (!data) return;
  try {
    ensureTranscriptsDir();
    fs.appendFileSync(getTranscriptPath(transcriptId), data, 'utf-8');
  } catch (error) {
    console.warn('[main] Failed to append terminal transcript:', error);
  }
}

function appendTerminalTranscript(sessionId: string, data: string): void {
  const transcriptId = terminalTranscriptBySessionId.get(sessionId);
  if (!transcriptId) return;
  appendTerminalTranscriptById(transcriptId, data);
}

function deleteTerminalTranscript(transcriptId: string): TerminalTranscriptMutationSuccess | TerminalTranscriptFailure {
  try {
    const transcriptPath = getTranscriptPath(transcriptId);
    if (fs.existsSync(transcriptPath)) {
      fs.unlinkSync(transcriptPath);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getTranscriptErrorMessage(error) };
  }
}

function stripAnsiAndControlSequences(raw: string): string {
  return raw
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[PX^_][\s\S]*?\x1b\\/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '');
}

function applyCommonTerminalRewrites(input: string): string {
  const lines = [''];
  let lineIndex = 0;
  let column = 0;

  for (const char of input) {
    if (char === '\n') {
      lineIndex += 1;
      lines[lineIndex] = '';
      column = 0;
      continue;
    }
    if (char === '\r') {
      column = 0;
      continue;
    }
    if (char === '\b') {
      column = Math.max(0, column - 1);
      continue;
    }
    if (char === '\t') {
      const spaces = 4 - (column % 4);
      for (let i = 0; i < spaces; i++) {
        const currentLine = lines[lineIndex] ?? '';
        lines[lineIndex] = currentLine.slice(0, column) + ' ' + currentLine.slice(column + 1);
        column += 1;
      }
      continue;
    }
    if (char < ' ' && char !== '\f') {
      continue;
    }

    const currentLine = lines[lineIndex] ?? '';
    lines[lineIndex] = currentLine.slice(0, column) + char + currentLine.slice(column + 1);
    column += 1;
  }

  return lines.join('\n');
}

function normalizeTranscriptText(raw: string): string {
  return applyCommonTerminalRewrites(stripAnsiAndControlSequences(raw).replace(/\r\n/g, '\n'));
}

function readNormalizedTranscript(transcriptId: string): TerminalTranscriptReadSuccess | TerminalTranscriptFailure {
  try {
    const transcriptPath = getTranscriptPath(transcriptId);
    if (!fs.existsSync(transcriptPath)) {
      return { ok: false, error: 'Transcript 不存在' };
    }
    const stat = fs.statSync(transcriptPath);
    const raw = fs.readFileSync(transcriptPath, 'utf-8');
    return {
      ok: true,
      content: normalizeTranscriptText(raw),
      byteLength: stat.size,
      updatedAt: stat.mtimeMs,
    };
  } catch (error) {
    return { ok: false, error: getTranscriptErrorMessage(error) };
  }
}

function searchTranscript(
  transcriptId: string,
  query: string,
): TerminalTranscriptSearchSuccess | TerminalTranscriptFailure {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { ok: true, query: trimmedQuery, matches: [] };
  }

  const readResult = readNormalizedTranscript(transcriptId);
  if ('error' in readResult) return readResult;

  const content = readResult.content;
  const haystack = content.toLocaleLowerCase();
  const needle = trimmedQuery.toLocaleLowerCase();
  const matches: TerminalTranscriptSearchMatch[] = [];
  let fromIndex = 0;

  while (fromIndex <= haystack.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index === -1) break;

    const before = content.slice(0, index);
    const line = before.split('\n').length;
    const lastLineBreak = before.lastIndexOf('\n');
    const column = index - lastLineBreak;
    const previewStart = Math.max(0, index - 80);
    const previewEnd = Math.min(content.length, index + trimmedQuery.length + 80);
    const preview = content.slice(previewStart, previewEnd).replace(/\s+/g, ' ').trim();

    matches.push({ index, line, column, preview });
    fromIndex = index + Math.max(1, needle.length);
  }

  return { ok: true, query: trimmedQuery, matches };
}

async function exportTranscript(
  transcriptId: string,
): Promise<TerminalTranscriptExportSuccess | TerminalTranscriptFailure> {
  const readResult = readNormalizedTranscript(transcriptId);
  if ('error' in readResult) return readResult;

  try {
    const defaultPath = `terminal-transcript-${transcriptId}.txt`;
    const options: SaveDialogOptions = {
      title: '导出 Transcript',
      defaultPath,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    };
    const result = mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return { ok: true, canceled: true, filePath: null };
    }

    fs.writeFileSync(result.filePath, readResult.content, 'utf-8');
    return { ok: true, canceled: false, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: getTranscriptErrorMessage(error) };
  }
}

function cleanupTerminalTranscripts(activeTranscriptIds: string[]): void {
  try {
    ensureTranscriptsDir();
    const activeSet = new Set(activeTranscriptIds.filter(isValidTranscriptId));
    const files = fs.readdirSync(terminalTranscriptsDir);
    for (const file of files) {
      const transcriptId = path.basename(file, '.raw');
      if (!activeSet.has(transcriptId)) {
        try {
          fs.unlinkSync(path.join(terminalTranscriptsDir, file));
        } catch {
          // Ignore individual cleanup failures.
        }
      }
    }
  } catch {
    // Directory may not exist yet.
  }
}

function disposeAllTerminalSessions(): void {
  agentStatusBySessionId.clear();
  clearAllAgentNotifications();
  manualInterruptBySessionId.clear();
  clearAllTerminalStreamStates();
  disposeAllSessions();
}

async function confirmCloseWindow(window: BrowserWindow): Promise<boolean> {
  const result = await dialog.showMessageBox(window, {
    type: 'warning',
    buttons: ['取消', '关闭 GUI'],
    defaultId: 0,
    cancelId: 0,
    title: '关闭 AIterm？',
    message: '关闭 GUI 会终止正在运行的终端进程。',
    detail: '所有终端中的命令以及 Codex、Claude Code、OpenCode 等会话都会被终止。重新打开后只恢复 tab 布局和工作目录。',
    noLink: true,
  });
  return result.response === TERMINAL_CLOSE_CONFIRM_BUTTON_INDEX;
}
const attentionSessionIds = new Set<string>();

function getAttentionNotificationEnv(): PtyNotificationEnv | undefined {
  if (!attentionNotifyUrl || !attentionNotifyToken) return undefined;
  return {
    url: attentionNotifyUrl,
    token: attentionNotifyToken,
  };
}

function isTerminalAgentStatusAgent(value: unknown): value is TerminalAgentStatusAgent {
  return typeof value === 'string'
    && TERMINAL_AGENT_STATUS_AGENTS.includes(value as TerminalAgentStatusAgent);
}

function isTerminalAgentStatusState(value: unknown): value is TerminalAgentStatusState {
  return typeof value === 'string'
    && TERMINAL_AGENT_STATUS_STATES.includes(value as TerminalAgentStatusState);
}

function getAgentDisplayName(agent: TerminalAgentStatusAgent): string {
  if (agent === 'claude-code') return 'Claude Code';
  if (agent === 'opencode') return 'OpenCode';
  return 'Codex';
}

function getAgentStatusFallbackMessage(agent: TerminalAgentStatusAgent, state: TerminalAgentStatusState): string {
  const displayName = getAgentDisplayName(agent);
  if (state === 'running') return `${displayName} 正在执行。`;
  if (state === 'completed') return `${displayName} 已完成当前回合。`;
  if (state === 'needs_user') return `${displayName} 等待处理。`;
  if (state === 'error') return `${displayName} 出现异常。`;
  return `${displayName} 当前空闲。`;
}

function getAgentStatusNotificationTitle(status: TerminalAgentStatus): string {
  const displayName = getAgentDisplayName(status.agent);
  if (status.state === 'completed') return `${displayName} 已完成`;
  if (status.state === 'error') return `${displayName} 出现异常`;
  return `${displayName} 需要处理`;
}

function shouldShowAgentStatusNotification(state: TerminalAgentStatusState): boolean {
  return state === 'needs_user' || state === 'completed' || state === 'error';
}

function clearTerminalAgentStatus(
  id: string,
  states?: readonly TerminalAgentStatusState[],
): void {
  const current = agentStatusBySessionId.get(id);
  if (!current) return;
  if (states && !states.includes(current.state)) return;

  agentStatusBySessionId.delete(id);
  clearAgentNotification(id);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:agentStatusCleared', { id });
  }
}

function clearAgentNotification(id: string): void {
  const notification = agentNotificationsBySessionId.get(id);
  if (!notification) return;

  agentNotificationsBySessionId.delete(id);
  try {
    notification.close();
  } catch {
    // Ignore notification close failures.
  }
}

function clearAllAgentNotifications(): void {
  for (const id of agentNotificationsBySessionId.keys()) {
    clearAgentNotification(id);
  }
}

function hasRecentManualInterrupt(id: string): boolean {
  const timestamp = manualInterruptBySessionId.get(id);
  if (!timestamp) return false;
  if (Date.now() - timestamp <= MANUAL_INTERRUPT_SUPPRESS_MS) return true;
  manualInterruptBySessionId.delete(id);
  return false;
}

function isManualInterruptInput(data: string): boolean {
  return data.includes('\u0003') || data.includes('\u0004') || data === '\u001b';
}

function markManualTerminalInterrupt(id: string): void {
  manualInterruptBySessionId.set(id, Date.now());
  clearTerminalAgentStatus(id);
}

function sendTerminalAgentStatus(status: TerminalAgentStatus): void {
  if (status.state === 'running') {
    manualInterruptBySessionId.delete(status.id);
    clearAgentNotification(status.id);
  } else if (hasRecentManualInterrupt(status.id)) {
    return;
  }

  if (status.state === 'idle') {
    agentStatusBySessionId.delete(status.id);
    clearAgentNotification(status.id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:agentStatusCleared', { id: status.id });
    }
    return;
  }

  agentStatusBySessionId.set(status.id, status);

  if (shouldShowAgentStatusNotification(status.state)) {
    try {
      if (Notification.isSupported()) {
        clearAgentNotification(status.id);
        const notification = new Notification({
          title: getAgentStatusNotificationTitle(status),
          body: status.message || '请回到 GUI 终端继续处理。',
        });
        agentNotificationsBySessionId.set(status.id, notification);
        notification.on('close', () => {
          if (agentNotificationsBySessionId.get(status.id) === notification) {
            agentNotificationsBySessionId.delete(status.id);
          }
        });
        notification.on('click', () => {
          if (agentNotificationsBySessionId.get(status.id) === notification) {
            agentNotificationsBySessionId.delete(status.id);
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            clearTerminalAgentStatus(status.id, ['needs_user', 'completed', 'error']);
            mainWindow.webContents.send('terminal:activateSession', { id: status.id });
          }
        });
        notification.show();
      }
    } catch (error) {
      console.error('[terminal-agent-status] Failed to show notification:', error);
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:agentStatus', status);
  }
}

function parseAgentStatusPayload(payload: unknown): TerminalAgentStatus | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;

  if (data.token !== attentionNotifyToken) return null;
  if (typeof data.id !== 'string' || !hasSession(data.id)) return null;
  if (!isTerminalAgentStatusAgent(data.agent)) return null;
  if (typeof data.event !== 'string' || data.event.trim() === '') return null;
  if (!isTerminalAgentStatusState(data.state)) return null;

  const event = data.event.trim();
  const message = typeof data.message === 'string' && data.message.trim()
    ? data.message.trim()
    : getAgentStatusFallbackMessage(data.agent, data.state);

  return {
    id: data.id,
    agent: data.agent,
    state: data.state,
    event,
    message,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
  };
}

function writeHttpResponse(response: http.ServerResponse, statusCode: number, body = ''): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleAttentionRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  if (request.method !== 'POST' || request.url !== '/terminal-attention') {
    writeHttpResponse(response, 404, 'not found');
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body) as unknown;
    const status = parseAgentStatusPayload(payload);
    if (!status) {
      writeHttpResponse(response, 403, 'forbidden');
      return;
    }

    sendTerminalAgentStatus(status);
    writeHttpResponse(response, 204);
  } catch (error) {
    console.error('[terminal-agent-status] Failed to handle request:', error);
    if (!response.headersSent) {
      writeHttpResponse(response, 400, 'bad request');
    }
  }
}

function startAttentionServer(): Promise<void> {
  if (attentionServer) return Promise.resolve();

  attentionNotifyToken = randomBytes(24).toString('hex');

  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      void handleAttentionRequest(request, response);
    });

    server.on('error', (error) => {
      console.error('[terminal-agent-status] Failed to start server:', error);
      attentionNotifyUrl = '';
      attentionNotifyToken = '';
      resolve();
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        attentionNotifyUrl = `http://127.0.0.1:${address.port}/terminal-attention`;
        attentionServer = server;
      }
      resolve();
    });
  });
}

function stopAttentionServer(): void {
  attentionServer?.close();
  attentionServer = null;
  attentionNotifyUrl = '';
  attentionNotifyToken = '';
  agentStatusBySessionId.clear();
  clearAllAgentNotifications();
  manualInterruptBySessionId.clear();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  let allowNextClose = false;
  let closeConfirmationPending = false;

  // Retry loading if the Vite dev server isn't ready yet
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    let retryCount = 0;
    const maxRetries = 5;

    const loadDevServer = () => {
      mainWindow?.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    };

    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription) => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Failed to load dev server (${errorDescription}), retrying ${retryCount}/${maxRetries}...`,
          );
          setTimeout(loadDevServer, 1000);
        } else {
          console.error(
            `Failed to load dev server after ${maxRetries} retries: ${errorDescription}`,
          );
        }
      },
    );

    loadDevServer();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development (default closed, use Ctrl+Shift+I to open)
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('close', (event) => {
    if (allowNextClose || !hasActiveSessions()) {
      allowNextClose = false;
      return;
    }

    event.preventDefault();
    if (closeConfirmationPending) return;

    closeConfirmationPending = true;
    const window = mainWindow;
    if (!window || window.isDestroyed()) {
      closeConfirmationPending = false;
      return;
    }

    void confirmCloseWindow(window).then((confirmed) => {
      closeConfirmationPending = false;
      if (!confirmed || window.isDestroyed()) return;
      allowNextClose = true;
      window.close();
    });
  });

  mainWindow.on('closed', () => {
    allowNextClose = false;
    closeConfirmationPending = false;
    mainWindow = null;
  });
};

// --- IPC Handlers ---

ipcMain.handle('app:get-info', () => ({
  name: app.getName(),
  version: app.getVersion(),
}));

ipcMain.handle('app:update:check', () => checkForManualUpdate());

ipcMain.handle('app:update:open-release-page', async (_event, releaseUrl?: unknown) => {
  const resolvedUrl = typeof releaseUrl === 'string'
    ? resolveReleaseUrl(releaseUrl)
    : resolveReleaseUrl();

  if (!resolvedUrl) {
    return { ok: false, error: 'Release URL 不在允许范围内' };
  }

  await shell.openExternal(resolvedUrl);
  return { ok: true };
});

ipcMain.handle('external-link:open', async (_event, url: unknown) => {
  const resolvedUrl = resolveExternalWebUrl(url);
  if (!resolvedUrl) {
    return { ok: false, error: '只允许打开 http 或 https URL' };
  }

  try {
    await shell.openExternal(resolvedUrl);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getExternalLinkOpenErrorMessage(error) };
  }
});

// terminal:create — create a PTY session and return the session ID
ipcMain.handle(
  'terminal:create',
  async (
    _event,
    {
      cols,
      rows,
      cwd,
      transcriptId,
    }: {
      cols: number;
      rows: number;
      cwd?: string;
      transcriptId: string;
    },
  ) => {
    if (!isValidTranscriptId(transcriptId)) {
      throw new Error('Invalid transcriptId');
    }

    const session = await createSession(cols, rows, cwd, getAttentionNotificationEnv());
    ensureTerminalStreamState(session.id);
    registerTerminalTranscriptSession(session.id, transcriptId);

    // Push PTY stdout to renderer
    session.ptyProcess.onData((data: string) => {
      appendTerminalTranscript(session.id, data);
      queueTerminalOutput(session.id, data);
    });

    // Throttled CWD change detection on PTY output
    let cwdCheckScheduled = false;
    session.ptyProcess.onData(() => {
      if (cwdCheckScheduled) return;
      cwdCheckScheduled = true;
      setTimeout(async () => {
        cwdCheckScheduled = false;
        const nextInfo = await checkAndUpdateSessionInfo(session.id);
        if (nextInfo && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:sessionInfoChanged', nextInfo);
        }
      }, 1000);
    });

    setTimeout(async () => {
      const nextInfo = await getSessionInfo(session.id);
      if (nextInfo && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:sessionInfoChanged', nextInfo);
      }
    }, 0);

    // Notify renderer when PTY exits
    session.ptyProcess.onExit(
      ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        clearTerminalAgentStatus(session.id);
        manualInterruptBySessionId.delete(session.id);
        const exitMessage = `\r\n[Process exited with code ${exitCode}]`;
        appendTerminalTranscript(session.id, exitMessage);
        const streamState = terminalStreamStates.get(session.id);
        if (streamState) {
          flushTerminalOutput(session.id);
          if (streamState.attached && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(getTerminalExitChannel(session.id), {
              exitCode,
              signal,
            });
          } else {
            streamState.pendingOutput += exitMessage;
          }
        }
      },
    );

    return { id: session.id };
  },
);

ipcMain.handle('terminal:output:attach', (_event, { id }: { id: string }) => {
  return { bufferedData: attachTerminalOutput(id) };
});

ipcMain.on('terminal:output:detach', (_event, { id }: { id: string }) => {
  detachTerminalOutput(id);
});

// terminal:input — write user input to PTY stdin
ipcMain.on(
  'terminal:input',
  (_event, { id, data }: { id: string; data: string }) => {
    if (isManualInterruptInput(data)) {
      markManualTerminalInterrupt(id);
    } else {
      clearTerminalAgentStatus(id, ['needs_user']);
    }
    writeToSession(id, data);
  },
);

// terminal:resize — sync cols/rows to PTY
ipcMain.on(
  'terminal:resize',
  (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    resizeSession(id, cols, rows);
  },
);

// terminal:dispose — kill PTY and release resources
ipcMain.handle('terminal:dispose', (_event, { id }: { id: string }) => {
  clearTerminalAgentStatus(id);
  manualInterruptBySessionId.delete(id);
  clearTerminalStreamState(id);
  unregisterTerminalTranscriptSession(id);
  disposeSession(id);
});

// terminal:getSessionInfo — return the latest PTY session info
ipcMain.handle('terminal:getSessionInfo', async (_event, { id }: { id: string }) => {
  return await getSessionInfo(id);
});

// --- Terminal Buffer Persistence ---

const terminalBuffersDir = path.join(app.getPath('userData'), 'terminal-buffers');

function ensureBuffersDir(): void {
  try {
    fs.mkdirSync(terminalBuffersDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

// terminal:saveBuffer — save serialized terminal buffer to file
ipcMain.on(
  'terminal:saveBuffer',
  (_event, { sessionId, content }: { sessionId: string; content: string }) => {
    try {
      ensureBuffersDir();
      const filePath = path.join(terminalBuffersDir, `${sessionId}.txt`);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.warn('[main] Failed to save terminal buffer:', error);
    }
  },
);

// terminal:loadBuffer — load serialized terminal buffer from file
ipcMain.handle(
  'terminal:loadBuffer',
  (_event, { sessionId }: { sessionId: string }) => {
    try {
      const filePath = path.join(terminalBuffersDir, `${sessionId}.txt`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // File doesn't exist or is corrupted — silently skip
    }
    return null;
  },
);

ipcMain.handle(
  'terminal:transcript:read',
  (_event, { transcriptId }: { transcriptId: string }) => readNormalizedTranscript(transcriptId),
);

ipcMain.handle(
  'terminal:transcript:search',
  (_event, { transcriptId, query }: { transcriptId: string; query: string }) =>
    searchTranscript(transcriptId, query),
);

ipcMain.handle(
  'terminal:transcript:export',
  (_event, { transcriptId }: { transcriptId: string }) => exportTranscript(transcriptId),
);

ipcMain.handle(
  'terminal:transcript:delete',
  (_event, { transcriptId }: { transcriptId: string }) => deleteTerminalTranscript(transcriptId),
);

ipcMain.on(
  'terminal:transcript:cleanup',
  (_event, { activeTranscriptIds }: { activeTranscriptIds: string[] }) => {
    cleanupTerminalTranscripts(activeTranscriptIds);
  },
);

// terminal:cleanupBuffers — delete orphaned buffer files
ipcMain.on(
  'terminal:cleanupBuffers',
  (_event, { activeSessionIds }: { activeSessionIds: string[] }) => {
    try {
      ensureBuffersDir();
      const activeSet = new Set(activeSessionIds);
      const files = fs.readdirSync(terminalBuffersDir);
      for (const file of files) {
        const sessionId = path.basename(file, '.txt');
        if (!activeSet.has(sessionId)) {
          try {
            fs.unlinkSync(path.join(terminalBuffersDir, file));
          } catch {
            // Ignore individual file deletion errors
          }
        }
      }
    } catch {
      // Directory may not exist yet
    }
  },
);

// --- File System IPC Handlers ---

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_MARKDOWN_COMMENTS_PER_FILE = 500;
const MAX_MARKDOWN_COMMENT_BODY_LENGTH = 20_000;
const MAX_MARKDOWN_COMMENT_QUOTE_LENGTH = 20_000;
const MAX_MARKDOWN_COMMENT_CONTEXT_LENGTH = 1_000;
const MARKDOWN_COMMENT_STORE_DIR = '.aiterm';
const MARKDOWN_COMMENT_STORE_FILE = 'markdown-preview-comments.json';

interface MarkdownCommentStore {
  files: Record<string, MarkdownPreviewComment[]>;
}

interface MarkdownCommentFileRequest {
  rootPath: string;
  filePath: string;
}

interface MarkdownCommentSaveRequest extends MarkdownCommentFileRequest {
  comments: MarkdownPreviewComment[];
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeMarkdownCommentAnchor(value: unknown): MarkdownCommentAnchor | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.quote !== 'string' || data.quote.length === 0) return null;
  if (data.quote.length > MAX_MARKDOWN_COMMENT_QUOTE_LENGTH) return null;
  if (typeof data.prefix !== 'string' || data.prefix.length > MAX_MARKDOWN_COMMENT_CONTEXT_LENGTH) return null;
  if (typeof data.suffix !== 'string' || data.suffix.length > MAX_MARKDOWN_COMMENT_CONTEXT_LENGTH) return null;
  if (!isFiniteNonNegativeNumber(data.startTextOffset)) return null;
  if (!isFiniteNonNegativeNumber(data.endTextOffset)) return null;
  if (data.endTextOffset <= data.startTextOffset) return null;

  return {
    quote: data.quote,
    prefix: data.prefix,
    suffix: data.suffix,
    startTextOffset: data.startTextOffset,
    endTextOffset: data.endTextOffset,
  };
}

function sanitizeMarkdownComment(value: unknown, filePath: string): MarkdownPreviewComment | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const anchor = sanitizeMarkdownCommentAnchor(data.anchor);
  if (!anchor) return null;
  if (typeof data.id !== 'string' || data.id.trim() === '') return null;
  if (typeof data.body !== 'string' || data.body.length > MAX_MARKDOWN_COMMENT_BODY_LENGTH) return null;
  if (typeof data.createdAt !== 'string' || data.createdAt.trim() === '') return null;
  if (typeof data.updatedAt !== 'string' || data.updatedAt.trim() === '') return null;

  return {
    id: data.id,
    filePath,
    anchor,
    body: data.body,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function getMarkdownCommentStorePath(projectRoot: string): string {
  return path.join(projectRoot, MARKDOWN_COMMENT_STORE_DIR, MARKDOWN_COMMENT_STORE_FILE);
}

function normalizeMarkdownCommentRelativePath(projectRoot: string, filePath: string): string | null {
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedFile = path.resolve(path.isAbsolute(filePath) ? filePath : path.join(resolvedRoot, filePath));
  const relative = path.relative(resolvedRoot, resolvedFile);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

function getMarkdownCommentRequestPath(payload: MarkdownCommentFileRequest): {
  projectRoot: string;
  relativeFilePath: string;
} | { error: string } {
  if (!payload || typeof payload.rootPath !== 'string' || payload.rootPath.trim() === '') {
    return { error: 'Project root is required for Markdown comments.' };
  }
  if (typeof payload.filePath !== 'string' || payload.filePath.trim() === '') {
    return { error: 'File path is required for Markdown comments.' };
  }

  const projectRoot = path.resolve(payload.rootPath);
  const relativeFilePath = normalizeMarkdownCommentRelativePath(projectRoot, payload.filePath);
  if (!relativeFilePath) {
    return { error: 'Markdown comments can only be saved for files inside the current project root.' };
  }

  return { projectRoot, relativeFilePath };
}

function getMarkdownCommentFileEntries(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const data = parsed as Record<string, unknown>;
  if (data.files && typeof data.files === 'object' && !Array.isArray(data.files)) {
    return data.files as Record<string, unknown>;
  }

  return data;
}

async function readMarkdownCommentStore(projectRoot: string): Promise<MarkdownCommentStore> {
  try {
    const raw = await fs.promises.readFile(getMarkdownCommentStorePath(projectRoot), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    const store: MarkdownCommentStore = { files: {} };
    for (const [filePath, value] of Object.entries(getMarkdownCommentFileEntries(parsed))) {
      if (!Array.isArray(value)) continue;
      const relativeFilePath = normalizeMarkdownCommentRelativePath(projectRoot, filePath);
      if (!relativeFilePath) continue;
      const comments = value
        .slice(0, MAX_MARKDOWN_COMMENTS_PER_FILE)
        .map((comment) => sanitizeMarkdownComment(comment, relativeFilePath))
        .filter((comment): comment is MarkdownPreviewComment => comment !== null);
      if (comments.length > 0) store.files[relativeFilePath] = comments;
    }
    return store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { files: {} };
    throw error;
  }
}

async function writeMarkdownCommentStore(projectRoot: string, store: MarkdownCommentStore): Promise<void> {
  const storePath = getMarkdownCommentStorePath(projectRoot);
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  await fs.promises.writeFile(
    storePath,
    JSON.stringify(store, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Use `git check-ignore` to find which entries in a directory are gitignored.
 * Returns a Set of ignored entry names. Returns empty set if not in a git repo.
 * Handles exit code 1 (nothing ignored) gracefully.
 */
function getGitIgnoredNames(dirPath: string, names: string[]): Promise<Set<string>> {
  if (names.length === 0) return Promise.resolve(new Set());

  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', dirPath, 'check-ignore', '--', ...names],
      { timeout: 3000 },
      (_error, stdout) => {
        // exit 0 = some ignored (listed in stdout)
        // exit 1 = nothing ignored (stdout empty)
        // exit 128 = not a git repo
        // Any other error = git not available
        // In all cases, just parse whatever stdout we got
        if (stdout && stdout.trim()) {
          resolve(new Set(stdout.trim().split('\n').filter(Boolean)));
        } else {
          resolve(new Set());
        }
      },
    );
  });
}

/** Recursively check if a directory contains any non-ignored .md files (depth-limited). */
async function directoryContainsMarkdown(dirPath: string, maxDepth = 5): Promise<boolean> {
  if (maxDepth <= 0) return false;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = entries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) return true;
      if (entry.isDirectory()) {
        if (await directoryContainsMarkdown(path.join(dirPath, entry.name), maxDepth - 1)) {
          return true;
        }
      }
    }
  } catch {
    // Permission denied or similar — treat as no markdown
  }
  return false;
}

// fs:readdir — read directory entries, filtering gitignored files
ipcMain.handle('fs:readdir', async (_event, { dirPath }: { dirPath: string }) => {
  try {
    const resolved = path.resolve(dirPath);
    const rawEntries = await fs.promises.readdir(resolved, { withFileTypes: true });

    // Filter out gitignored entries
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(resolved, names);

    const entries = [];
    for (const entry of rawEntries) {
      if (ignored.has(entry.name)) continue;

      const isDir = entry.isDirectory();
      const isFile = entry.isFile();

      // For directories, check if they contain any non-ignored markdown files
      let containsMarkdown: boolean | undefined;
      if (isDir) {
        containsMarkdown = await directoryContainsMarkdown(
          path.join(resolved, entry.name),
        );
      }

      entries.push({
        name: entry.name,
        isDirectory: isDir,
        isFile,
        containsMarkdown,
      });
    }

    return { entries };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:readfile — read file text content (max 1MB)
ipcMain.handle('fs:readfile', async (_event, { filePath }: { filePath: string }) => {
  try {
    const resolved = path.resolve(filePath);
    const stat = await fs.promises.stat(resolved);
    if (stat.size > MAX_FILE_SIZE) {
      return { error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Maximum is 1MB.` };
    }
    const content = await fs.promises.readFile(resolved, 'utf-8');
    return { content };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:writefile — write file text content (max 1MB)
ipcMain.handle(
  'fs:writefile',
  async (_event, { filePath, content }: { filePath: string; content: string }) => {
    try {
      const resolved = path.resolve(filePath);
      if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
        return { error: `File too large (${(Buffer.byteLength(content, 'utf-8') / 1024 / 1024).toFixed(1)}MB). Maximum is 1MB.` };
      }
      await fs.promises.writeFile(resolved, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);
// markdown-comments:load - load per-project Markdown preview comments from .aiterm
ipcMain.handle(
  'markdown-comments:load',
  async (_event, payload: MarkdownCommentFileRequest) => {
    try {
      const requestPath = getMarkdownCommentRequestPath(payload);
      if ('error' in requestPath) return { error: requestPath.error };

      const store = await readMarkdownCommentStore(requestPath.projectRoot);
      return { comments: store.files[requestPath.relativeFilePath] ?? [] };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// markdown-comments:save - save per-project Markdown preview comments to .aiterm
ipcMain.handle(
  'markdown-comments:save',
  async (_event, payload: MarkdownCommentSaveRequest) => {
    try {
      const requestPath = getMarkdownCommentRequestPath(payload);
      if ('error' in requestPath) return { error: requestPath.error };

      if (!Array.isArray(payload.comments)) {
        return { error: 'Invalid comments payload.' };
      }

      const nextComments = payload.comments
        .slice(0, MAX_MARKDOWN_COMMENTS_PER_FILE)
        .map((comment) => sanitizeMarkdownComment(comment, requestPath.relativeFilePath))
        .filter((comment): comment is MarkdownPreviewComment => comment !== null);
      const store = await readMarkdownCommentStore(requestPath.projectRoot);
      if (nextComments.length === 0) {
        delete store.files[requestPath.relativeFilePath];
      } else {
        store.files[requestPath.relativeFilePath] = nextComments;
      }
      await writeMarkdownCommentStore(requestPath.projectRoot, store);
      return { success: true, comments: nextComments };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// fs:read-tree-directory — read direct children for lazy file tree loading
ipcMain.handle(
  'fs:read-tree-directory',
  async (
    _event,
    {
      dirPath,
      options,
    }: {
      dirPath: string;
      options?: ReadTreeDirectoryOptions;
    },
  ) => {
    try {
      const resolved = path.resolve(dirPath);
      const tree = await readTreeDirectory(resolved, options);
      return { tree };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// openspec-workflow:read — summarize active OpenSpec changes for the current project root
ipcMain.handle(
  'openspec-workflow:read',
  async (_event, { rootPath }: { rootPath: string }) => {
    try {
      const resolved = path.resolve(rootPath);
      if (shouldSkipScanningRoot(resolved)) {
        return {
          summary: {
            rootPath: resolved,
            changesPath: path.join(resolved, 'openspec', 'changes'),
            changes: [],
          },
        };
      }

      return { summary: await readOpenSpecWorkflowSummary(resolved) };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// --- fd availability detection (cached at startup) ---

let fdPath: string | null = null;

function detectFd(): string | null {
  try {
    const result = execFileSync('which', ['fd'], { timeout: 3000, encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}

// --- Tree node type for scan results ---

interface ScanTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
  children?: ScanTreeNode[];
}

/**
 * Build a nested tree structure from a list of relative file paths.
 * E.g. ["docs/a.md", "readme.md"] → tree with dirs and files.
 */
async function buildTreeFromPaths(rootPath: string, relativePaths: string[]): Promise<ScanTreeNode[]> {
  interface DirBucket {
    files: Set<string>;
    subdirs: Map<string, DirBucket>;
  }

  const root: DirBucket = { files: new Set(), subdirs: new Map() };

  for (const relPath of relativePaths) {
    const parts = relPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current.subdirs.has(dirName)) {
        current.subdirs.set(dirName, { files: new Set(), subdirs: new Map() });
      }
      current = current.subdirs.get(dirName) as DirBucket;
    }
    current.files.add(parts[parts.length - 1]);
  }

  async function bucketToNodes(bucket: DirBucket, parentPath: string): Promise<ScanTreeNode[]> {
    const nodes: ScanTreeNode[] = [];

    // Directories
    const dirEntries = [...bucket.subdirs.entries()];
    const dirNodes: ScanTreeNode[] = [];
    for (const [dirName, subBucket] of dirEntries) {
      const dirPath = `${parentPath}/${dirName}`;
      const children = await bucketToNodes(subBucket, dirPath);
      let mtime: number | undefined;
      try {
        const stat = await fs.promises.stat(dirPath);
        mtime = stat.mtimeMs;
      } catch { /* ignore stat errors */ }
      dirNodes.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime,
        children,
      });
    }

    // Files
    const fileNames = [...bucket.files];
    const fileNodes: ScanTreeNode[] = [];
    for (const fileName of fileNames) {
      const filePath = `${parentPath}/${fileName}`;
      let mtime: number | undefined;
      try {
        const stat = await fs.promises.stat(filePath);
        mtime = stat.mtimeMs;
      } catch { /* ignore stat errors */ }
      fileNodes.push({
        name: fileName,
        path: filePath,
        isDirectory: false,
        mtime,
      });
    }

    // Sort: mtime descending, name as tiebreaker
    dirNodes.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    fileNodes.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));

    return [...dirNodes, ...fileNodes];
  }

  return bucketToNodes(root, rootPath);
}

// Common large directories to exclude when scanning project trees.
const PROJECT_EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.cache',
  '__pycache__',
  '.tox',
  'target',
  'coverage',
  '.turbo',
  '.parcel-cache',
  '.vite',
  '.nuxt',
  '.svelte-kit',
];

const SYSTEM_ROOT_EXCLUDED_DIRS = [
  'Applications',
  'System',
  'Library',
  'private',
  'usr',
  'bin',
  'sbin',
  'etc',
  'var',
  'tmp',
  'dev',
  'Volumes',
  'Network',
  'cores',
];

const HOME_ROOT_EXCLUDED_DIRS = [
  'Library',
  '.Trash',
  '.cache',
  '.npm',
  '.yarn',
  '.cargo',
  '.rustup',
  '.gradle',
  '.m2',
  '.docker',
  '.vscode',
  '.cursor',
  '.codex',
  '.local',
];

const SYSTEM_SCAN_BLOCKED_ROOTS = SYSTEM_ROOT_EXCLUDED_DIRS.map((dirName) => path.join(path.parse(process.cwd()).root, dirName));

function isSameOrInsidePath(targetPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, targetPath);
  return relative === '' || (relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function isFilesystemRoot(rootPath: string): boolean {
  return path.resolve(rootPath) === path.parse(path.resolve(rootPath)).root;
}

function isHomeRoot(rootPath: string): boolean {
  return path.resolve(rootPath) === path.resolve(os.homedir());
}

function shouldSkipScanningRoot(rootPath: string): boolean {
  const resolved = path.resolve(rootPath);
  return SYSTEM_SCAN_BLOCKED_ROOTS.some((blockedRoot) => isSameOrInsidePath(resolved, blockedRoot));
}

async function fileExistsAt(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExistsAt(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function collectOpenSpecFiles(dirPath: string): Promise<string[]> {
  if (!await directoryExistsAt(dirPath)) return [];

  const result: string[] = [];

  async function visit(currentPath: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'spec.md') {
        result.push(entryPath);
      }
    }
  }

  await visit(dirPath);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}

function parseOpenSpecTaskProgress(content: string | null, hasTasksFile: boolean): OpenSpecTaskProgress {
  if (!hasTasksFile || content === null) {
    return {
      total: 0,
      completed: 0,
      hasTasksFile: false,
      hasCheckboxes: false,
    };
  }

  const checkboxPattern = /^\s*-\s+\[( |x|X)\]\s+/gm;
  let total = 0;
  let completed = 0;
  let match: RegExpExecArray | null;
  while ((match = checkboxPattern.exec(content)) !== null) {
    total += 1;
    if (match[1].toLowerCase() === 'x') completed += 1;
  }

  return {
    total,
    completed,
    hasTasksFile: true,
    hasCheckboxes: total > 0,
  };
}

function createOpenSpecArtifactStatus(
  id: OpenSpecArtifactId,
  filePath: string | null,
  present: boolean,
  count?: number,
): OpenSpecArtifactStatus {
  return {
    id,
    state: present ? 'present' : 'missing',
    path: present ? filePath : null,
    count,
  };
}

interface SddWorkflowArtifactConfig {
  id: OpenSpecArtifactId;
  fileName?: string;
}

interface SddWorkflowProviderConfig {
  workflow: OpenSpecWorkflowId;
  directoryName: string;
  firstArtifactId: OpenSpecArtifactId;
  taskArtifactId: OpenSpecArtifactId;
  artifacts: SddWorkflowArtifactConfig[];
}

const SDD_WORKFLOW_PROVIDERS: SddWorkflowProviderConfig[] = [
  {
    workflow: 'openspec',
    directoryName: 'openspec',
    firstArtifactId: 'proposal',
    taskArtifactId: 'tasks',
    artifacts: [
      { id: 'proposal', fileName: 'proposal.md' },
      { id: 'design', fileName: 'design.md' },
      { id: 'specs' },
      { id: 'tasks', fileName: 'tasks.md' },
    ],
  },
  {
    workflow: 'raven',
    directoryName: 'ravenspec',
    firstArtifactId: 'prd',
    taskArtifactId: 'task',
    artifacts: [
      { id: 'prd', fileName: 'PRD.md' },
      { id: 'design', fileName: 'DESIGN.md' },
      { id: 'specs' },
      { id: 'task', fileName: 'TASK.md' },
    ],
  },
];

function resolveOpenSpecNextAction(
  provider: SddWorkflowProviderConfig,
  artifacts: Partial<Record<OpenSpecArtifactId, OpenSpecArtifactStatus>>,
  taskProgress: OpenSpecTaskProgress,
): OpenSpecNextAction {
  const firstArtifact = artifacts[provider.firstArtifactId];
  if (firstArtifact?.state === 'missing') {
    return provider.firstArtifactId === 'prd' ? 'create-prd' : 'create-proposal';
  }
  if (artifacts.design?.state === 'missing' || artifacts.specs?.state === 'missing') {
    return 'continue-design-specs';
  }
  if (artifacts[provider.taskArtifactId]?.state === 'missing') return 'create-tasks';
  if (!taskProgress.hasCheckboxes) return 'inspect';
  if (taskProgress.completed < taskProgress.total) return 'apply';
  return 'verify-review-archive';
}

async function readOpenSpecChangeSummary(
  provider: SddWorkflowProviderConfig,
  changePath: string,
  name: string,
): Promise<OpenSpecChangeSummary> {
  const specsPath = path.join(changePath, 'specs');
  const artifactChecks = provider.artifacts.map(async (artifact) => {
    if (artifact.id === 'specs') {
      const specFiles = await collectOpenSpecFiles(specsPath);
      return {
        artifact,
        filePath: specFiles[0] ?? null,
        present: specFiles.length > 0,
        count: specFiles.length,
      };
    }

    const filePath = path.join(changePath, artifact.fileName ?? '');
    return {
      artifact,
      filePath,
      present: await fileExistsAt(filePath),
      count: undefined,
    };
  });
  const [artifactResults, specFiles, changeStat] = await Promise.all([
    Promise.all(artifactChecks),
    collectOpenSpecFiles(specsPath),
    fs.promises.stat(changePath),
  ]);

  const taskResult = artifactResults.find((result) => result.artifact.id === provider.taskArtifactId);
  let tasksContent: string | null = null;
  if (taskResult?.present && taskResult.filePath) {
    try {
      tasksContent = await fs.promises.readFile(taskResult.filePath, 'utf-8');
    } catch {
      tasksContent = '';
    }
  }

  const taskProgress = parseOpenSpecTaskProgress(tasksContent, !!taskResult?.present);
  const specsCount = specFiles.length;
  const artifacts = artifactResults.reduce<Partial<Record<OpenSpecArtifactId, OpenSpecArtifactStatus>>>(
    (acc, result) => {
      acc[result.artifact.id] = createOpenSpecArtifactStatus(
        result.artifact.id,
        result.filePath,
        result.present,
        result.artifact.id === 'specs' ? specsCount : result.count,
      );
      return acc;
    },
    {},
  );

  return {
    workflow: provider.workflow,
    name,
    path: changePath,
    artifacts,
    artifactIds: provider.artifacts.map((artifact) => artifact.id),
    specsCount,
    taskProgress,
    nextAction: resolveOpenSpecNextAction(provider, artifacts, taskProgress),
    mtime: changeStat.mtimeMs,
  };
}

async function readOpenSpecWorkflowSummary(rootPath: string): Promise<OpenSpecWorkflowSummary> {
  const resolvedRoot = path.resolve(rootPath);
  const changesPaths: Partial<Record<OpenSpecWorkflowId, string>> = {};
  const providerChangeGroups = await Promise.all(SDD_WORKFLOW_PROVIDERS.map(async (provider) => {
    const changesPath = path.join(resolvedRoot, provider.directoryName, 'changes');
    changesPaths[provider.workflow] = changesPath;
    if (!await directoryExistsAt(changesPath)) return [];

    const entries = await fs.promises.readdir(changesPath, { withFileTypes: true });
    const changeDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
      .map((entry) => ({
        name: entry.name,
        path: path.join(changesPath, entry.name),
      }));

    return Promise.all(
      changeDirs.map((changeDir) => readOpenSpecChangeSummary(provider, changeDir.path, changeDir.name)),
    );
  }));
  const changes = providerChangeGroups.flat();

  changes.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  return {
    rootPath: resolvedRoot,
    changesPath: changesPaths.openspec ?? path.join(resolvedRoot, 'openspec', 'changes'),
    changesPaths,
    changes,
  };
}

function getExcludedDirNames(rootPath: string): string[] {
  const excluded = new Set(PROJECT_EXCLUDED_DIRS);

  if (isFilesystemRoot(rootPath)) {
    SYSTEM_ROOT_EXCLUDED_DIRS.forEach((dirName) => excluded.add(dirName));
  }

  if (isHomeRoot(rootPath)) {
    HOME_ROOT_EXCLUDED_DIRS.forEach((dirName) => excluded.add(dirName));
  }

  return [...excluded];
}

interface ReadTreeDirectoryOptions {
  specRootPath?: string;
  specDirectoryNames?: string[];
  hiddenFolderNames?: string[];
}

function isSpecRootDirectory(dirPath: string, options?: ReadTreeDirectoryOptions): boolean {
  return !!options?.specRootPath && path.resolve(dirPath) === path.resolve(options.specRootPath);
}

function normalizeSpecDirectoryNames(names?: string[]): string[] {
  if (!names) return [];
  return [...new Set(
    names
      .map((name) => name.trim().replace(/^\/+|\/+$/g, ''))
      .filter((name) => name && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..'),
  )];
}

async function readSpecRootDirectory(
  rootPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  const specDirectoryNames = normalizeSpecDirectoryNames(options?.specDirectoryNames);
  const dirs: ScanTreeNode[] = [];

  for (const dirName of specDirectoryNames) {
    const dirPath = path.join(rootPath, dirName);
    if (shouldSkipScanningRoot(dirPath)) continue;

    try {
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) continue;

      dirs.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime: stat.mtimeMs,
      });
    } catch {
      // Missing or unreadable configured spec directories are simply omitted.
    }
  }

  return dirs;
}

async function readTreeDirectory(
  dirPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  if (shouldSkipScanningRoot(dirPath)) {
    return [];
  }

  if (isSpecRootDirectory(dirPath, options)) {
    return readSpecRootDirectory(dirPath, options);
  }

  const excludedSet = new Set(getExcludedDirNames(dirPath));
  const hiddenSet = new Set(options?.hiddenFolderNames ?? []);
  const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const names = rawEntries.map((e) => e.name);
  const ignored = await getGitIgnoredNames(dirPath, names);
  const dirs: ScanTreeNode[] = [];
  const files: ScanTreeNode[] = [];

  for (const entry of rawEntries) {
    if (entry.name.startsWith('.')) continue;
    if (ignored.has(entry.name)) continue;
    if (excludedSet.has(entry.name)) continue;
    if (entry.isDirectory() && hiddenSet.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (shouldSkipScanningRoot(entryPath)) continue;

    let mtime: number | undefined;
    try {
      const stat = await fs.promises.stat(entryPath);
      mtime = stat.mtimeMs;
    } catch {
      continue;
    }

    if (entry.isDirectory()) {
      dirs.push({
        name: entry.name,
        path: entryPath,
        isDirectory: true,
        mtime,
      });
    } else if (entry.isFile()) {
      files.push({
        name: entry.name,
        path: entryPath,
        isDirectory: false,
        mtime,
      });
    }
  }

  dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
  files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
  return [...dirs, ...files];
}

/**
 * Scan ALL files using `fd` — single subprocess, respects .gitignore automatically.
 * Excludes common large directories.
 */
function scanAllWithFd(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  return new Promise((resolve, reject) => {
    const fd = fdPath as string;
    const excludeArgs = getExcludedDirNames(rootPath).flatMap((d) => ['--exclude', d]);
    const hiddenExcludeArgs = (options?.hiddenFolderNames ?? []).flatMap((d) => ['--exclude', d]);
    execFile(
      fd,
      ['--type', 'f', '--no-hidden', ...excludeArgs, ...hiddenExcludeArgs],
      { cwd: rootPath, timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error && !stdout) {
          reject(error);
          return;
        }
        const lines = (stdout || '').trim().split('\n').filter(Boolean);
        buildTreeFromPaths(rootPath, lines).then(resolve, reject);
      },
    );
  });
}

/**
 * Fallback scan ALL files using Node.js fs — recursive traversal with git check-ignore.
 * Excludes hidden files, gitignored files, and common large directories.
 */
async function scanAllWithNodeFs(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  const excludedSet = new Set(getExcludedDirNames(rootPath));
  const hiddenSet = new Set(options?.hiddenFolderNames ?? []);

  async function scanDir(dirPath: string): Promise<ScanTreeNode[]> {
    const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    const dirs: ScanTreeNode[] = [];
    const files: ScanTreeNode[] = [];

    for (const entry of rawEntries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (excludedSet.has(entry.name)) continue;
      if (entry.isDirectory() && hiddenSet.has(entry.name)) continue;
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await scanDir(entryPath);
        if (children.length > 0) {
          const stat = await fs.promises.stat(entryPath);
          dirs.push({
            name: entry.name,
            path: entryPath,
            isDirectory: true,
            mtime: stat.mtimeMs,
            children,
          });
        }
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(entryPath);
        files.push({
          name: entry.name,
          path: entryPath,
          isDirectory: false,
          mtime: stat.mtimeMs,
        });
      }
    }

    dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  try {
    return await scanDir(rootPath);
  } catch {
    return [];
  }
}

async function scanAllTree(rootPath: string, options?: ReadTreeDirectoryOptions): Promise<ScanTreeNode[]> {
  if (fdPath) {
    try {
      return await scanAllWithFd(rootPath, options);
    } catch {
      // fd failed for this directory, fall back to Node.js
    }
  }

  return scanAllWithNodeFs(rootPath, options);
}

async function scanAllSpecDirectories(
  rootPath: string,
  options?: ReadTreeDirectoryOptions,
): Promise<ScanTreeNode[]> {
  const specDirectoryNames = normalizeSpecDirectoryNames(options?.specDirectoryNames);
  const dirs: ScanTreeNode[] = [];

  for (const dirName of specDirectoryNames) {
    const dirPath = path.join(rootPath, dirName);
    if (shouldSkipScanningRoot(dirPath)) continue;

    try {
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) continue;

      dirs.push({
        name: dirName,
        path: dirPath,
        isDirectory: true,
        mtime: stat.mtimeMs,
        children: await scanAllTree(dirPath, options),
      });
    } catch {
      // Missing or unreadable configured spec directories are simply omitted.
    }
  }

  return dirs;
}

/**
 * Scan using `fd` — single subprocess, respects .gitignore automatically.
 */
function scanWithFd(rootPath: string): Promise<ScanTreeNode[]> {
  return new Promise((resolve, reject) => {
    const fd = fdPath as string;
    const excludeArgs = getExcludedDirNames(rootPath).flatMap((d) => ['--exclude', d]);
    execFile(
      fd,
      ['-e', 'md', '--type', 'f', '--no-hidden', ...excludeArgs],
      { cwd: rootPath, timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error && !stdout) {
          reject(error);
          return;
        }
        const lines = (stdout || '').trim().split('\n').filter(Boolean);
        buildTreeFromPaths(rootPath, lines).then(resolve, reject);
      },
    );
  });
}

/**
 * Fallback scan using Node.js fs — recursive traversal with git check-ignore.
 */
async function scanWithNodeFs(rootPath: string): Promise<ScanTreeNode[]> {
  const excludedSet = new Set(getExcludedDirNames(rootPath));

  async function scanDir(dirPath: string): Promise<ScanTreeNode[]> {
    const rawEntries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const names = rawEntries.map((e) => e.name);
    const ignored = await getGitIgnoredNames(dirPath, names);

    const dirs: ScanTreeNode[] = [];
    const files: ScanTreeNode[] = [];

    for (const entry of rawEntries) {
      if (entry.name.startsWith('.')) continue;
      if (ignored.has(entry.name)) continue;
      if (excludedSet.has(entry.name)) continue;
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await scanDir(entryPath);
        // Only include directories that contain markdown (directly or nested)
        if (children.length > 0) {
          const stat = await fs.promises.stat(entryPath);
          dirs.push({
            name: entry.name,
            path: entryPath,
            isDirectory: true,
            mtime: stat.mtimeMs,
            children,
          });
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const stat = await fs.promises.stat(entryPath);
        files.push({
          name: entry.name,
          path: entryPath,
          isDirectory: false,
          mtime: stat.mtimeMs,
        });
      }
    }

    // Directories first, then files, both sorted by mtime descending (name as tiebreaker)
    dirs.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    files.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  try {
    return await scanDir(rootPath);
  } catch {
    return [];
  }
}

// fs:scan-md-files — scan all .md files under a directory, return tree structure
ipcMain.handle('fs:scan-md-files', async (_event, { rootPath: dirPath }: { rootPath: string }) => {
  try {
    const resolved = path.resolve(dirPath);
    if (shouldSkipScanningRoot(resolved)) {
      return { tree: [] };
    }
    let tree: ScanTreeNode[];
    if (fdPath) {
      try {
        tree = await scanWithFd(resolved);
      } catch {
        // fd failed for this directory, fall back to Node.js
        tree = await scanWithNodeFs(resolved);
      }
    } else {
      tree = await scanWithNodeFs(resolved);
    }
    return { tree };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:ensure-dir — recursively create a directory (mkdir -p)
ipcMain.handle('fs:ensure-dir', async (_event, { dirPath }: { dirPath: string }) => {
  try {
    const resolved = path.resolve(dirPath);
    await fs.promises.mkdir(resolved, { recursive: true });
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:delete-file — delete a file or directory (recursive for directories)
ipcMain.handle('fs:delete-file', async (_event, { filePath }: { filePath: string }) => {
  try {
    const resolved = path.resolve(filePath);
    const stat = await fs.promises.stat(resolved);
    if (stat.isDirectory()) {
      await fs.promises.rm(resolved, { recursive: true });
    } else {
      await fs.promises.unlink(resolved);
    }
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// fs:rename — rename a file or directory (fails if target already exists)
ipcMain.handle(
  'fs:rename',
  async (_event, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
    try {
      const resolvedOld = path.resolve(oldPath);
      const resolvedNew = path.resolve(newPath);
      // Check if target already exists
      try {
        await fs.promises.access(resolvedNew);
        return { error: '目标名称已存在' };
      } catch {
        // Target doesn't exist — safe to rename
      }
      await fs.promises.rename(resolvedOld, resolvedNew);
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// fs:show-in-folder — reveal a file/directory in the system file manager
ipcMain.on('fs:show-in-folder', (_event, { filePath: targetPath }: { filePath: string }) => {
  const resolved = path.resolve(targetPath);
  shell.showItemInFolder(resolved);
});

// fs:file-exists — check if a file exists on disk
ipcMain.handle('fs:file-exists', async (_event, { filePath }: { filePath: string }) => {
  try {
    const resolved = path.resolve(filePath);
    const stat = await fs.promises.stat(resolved);
    return stat.isFile();
  } catch {
    return false;
  }
});

// fs:open-file-preview — notify renderer to open a file in the preview panel
ipcMain.on(
  'fs:open-file-preview',
  (_event, { filePath, line, col }: { filePath: string; line?: number; col?: number }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fs:open-file-preview', {
        filePath: path.resolve(filePath),
        line,
        col,
      });
    }
  },
);

// fs:scan-all-files — scan all files under a directory (excluding common large dirs), return tree structure
ipcMain.handle(
  'fs:scan-all-files',
  async (
    _event,
    {
      rootPath: dirPath,
      options,
    }: {
      rootPath: string;
      options?: ReadTreeDirectoryOptions;
    },
  ) => {
    try {
      const resolved = path.resolve(dirPath);
      if (shouldSkipScanningRoot(resolved)) {
        return { tree: [] };
      }

      const tree = isSpecRootDirectory(resolved, options)
        ? await scanAllSpecDirectories(resolved, options)
        : await scanAllTree(resolved, options);

      return { tree };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
);

// --- App Lifecycle ---

// theme:set — sync Electron native theme with renderer
ipcMain.on('theme:set', (_event, { mode }: { mode: 'light' | 'dark' | 'system' }) => {
  nativeTheme.themeSource = mode;
});

// --- Tab State Persistence (file-based) ---
// Renderer localStorage is unreliable in Electron (Chromium LevelDB may not
// flush to disk before process exit).  Use a plain JSON file in userData instead.

const tabStatePath = path.join(app.getPath('userData'), 'tab-state.json');

// Async fire-and-forget save (used during normal operation)
ipcMain.on('tab-state:save', (_event, json: string) => {
  try {
    fs.writeFileSync(tabStatePath, json, 'utf-8');
  } catch (error) {
    console.warn('[main] Failed to save tab state:', error);
  }
});

// Sync save (used in renderer beforeunload to guarantee write before exit)
ipcMain.on('tab-state:save-sync', (event, json: string) => {
  try {
    fs.writeFileSync(tabStatePath, json, 'utf-8');
    event.returnValue = true;
  } catch (error) {
    console.warn('[main] Failed to save tab state (sync):', error);
    event.returnValue = false;
  }
});

// Load saved tab state
ipcMain.handle('tab-state:load', () => {
  try {
    return fs.readFileSync(tabStatePath, 'utf-8');
  } catch {
    return null;
  }
});

// --- Live View IPC handlers ---
ipcMain.handle('live-view:start', () => startLiveViewServer());

ipcMain.on('live-view:stop', () => stopLiveViewServer());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ipcMain.on('rrweb:event', (_event, rrwebEvent: any) => broadcastEvent(rrwebEvent));

app.on('ready', async () => {
  fdPath = detectFd();
  await startAttentionServer();
  createWindow();
});

// macOS: keep app alive when all windows are closed
app.on('window-all-closed', () => {
  disposeAllTerminalSessions();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Final process-exit cleanup. Window close confirmation must run before this.
app.on('will-quit', () => {
  stopAttentionServer();
  stopLiveViewServer();
  disposeAllTerminalSessions();
});
