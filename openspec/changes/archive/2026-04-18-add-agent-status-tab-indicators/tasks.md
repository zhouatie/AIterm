## 1. 状态模型与 IPC 契约

- [x] 1.1 将 `TerminalAttention` 类型升级或替换为统一的 terminal agent status 类型，包含 session id、agent、state、event、message、timestamp
- [x] 1.2 定义 `running`、`completed`、`needs_user`、`error`、`idle` 状态枚举与合法性校验
- [x] 1.3 更新 preload 暴露的 terminal API 订阅类型，使 renderer 能接收 agent status 和状态清除事件

## 2. 主进程通知入口与状态分发

- [x] 2.1 更新本地 HTTP 通知入口 payload 解析，要求合法 token、session id、agent、state 和 event
- [x] 2.2 在主进程维护每个 terminal session 的最新 agent status，并在 session close / exit 时清理
- [x] 2.3 仅在 state 为 `needs_user`、`completed` 或 `error` 时发送 Electron 系统通知，`running` 和 `idle` 只推送 renderer
- [x] 2.4 保持点击系统通知激活窗口、展开 terminal 侧边栏、切换 session，并清除对应通知态状态

## 3. Agent 适配脚本与事件映射

- [x] 3.1 更新 `scripts/aiterm-notify.mjs`，发送 state 字段并按 agent/event 映射内部状态
- [x] 3.2 为 Codex 映射 `UserPromptSubmit -> running`、`Stop -> completed`
- [x] 3.3 为 Claude Code 映射 `UserPromptSubmit -> running`、`Notification:permission_prompt` / `PermissionRequest -> needs_user`、`Notification:idle_prompt -> needs_user`、`Stop -> completed`
- [x] 3.4 为 OpenCode 映射 `session.status -> running`、`permission.asked -> needs_user`、`session.idle -> completed`、`session.error -> error`
- [x] 3.5 确保通知环境变量缺失或 HTTP 请求失败时脚本 / plugin 静默退出，不阻塞 agent
- [x] 3.6 更新全局 Codex、Claude Code、OpenCode hook / plugin 配置，使其发送显式 state payload

## 4. Renderer 状态管理与清除规则

- [x] 4.1 将 `TerminalPanel` 中的 `attentionBySessionId` 调整为 agent status 状态表
- [x] 4.2 实现 `needs_user` 在选择 tab、点击系统通知激活 tab、用户输入对应 session 时清除
- [x] 4.3 实现活跃 tab 的 `completed` 状态展示 2 到 3 秒后自动淡出
- [x] 4.4 实现非活跃 tab 的 `completed` 状态保留到用户选择该 tab 后清除
- [x] 4.5 实现 `running` 被后续 `completed`、`needs_user`、`error`、`idle` 状态替换或清除
- [x] 4.6 实现 `error` 状态在用户选择对应 tab 或 session 结束后清除
- [x] 4.7 实现用户手动中断（Ctrl+C / Ctrl+D / 单独 Esc）后清除该 session 的 agent status，并短暂抑制中断流程补发的终态

## 5. Terminal tab 视觉与交互

- [x] 5.1 在二级 terminal tab 的固定状态槽中渲染 `running`、`completed`、`needs_user`、`error`、`idle` 的状态标识
- [x] 5.2 保证状态标识变化不移动 tab 名称、快捷键序号槽或关闭按钮
- [x] 5.3 为状态标识添加 tooltip 或 hover 信息，展示 agent 名称和 message
- [x] 5.4 保持 tab 正面不常驻显示 Codex、Claude Code 或 OpenCode 文本文案
- [x] 5.5 在 terminal 侧边栏收起时，在收起 / 展开入口展示聚合状态提示
- [x] 5.6 按 `needs_user > error > running > completed > idle` 实现聚合状态与冲突状态优先级

## 6. 验证

- [x] 6.1 手动模拟合法 `running`、`completed`、`needs_user`、`error`、`idle` payload，确认 tab 状态更新正确
- [x] 6.2 手动模拟非法 token、未知 session、未知 state，确认不会发送系统通知或更新 UI
- [x] 6.3 验证 `needs_user`、`completed`、`error` 触发系统通知，`running`、`idle` 不触发系统通知
- [x] 6.4 验证侧边栏展开和收起两种状态下的 tab / 聚合状态显示与清除规则
- [x] 6.5 验证状态变化不会造成 terminal tab 文本和按钮布局抖动
