## Context

AIterm 是一个 Electron 终端工作台，内建了 agent attention 通知系统：

1. **主进程**启动时创建本地 HTTP 服务（随机端口 + 24 字节 hex token）
2. **PTY 创建**时注入三个环境变量：`AITEM_NOTIFY_URL`、`AITEM_NOTIFY_TOKEN`、`AITEM_TERMINAL_SESSION_ID`
3. **hook 脚本** `scripts/aiterm-notify.mjs` 读取这些环境变量，POST JSON 到 HTTP 服务
4. **主进程**收到请求后同时发送 macOS 系统通知 + IPC 到渲染进程更新 tab 红点

管线本身工作正常，但 agent 侧未接入：

- **Codex** 的 `notify` 配置为 `git-ai checkpoint codex --hook-input`，该二进制做 git 快照，不触发 AIterm 通知
- **OpenCode** 的 `cmux-notify.ts` 插件调用 `hooks.sh`（文件不存在），且使用 cmux 环境变量协议，非 AIterm HTTP POST

## Goals / Non-Goals

**Goals:**

- Codex hook 触发时同时完成 git-ai checkpoint 和 AIterm 通知推送
- OpenCode plugin 事件触发时直接 POST 到 AIterm HTTP 服务
- 不破坏现有 git-ai checkpoint 功能
- 当 AIterm 未运行（环境变量不存在）时，所有新逻辑静默跳过

**Non-Goals:**

- 不修改 AIterm 主进程的 HTTP 服务端逻辑
- 不修改 `scripts/aiterm-notify.mjs` 的协议格式
- 不支持 Claude Code hook 接入（现有 `aiterm-notify.mjs` 已支持，只是本次不涉及配置引导）
- 不做自动化安装脚本（提供文档即可）

## Decisions

### Decision 1: Codex 使用包装脚本链式调用

**选择**：新建 `scripts/codex-hook-wrapper.mjs`，在内部依次 spawn `git-ai checkpoint` 和 `aiterm-notify.mjs`。

**替代方案**：
- 替换 `notify` 为 `aiterm-notify.mjs`，放弃 git-ai checkpoint → 丢失 checkpoint 功能，不可接受
- 在 `git-ai` 二进制内部集成 AIterm 通知 → 需要修改 git-ai 代码，维护成本高且与 AIterm 耦合

**理由**：
- 包装脚本是最小侵入方案，只需改一行 config.toml
- 两个子任务互不依赖，可并行 spawn
- 任一子任务失败不阻塞另一个

**实现要点**：
```
scripts/codex-hook-wrapper.mjs
├── 读取 stdin（Codex hook JSON input）
├── fork 1: spawn git-ai checkpoint codex --hook-input（pipe stdin）
├── fork 2: spawn aiterm-notify.mjs（pipe 相同 stdin）
└── 等待两者结束，exit 0
```

### Decision 2: OpenCode 插件内直接 HTTP POST

**选择**：修改 `cmux-notify.ts`，在 `runHook()` 中检测 `AITEM_NOTIFY_URL` 环境变量，存在时直接 fetch POST 到 AIterm HTTP 服务，不再依赖 `hooks.sh`。

**替代方案**：
- 创建缺失的 `hooks.sh` 让它转调 `aiterm-notify.mjs` → 多一层间接，且 hooks.sh 还需维护 cmux 逻辑
- 新建独立 OpenCode 插件 → 需要注册两个插件，事件去重复杂

**理由**：
- cmux-notify 插件已经有完整的事件监听和状态机逻辑，直接复用
- 插件运行在 Bun 环境，原生支持 `fetch`，无需外部依赖
- 环境变量检测保证了在非 AIterm 环境下零副作用

**实现要点**：
```typescript
// cmux-notify.ts 的 runHook() 改造
async function runHook(eventName: string, body: string, env: Record<string, string>) {
  const aitemUrl = process.env.AITEM_NOTIFY_URL
  const aitemToken = process.env.AITEM_NOTIFY_TOKEN
  const sessionId = process.env.AITEM_TERMINAL_SESSION_ID

  // AIterm 通知（优先）
  if (aitemUrl && aitemToken && sessionId) {
    await fetch(aitemUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        token: aitemToken,
        agent: 'opencode',
        event: eventName,
        message: body,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }

  // 原有 hooks.sh 调用（保留兼容）
  // ...
}
```

### Decision 3: stdin 复制策略

Codex hook 通过 stdin 传入 JSON input，包装脚本需要将同一份 stdin 分发给两个子进程。

**选择**：先将 stdin 完整读入内存，然后分别通过 pipe 写给两个子进程。

**理由**：Codex hook input 通常很小（< 1KB），内存缓冲无性能风险，且实现简单可靠。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| git-ai 二进制不存在或路径变更 | 包装脚本 spawn 失败时 catch 静默退出，不影响 AIterm 通知 |
| AIterm 未运行时环境变量不存在 | 两处均做 env 检测：包装脚本检测后跳过 aiterm-notify，插件检测后跳过 fetch |
| OpenCode 插件修改后 cmux 终端通知失效 | 保留 hooks.sh 调用逻辑，仅在其前面增加 AIterm 分支 |
| Codex config.toml 需要用户手动修改 | 在 tasks 中包含配置变更说明，后续可考虑 install 脚本 |
