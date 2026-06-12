#!/usr/bin/env node

// Shared AIterm notification CLI for Codex / Claude Code / OpenCode.
// Codex requires `[features].hooks = true` in config.toml for hooks to run.
const args = parseArgs(process.argv.slice(2));
const hookInput = await readHookInput();

const url = process.env.AITEM_NOTIFY_URL;
const token = process.env.AITEM_NOTIFY_TOKEN;
const id = process.env.AITEM_TERMINAL_SESSION_ID;

if (!url || !token || !id) {
  process.exit(0);
}

const preset = getPreset(args.preset);
const agent = args.agent || preset.agent || inferAgent(hookInput);
const event = normalizeEvent(args.event || preset.event || inferEvent(hookInput), agent, hookInput);
const state = args.state || preset.state || inferState(agent, event, hookInput);
const message = args.message || preset.message || inferMessage(agent, event, hookInput);

if (!agent || !event || !state) {
  process.exit(0);
}

try {
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id,
      token,
      agent,
      state,
      event,
      message,
      timestamp: Date.now(),
    }),
  });
} catch {
  // Hooks must never block the agent when the GUI app is unavailable.
}

process.exit(0);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function getPreset(name) {
  if (!name) return emptyPreset();

  switch (name) {
    case 'codex-running':
      return {
        agent: 'codex',
        event: 'UserPromptSubmit',
        state: 'running',
        message: 'Codex 正在执行。',
      };
    case 'codex-needs-user':
      return {
        agent: 'codex',
        event: 'PermissionRequest',
        state: 'needs_user',
        message: 'Codex 已暂停，等待你的确认。',
      };
    case 'codex-stop':
      return {
        agent: 'codex',
        event: 'Stop',
        state: 'completed',
        message: 'Codex 已完成当前回合。',
      };
    case 'claude-running':
      return {
        agent: 'claude-code',
        event: 'UserPromptSubmit',
        state: 'running',
        message: 'Claude Code 正在执行。',
      };
    case 'claude-permission':
      return {
        agent: 'claude-code',
        event: 'PermissionRequest',
        state: 'needs_user',
        message: 'Claude Code 等待权限确认。',
      };
    case 'claude-stop':
      return {
        agent: 'claude-code',
        event: 'Stop',
        state: 'completed',
        message: 'Claude Code 已完成当前回合。',
      };
    default:
      return emptyPreset();
  }
}

function emptyPreset() {
  return {
    agent: '',
    event: '',
    state: '',
    message: '',
  };
}

async function readHookInput() {
  if (process.stdin.isTTY) return null;

  try {
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    const trimmed = input.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function inferAgent(input) {
  if (input && typeof input === 'object' && input.hook_event_name) {
    return 'codex';
  }
  return '';
}

function inferEvent(input) {
  if (!input || typeof input !== 'object') return '';
  if (typeof input.hook_event_name === 'string') return input.hook_event_name;
  if (typeof input.hookEventName === 'string') return input.hookEventName;
  return '';
}

function normalizeEvent(event, agent, input) {
  if (agent === 'claude-code' && event === 'Notification') {
    const notificationType = input && typeof input === 'object'
      ? input.notification_type
      : '';
    if (typeof notificationType === 'string' && notificationType) {
      return `Notification:${notificationType}`;
    }
  }
  return event;
}

function inferState(agent, event, input) {
  if (agent === 'codex') {
    if (event === 'UserPromptSubmit') return 'running';
    if (event === 'PermissionRequest') return 'needs_user';
    if (event === 'Stop') return 'completed';
    return '';
  }

  if (agent === 'claude-code') {
    if (event === 'UserPromptSubmit') return 'running';
    if (event === 'PermissionRequest') return 'needs_user';
    if (event === 'Notification:permission_prompt') return 'needs_user';
    if (event === 'Notification:idle_prompt') return 'needs_user';
    if (event === 'Stop') return 'completed';
    return '';
  }

  if (agent === 'opencode') {
    if (event === 'session.status') return inferOpenCodeSessionStatusState(input);
    if (event === 'permission.asked') return 'needs_user';
    if (event === 'session.idle') return 'completed';
    if (event === 'session.error') return 'error';
    return '';
  }

  return '';
}

function inferOpenCodeSessionStatusState(input) {
  if (!input || typeof input !== 'object') return 'running';
  let status = '';
  if (typeof input.status === 'string') {
    status = input.status;
  } else if (
    input.properties &&
    typeof input.properties === 'object' &&
    typeof input.properties.status === 'string'
  ) {
    status = input.properties.status;
  }
  if (!status) return 'running';
  if (status === 'idle') return 'completed';
  if (status === 'error') return 'error';
  return 'running';
}

function inferMessage(agent, event, input) {
  if (input && typeof input === 'object' && typeof input.message === 'string') {
    return input.message;
  }

  if (agent === 'claude-code') {
    if (event === 'PermissionRequest') {
      return 'Claude Code 等待权限确认。';
    }
    if (event === 'Notification:permission_prompt') {
      return 'Claude Code 等待权限确认。';
    }
    if (event === 'Notification:idle_prompt') {
      return 'Claude Code 已暂停，等待你的下一步输入。';
    }
    if (event === 'UserPromptSubmit') return 'Claude Code 正在执行。';
    if (event === 'Stop') return 'Claude Code 已完成当前回合。';
    return 'Claude Code 状态已更新。';
  }

  if (agent === 'opencode') {
    if (event === 'permission.asked') return 'OpenCode 等待权限确认。';
    if (event === 'session.idle') return 'OpenCode 已完成当前回合。';
    if (event === 'session.error') return 'OpenCode 出现异常。';
    if (event === 'session.status') return 'OpenCode 正在执行。';
    return 'OpenCode 状态已更新。';
  }

  if (event === 'UserPromptSubmit') return 'Codex 正在执行。';
  if (event === 'PermissionRequest') return 'Codex 已暂停，等待你的确认。';
  return 'Codex 已完成当前回合。';
}
