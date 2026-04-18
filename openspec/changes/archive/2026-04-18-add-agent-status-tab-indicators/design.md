## Context

当前应用已经具备 agent attention 管线：主进程启动本地 loopback HTTP 入口，PTY 创建时注入 `AITEM_TERMINAL_SESSION_ID`、`AITEM_NOTIFY_URL`、`AITEM_NOTIFY_TOKEN`，agent hook / plugin 通过 `scripts/aiterm-notify.mjs` 推送事件，主进程发送系统通知并通过 IPC 更新 renderer，`TerminalPanel` 在二级 terminal tab 上显示 attention dot。

这个模型适合“需要 human 介入时提醒”，但不适合表达 agent 的连续生命周期。用户希望 Codex、Claude Code、OpenCode 在执行中、执行完成、待确认等状态都能在 tab 上有标识，同时保持现有终端侧边导航的低干扰视觉风格。

现有 Figma 选区不是本项目 Electron 终端工作台设计稿，因此本变更不从 Figma 推导 UI，只沿用代码中已有 terminal tab 视觉语言。

## Goals / Non-Goals

**Goals:**

- 将每个 terminal session 的 agent 状态建模为 `idle`、`running`、`completed`、`needs_user`、`error`。
- 在二级 terminal tab 上展示固定尺寸状态标识，避免状态变化导致 tab 文本位移或布局抖动。
- 保留系统通知，在 `needs_user`、`completed`、`error` 等需要用户回看终端的状态触发；`running` 只更新 tab。
- 支持 Codex、Claude Code、OpenCode 的不同事件能力，并统一转换为内部 agent status。
- 在 terminal 侧边栏收起时提供聚合状态提示。
- 完成态、待确认态按照用户确认的推荐策略清除。

**Non-Goals:**

- 不实现 stdout 正则解析 agent 状态。
- 不引入完整 agent protocol 客户端或 Codex App Server。
- 不自动批准或拒绝任何 agent 权限请求。
- 不为旧 attention payload 编写兼容分支，除非后续用户明确要求。
- 不在 tab 正面常驻显示 agent 名称，避免挤占 tab 名称空间。

## Decisions

### 决策 1：将 attention payload 升级为 agent status payload

统一内部 payload 使用 `state` 表达状态，保留 `agent`、`event`、`message`、`timestamp` 作为来源和展示信息。主进程接收合法 payload 后维护每个 session 的最新状态，并通过 renderer IPC 分发。

状态集合：

- `running`: agent 正在执行。
- `completed`: agent 当前回合已完成。
- `needs_user`: agent 等待用户输入、权限确认或下一步指令。
- `error`: agent 会话出现异常。
- `idle`: 清除或无显式状态。

理由：`attention` 是单点提醒语义，无法表达执行中和完成态；`status` 可以覆盖 attention，并为后续扩展提供统一模型。

替代方案：继续使用 `event` 推导 UI 状态。该方案会把 agent 专属事件泄漏到 renderer，且不同 agent 的事件命名差异较大。

### 决策 2：状态优先级由 UI 统一处理

当同一 session 在短时间内收到多个状态时，以最新状态为准；在聚合展示时按 `needs_user > error > running > completed > idle` 表达最高优先级。

理由：tab 上只能承载一个主状态，用户最需要先看到“需要处理”的 tab；聚合状态也应避免多个状态同时争抢注意力。

替代方案：tab 上显示多个 badge。该方案在侧边栏宽度有限时容易造成拥挤和布局不稳定。

### 决策 3：系统通知绑定需要用户回看的终态

主进程在收到 `needs_user`、`completed`、`error` 状态时发送 Electron 原生系统通知，`running` 和 `idle` 只更新 UI。点击系统通知仍保持现有行为：唤起窗口、展开 terminal 侧边栏、切换到对应 session，并清除该 session 的通知态标识。

理由：用户明确希望 tab 上有全状态标识，同时不能丢失已有“任务完成后提醒回到 GUI”的推送体验。执行中状态仍不发系统通知，避免运行期间造成通知噪音。

替代方案：只在 `needs_user` 发系统通知。该方案通知更克制，但会移除已有完成推送，用户已反馈不可接受。

### 决策 4：Codex 的 `Stop` 映射为 `completed`

Codex hooks 当前可用于 turn 级事件，但没有稳定的“权限确认中”事件。`UserPromptSubmit` 映射为 `running`，`Stop` 映射为 `completed`，表示 Codex 当前回合结束。

理由：用户反馈 Codex 正常完成后显示红色待确认标识会造成误解；完成态应与待确认态区分。用户手动中断不依赖 Codex `Stop` 语义，而由 terminal 输入侧清除状态。

替代方案：把 `Stop` 映射为 `needs_user`。这能保持旧 attention 语义，但会导致正常完成显示红点。

### 决策 5：Claude Code 和 OpenCode 使用更精确事件

Claude Code：

- `UserPromptSubmit` 或等价开始事件映射为 `running`。
- `Notification:permission_prompt`、`PermissionRequest` 和 `Notification:idle_prompt` 映射为 `needs_user`。
- `Stop` 映射为 `completed`。

OpenCode：

- `session.status` 中的执行中状态映射为 `running`。
- `permission.asked` 映射为 `needs_user`。
- `session.idle` 映射为 `completed`。
- `session.error` 映射为 `error`。

理由：Claude Code 与 OpenCode 有比 Codex 更细的 hook / plugin 事件，应尽量保留语义精度，再转换为内部统一状态。

替代方案：三类 agent 都只推送 Stop / idle。该方案实现更小，但无法满足“执行中”状态。

### 决策 6：tab 正面只显示状态，不常驻显示 agent 名称

二级 terminal tab 保留一个固定尺寸状态槽。状态槽使用颜色、形态和轻量动效表达状态；agent 类型、原始事件和 message 放在 tooltip 或 hover 信息中。

建议视觉：

- `running`: accent 色小点，使用克制呼吸动效。
- `completed`: 成功色小点或 check，活跃 tab 短暂展示后自动淡出。
- `needs_user`: attention 色小点和外圈脉冲。
- `error`: error 色小点。
- `idle`: 回到现有 active / inactive dot 语义或无额外状态。

理由：terminal tab 名称可能来自 git 分支或路径，常驻 agent 名称会挤压可读内容。固定状态槽能保持布局稳定。

替代方案：在 tab 内显示 `Codex running` 等文字 badge。该方案信息更直接，但对侧边栏宽度和长名称不友好。

### 决策 7：状态清除规则按状态区分

- `needs_user`: 用户选择该 tab、点击系统通知激活该 tab、或向该 session 输入内容后清除。
- `completed`: 非活跃 tab 保留到用户选择该 tab 后清除；活跃 tab 展示 2-3 秒后自动淡出。
- `running`: 收到 `completed`、`needs_user`、`error`、`idle` 或 session 退出后替换 / 清除。
- `error`: 用户选择该 tab 后可清除 UI 标识；session 关闭或退出时强制清除。
- 手动中断：用户向 session 发送 Ctrl+C、Ctrl+D 或单独 Esc 时立即清除该 session 的 agent status，并短暂忽略 agent 退出流程中补发的完成 / 待确认事件，避免中断后状态回弹。

理由：不同状态的处理意图不同，统一“选择即清除”会让活跃 tab 的完成反馈太短，统一“自动清除”又会让非活跃 tab 的完成状态丢失。

替代方案：所有状态都由输入清除。该方案会让 completed 和 error 状态残留过久。

## Risks / Trade-offs

- Codex hooks 仍为实验能力，且缺少精确权限事件 → 只使用当前稳定可观测的 `UserPromptSubmit` / `Stop`，后续如果 Codex 增加精确事件再扩展映射。
- 不做旧 attention payload 兼容 → 同步更新全局 Codex / Claude Code / OpenCode hook 配置，确保所有 agent 侧推送显式携带 `state`。
- 状态来源可能缺失或 agent 配置未启用 → 未接入的 agent session 不显示 agent status，不能从 stdout 猜测。
- 多个 agent 在同一 terminal session 中交替运行 → 状态以最新合法 payload 为准，tooltip 保留 agent 和 event 以便排查。
- 动效过强会干扰 terminal 使用 → running 使用低强度呼吸，needs_user 才使用更明显的 attention 外圈。
