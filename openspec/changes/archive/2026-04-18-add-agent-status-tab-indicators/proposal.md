## Why

当前 GUI 只在 Codex、Claude Code、OpenCode 触发需要 human 介入的事件后显示一次 attention 标记，无法表达 agent 正在执行、执行完成、待确认、异常等连续状态。多个 terminal tab 同时跑 agent 时，用户需要在 tab 层直接判断哪个会话正在工作、哪个已经结束、哪个需要处理。

## What Changes

- 将现有 terminal attention 事件扩展为 per-session agent status 状态模型，覆盖 `running`、`completed`、`needs_user`、`error`、`idle`。
- 保留现有系统通知能力，但仅在 `needs_user` 等需要用户介入的状态触发系统通知。
- 在二级 terminal tab 上使用固定尺寸状态槽展示状态，避免 tab 文本因状态变化产生布局抖动。
- `completed` 状态采用推荐策略：非活跃 tab 保留到用户选择该 tab 后清除；活跃 tab 短暂展示后自动淡出。
- Codex `Stop` 表示当前回合完成，映射为 `completed`；用户手动中断通过 terminal 输入侧清除状态，避免完成态误报。
- tab 正面不常驻显示 agent 类型；agent 类型和状态详情通过 tooltip 或 hover 信息表达。
- terminal 侧边栏收起时，在收起 / 展开入口展示聚合状态提示，避免隐藏 tab 后丢失状态感知。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `agent-attention-notifications`: 将单一 attention 事件扩展为 agent status 接收、分发、通知与清除规则。
- `terminal-tabs`: 在二级 terminal tab 与收起入口上展示 agent 状态标识，并保持与现有激活态、attention 提示视觉语言协调。

## Impact

- 影响主进程本地通知入口、payload 解析、系统通知触发条件与 renderer IPC。
- 影响 preload 暴露的 terminal API 类型与事件订阅。
- 影响 `scripts/aiterm-notify.mjs` 及 Codex / Claude Code / OpenCode 适配逻辑对状态 payload 的发送。
- 影响 `TerminalPanel` 的 tab 状态数据结构、清除规则和 tab 状态槽渲染。
- 影响主题 token 或局部样式，用于区分 running、completed、needs_user、error 等状态。
