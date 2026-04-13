#!/usr/bin/env node

// Codex requires `[features].codex_hooks = true` in config.toml for hooks to run.
const args = parseArgs(process.argv.slice(2));
const hookInput = await readHookInput();

const url = process.env.AITEM_NOTIFY_URL;
const token = process.env.AITEM_NOTIFY_TOKEN;
const id = process.env.AITEM_TERMINAL_SESSION_ID;

if (!url || !token || !id) {
  process.exit(0);
}

const agent = args.agent || inferAgent(hookInput);
const event = normalizeEvent(args.event || inferEvent(hookInput), agent, hookInput);
const message = args.message || inferMessage(agent, event, hookInput);

if (!agent || !event) {
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

function inferMessage(agent, event, input) {
  if (input && typeof input === 'object' && typeof input.message === 'string') {
    return input.message;
  }

  if (agent === 'claude-code') {
    if (event === 'Notification:permission_prompt') {
      return 'Claude Code 等待权限确认。';
    }
    if (event === 'Notification:idle_prompt') {
      return 'Claude Code 已暂停，等待你的下一步输入。';
    }
    return 'Claude Code 需要你回到终端处理。';
  }

  if (agent === 'opencode') {
    if (event === 'permission.asked') return 'OpenCode 等待权限确认。';
    if (event === 'session.idle') return 'OpenCode 已暂停，等待你的下一步输入。';
    return 'OpenCode 需要你回到终端处理。';
  }

  return 'Codex 已停止当前回合，等待你的下一步输入。';
}
