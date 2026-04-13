## Context

当前应用的终端链路是 Electron 主进程通过 `node-pty` 创建 PTY，会话输出经 IPC 推给渲染进程，渲染层使用 xterm.js 展示内容并维护 terminal tab。这个结构适合运行 Codex、Claude Code 和 OpenCode，但 GUI 客户端并不知道这些 agent 的生命周期事件。

用户希望 agent 在需要 human 介入时通知 GUI 终端。stdout 正则识别不稳定，因此本变更以 agent 原生 hook / plugin 为触发源，GUI 只提供一个轻量本地接收入口、系统通知和 tab 状态标记。

三类 agent 的触发点不同：Codex hooks 当前仍是实验能力，且公开事件中没有独立的“approval requested”事件，MVP 采用 `Stop` hook 表示当前 turn 停止并等待用户下一步输入；Claude Code 支持 `Notification` hook，可匹配 `permission_prompt` 与 `idle_prompt`；OpenCode 使用 plugin 事件，可监听 `permission.asked` 与 `session.idle`。三者通过适配器转换为统一的 `terminal attention` payload。

## Goals / Non-Goals

**Goals:**
- Codex hook、Claude Code hook、OpenCode plugin 能把通知事件推送到运行它们的 GUI terminal session。
- GUI 客户端收到事件后发送 Electron 原生系统通知。
- 对应 terminal tab 显示“需要处理”的轻量状态标记。
- 用户切回对应 tab 或向对应 PTY 输入内容后，清除该状态。
- 实现保持最小：只覆盖三类 agent 的原生 hook / plugin 入口，不引入 stdout 正则检测。

**Non-Goals:**
- 不实现 Codex App Server 或完整 agent protocol 客户端。
- 不从终端输出内容推断 human-intervention 状态。
- 不自动修改用户全局 `~/.codex`、`~/.claude` 或 OpenCode 全局配置，除非后续实现时用户明确要求。
- 不拦截或自动批准任何 agent 的权限请求。

## Decisions

### 决策 1：使用本地 loopback HTTP 接收 hook 通知

主进程启动一个仅绑定 `127.0.0.1` 的轻量 HTTP 接收入口，例如 `POST /terminal-attention`。接收 payload 包含 terminal session id、agent、event、message、timestamp 等字段。成功接收后，主进程发系统通知，并通过 IPC 推送给渲染进程。

理由：Codex / Claude Code hook 命令和 OpenCode plugin 都能调用普通 HTTP 入口，调用本地 HTTP 比 Unix socket 或 Electron IPC 更容易从 shell / Node 脚本中调用，也便于手动验证。绑定 loopback 且使用 token 校验，可以避免同机其他进程随意伪造通知。

替代方案：使用 Unix domain socket。它更收敛，但 hook 脚本实现和跨平台路径处理更复杂；本项目当前主要是个人 GUI 工具，loopback + token 更符合最小实现目标。

### 决策 2：PTY 创建时注入通知环境变量

创建 PTY 时为子进程注入：
- `AITEM_TERMINAL_SESSION_ID`
- `AITEM_NOTIFY_URL`
- `AITEM_NOTIFY_TOKEN`

agent 及其 hook / plugin 子进程继承这些变量后，就能把事件回推到正确的 GUI terminal tab。

理由：不需要 hook 脚本猜测当前 GUI tab，也不需要写全局状态文件映射 session。session id 已经是应用内现有会话标识，复用它最直接。

替代方案：hook 脚本读取临时文件查找最近活跃 terminal。该方案在多个 terminal 同时运行 Codex 时容易串台。

### 决策 3：每个 agent 使用自身原生扩展点，统一调用同一个通知脚本或入口

在项目内提供通用通知脚本，并提供三类 agent 的最小配置：
- Codex：repo-local `.codex/hooks.json` 配置 `Stop` hook 调用通知脚本。
- Claude Code：repo-local 或示例 `.claude/settings.json` 配置 `Notification` hook，至少匹配 `permission_prompt` 与 `idle_prompt`。
- OpenCode：repo-local `.opencode/plugins/aiterm-notify.js` 监听 `permission.asked` 与 `session.idle`。

脚本或 plugin 从 stdin / event 对象读取 agent 事件数据，并从环境变量读取 GUI 通知入口，发送简化后的通知 payload。

理由：repo-local 配置不需要改用户全局配置，且三个 agent 都能在项目上下文内维护自己的扩展文件。GUI 端只认统一 payload，避免把 agent 专属事件格式泄漏到渲染层。

替代方案：只做一个 stdout 正则检测器。该方案对 TUI 重绘、文案变化和多语言输出不稳定，也难以区分真实 agent 等待与普通命令输出。

### 决策 4：事件类型按 agent 保留原始语义，但 UI 使用统一状态

payload 保留 `agent` 与 `event`，例如：
- `codex` / `Stop`
- `claude-code` / `Notification:permission_prompt`
- `claude-code` / `Notification:idle_prompt`
- `opencode` / `permission.asked`
- `opencode` / `session.idle`

主进程可以用这些字段生成更准确的通知标题和正文；渲染层只把它们归一为对应 session 的 attention 状态。

理由：保留原始事件便于调试和后续细分展示，但 tab UI 不需要为不同 agent 维护不同状态机。

替代方案：所有适配器只发送 `kind: attention`。这更简单，但会丢失来源信息，后续排查误报或改文案更困难。

### 决策 5：渲染层只维护展示状态，不负责系统通知

主进程负责接收 hook 通知和发送系统通知；渲染层通过 `terminalApi.onAttention` 接收事件，只维护 `attentionBySessionId`，并在对应 tab 显示标记。

理由：Electron 原生通知属于主进程职责，渲染层只需要更新 UI。这样与现有 `terminal:output`、`terminal:exit`、`terminal:sessionInfoChanged` 的 IPC 分工一致。

替代方案：hook 直接触发系统通知，不经过 GUI。这样无法给 terminal tab 打标，也不能保证通知归属到正确 GUI 会话。

### 决策 6：状态清除由用户回到上下文或输入触发

当用户选择对应 terminal tab，或该 session 收到 `terminal:input`，系统清除该 session 的 attention 状态。主进程也应在 session dispose / exit 时清理内部状态。

理由：MVP 不需要复杂的状态机。用户切回或输入说明已经看到/处理该上下文，可以清除提醒。

替代方案：等待 agent 后续 hook 事件自动清除。不同 agent 对“已恢复运行/用户已处理”的事件语义不一致，依赖它会让状态残留。

## Risks / Trade-offs

- **Codex hooks 仍是实验能力** → 只依赖最小的 command hook 机制，并把 hook 事件类型封装在脚本内；未来事件名变化时只需要改 Codex 配置和脚本。
- **Codex 当前没有精确 approval requested hook** → MVP 明确使用 `Stop` hook 提醒 turn 停止等待用户，后续若出现精确事件再复用通知入口扩展。
- **Claude Code / OpenCode 事件格式可能变化** → 适配器负责消化 agent 专属格式，GUI 通知入口只接收稳定的内部 payload。
- **本地 HTTP 入口可能被同机进程调用** → 只绑定 `127.0.0.1`，使用启动时随机 token 校验，token 只通过 PTY 环境变量传给子进程。
- **多个 terminal 同时运行不同 agent 时可能混淆** → payload 必须携带 `AITEM_TERMINAL_SESSION_ID`，主进程只接受当前存在的 session id。
- **系统通知权限可能被操作系统禁用** → 即使系统通知失败，渲染层 tab 标记仍然显示 attention 状态。
