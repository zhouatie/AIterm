# agent-attention-notifications Specification

## Purpose
定义 AIterm terminal agent status 通知入口、PTY 环境注入、Codex / Claude Code / OpenCode 适配事件、系统通知分发，以及 terminal tab 状态清除策略。

## Requirements
### Requirement: Agent 通知入口
系统 SHALL 提供一个仅本机可访问的通知入口，用于接收 Codex、Claude Code、OpenCode 推送的 terminal agent status 事件。

#### Scenario: 接收合法 agent status 通知
- **WHEN** agent hook 或 plugin 向通知入口发送包含有效 token、terminal session id、agent、state、event 和 message 的请求
- **THEN** 系统 SHALL 接收该事件并将其关联到对应 terminal session
- **THEN** 系统 SHALL 按 state 更新该 terminal session 的 agent status

#### Scenario: 拒绝非法 token
- **WHEN** 通知入口收到缺失 token 或 token 不匹配的请求
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

#### Scenario: 拒绝未知 terminal session
- **WHEN** 通知入口收到的 terminal session id 不属于当前活跃或已存在的 PTY 会话
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

#### Scenario: 拒绝非法 agent status state
- **WHEN** 通知入口收到的 state 不是系统支持的 agent status state
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

### Requirement: PTY 通知环境变量
系统 SHALL 在创建 PTY 会话时注入 agent hook / plugin 推送 GUI 通知所需的最小环境变量。

#### Scenario: 注入当前 terminal session id
- **WHEN** 系统创建新的 PTY 会话
- **THEN** PTY 进程环境变量 SHALL 包含当前 terminal session id

#### Scenario: 注入通知入口信息
- **WHEN** 系统创建新的 PTY 会话
- **THEN** PTY 进程环境变量 SHALL 包含 GUI 通知入口地址和访问 token

#### Scenario: hook 子进程继承通知环境
- **WHEN** 用户在该 PTY 中运行 Codex、Claude Code 或 OpenCode，且 agent 执行 hook / plugin
- **THEN** hook / plugin SHALL 能通过继承的环境变量定位 GUI 通知入口和当前 terminal session

### Requirement: Codex hook 推送
系统 SHALL 提供 Codex hook 可调用的轻量脚本，将 Codex hook 输入转换为 GUI terminal agent status 事件。

#### Scenario: UserPromptSubmit hook 推送 running
- **WHEN** Codex 触发 `UserPromptSubmit` hook 且通知环境变量存在
- **THEN** hook 脚本 SHALL 向 GUI 通知入口发送 agent 为 `codex`、event 为 `UserPromptSubmit`、state 为 `running` 的 agent status 事件

#### Scenario: Stop hook 推送 completed
- **WHEN** Codex 触发 `Stop` hook 且通知环境变量存在
- **THEN** hook 脚本 SHALL 向 GUI 通知入口发送 agent 为 `codex`、event 为 `Stop`、state 为 `completed` 的 agent status 事件

#### Scenario: 通知环境不存在时静默退出
- **WHEN** Codex hook 脚本运行但缺少 GUI 通知入口或 terminal session 环境变量
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

#### Scenario: 通知发送失败时不影响 Codex
- **WHEN** hook 脚本无法连接 GUI 通知入口或请求失败
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

### Requirement: Claude Code hook 推送
系统 SHALL 提供 Claude Code hook 可调用的轻量脚本或配置，将 Claude Code hook 事件转换为 GUI terminal agent status 事件。

#### Scenario: UserPromptSubmit hook 推送 running
- **WHEN** Claude Code 触发 `UserPromptSubmit` hook 且通知环境变量存在
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `UserPromptSubmit`、state 为 `running` 的 agent status 事件

#### Scenario: permission prompt 推送 needs_user
- **WHEN** Claude Code 触发 `Notification` hook 且 `notification_type` 为 `permission_prompt`，或触发 `PermissionRequest` hook
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:permission_prompt` 或 `PermissionRequest`、state 为 `needs_user` 的 agent status 事件

#### Scenario: idle prompt 推送 needs_user
- **WHEN** Claude Code 触发 `Notification` hook 且 `notification_type` 为 `idle_prompt`
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:idle_prompt`、state 为 `needs_user` 的 agent status 事件

#### Scenario: Stop hook 推送 completed
- **WHEN** Claude Code 触发 `Stop` hook 且通知环境变量存在
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Stop`、state 为 `completed` 的 agent status 事件

#### Scenario: Claude Code 通知失败时不影响 agent
- **WHEN** Claude Code hook 无法连接 GUI 通知入口或请求失败
- **THEN** hook SHALL 正常退出
- **THEN** hook SHALL NOT 阻塞 Claude Code 正常流程

### Requirement: OpenCode plugin 推送
系统 SHALL 提供 OpenCode plugin 或配置，将 OpenCode session、permission 和 error 事件转换为 GUI terminal agent status 事件。

#### Scenario: session status 推送 running
- **WHEN** OpenCode plugin 收到表示 session 正在工作的状态事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.status`、state 为 `running` 的 agent status 事件

#### Scenario: permission asked 推送 needs_user
- **WHEN** OpenCode plugin 收到 `permission.asked` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `permission.asked`、state 为 `needs_user` 的 agent status 事件

#### Scenario: session idle 推送 completed
- **WHEN** OpenCode plugin 收到 `session.idle` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.idle`、state 为 `completed` 的 agent status 事件

#### Scenario: session error 推送 error
- **WHEN** OpenCode plugin 收到表示 session 错误的事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.error`、state 为 `error` 的 agent status 事件

#### Scenario: OpenCode 通知失败时不影响 agent
- **WHEN** OpenCode plugin 无法连接 GUI 通知入口或请求失败
- **THEN** plugin SHALL 正常结束当前事件处理
- **THEN** plugin SHALL NOT 阻塞 OpenCode 正常流程

### Requirement: GUI attention 通知分发
系统 SHALL 在接收到合法 terminal agent status 事件后按 state 触发系统通知和渲染进程状态更新，并支持用户通过点击系统通知直接激活对应的 terminal session。

#### Scenario: 需要用户介入或终态时发送系统通知
- **WHEN** 主进程接收到合法 terminal agent status 事件且 state 为 `needs_user`、`completed` 或 `error`
- **THEN** 系统 SHALL 发送 Electron 原生系统通知
- **THEN** 通知内容 SHALL 能表达对应 agent 的当前状态

#### Scenario: running 状态不发送系统通知
- **WHEN** 主进程接收到合法 terminal agent status 事件且 state 为 `running`
- **THEN** 系统 SHALL NOT 发送 Electron 原生系统通知
- **THEN** 系统 SHALL 仍向渲染进程推送该状态

#### Scenario: idle 状态仅清除 UI 状态
- **WHEN** 主进程接收到合法 terminal agent status 事件且 state 为 `idle`
- **THEN** 系统 SHALL 清除对应 terminal session 的 agent status
- **THEN** 系统 SHALL NOT 发送 Electron 原生系统通知

#### Scenario: 推送渲染进程事件
- **WHEN** 主进程接收到合法 terminal agent status 事件
- **THEN** 系统 SHALL 通过 preload 暴露的 terminal API 向渲染进程推送该事件

#### Scenario: 系统通知失败时保留 UI 状态
- **WHEN** 主进程接收到合法 terminal agent status 事件但系统通知无法展示
- **THEN** 系统 SHALL 仍向渲染进程推送该事件

#### Scenario: 点击系统通知唤起应用窗口
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 将应用主窗口恢复至可见状态（若已最小化则先还原）
- **THEN** 系统 SHALL 将应用主窗口置于前台并获得焦点

#### Scenario: 点击系统通知激活对应 terminal session
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 切换到触发该通知的 terminal session tab
- **THEN** 该 terminal session 的 `needs_user`、`completed` 或 `error` 状态 SHALL 被清除
- **THEN** 其他 terminal session 的 agent status SHALL 保持不变

#### Scenario: 点击系统通知时展开 terminal 侧边栏
- **WHEN** 用户点击系统通知，且 terminal 侧边栏处于收起状态
- **THEN** terminal 侧边栏 SHALL 自动展开

#### Scenario: 点击系统通知时 terminal session 已不存在
- **WHEN** 用户点击系统通知，但对应 terminal session 已关闭或不再存在
- **THEN** 系统 SHALL 静默忽略该激活指令
- **THEN** 系统 SHALL NOT 产生报错或异常状态

### Requirement: terminal tab attention 状态
terminal 面板 SHALL 在对应二级 terminal tab 上展示 agent status，并在用户回到该上下文或状态结束后按规则清除。

#### Scenario: 非活跃 tab 收到 needs_user
- **WHEN** 非当前活跃 terminal session 收到 `needs_user` agent status
- **THEN** 对应二级 terminal tab SHALL 显示需要用户处理的状态标记

#### Scenario: 活跃 tab 收到 needs_user
- **WHEN** 当前活跃 terminal session 收到 `needs_user` agent status
- **THEN** 系统 SHALL 记录该 session 的 agent status
- **THEN** 对应二级 terminal tab SHALL 显示需要用户处理的状态标记

#### Scenario: 选择 tab 后清除待处理终态
- **WHEN** 用户选择带有 `needs_user`、`completed` 或 `error` 状态的二级 terminal tab
- **THEN** 系统 SHALL 清除该 terminal session 的对应 agent status

#### Scenario: 用户输入后清除待处理终态
- **WHEN** 用户向带有 `needs_user`、`completed` 或 `error` 状态的 terminal session 输入内容
- **THEN** 系统 SHALL 清除该 terminal session 的对应 agent status

#### Scenario: 新状态替换旧状态
- **WHEN** terminal session 已存在 agent status 且收到新的合法 agent status
- **THEN** 系统 SHALL 使用新状态替换旧状态

#### Scenario: session 关闭后清除状态
- **WHEN** 带有 agent status 的 terminal session 被关闭或退出
- **THEN** 系统 SHALL 清除该 terminal session 的 agent status

### Requirement: Agent 状态数据模型
系统 SHALL 使用统一 agent status 数据模型表示 terminal 中 agent 的当前状态。

#### Scenario: 状态对象字段
- **WHEN** 系统记录或向渲染进程发送 agent status
- **THEN** 状态对象 SHALL 包含 terminal session id、agent、state、event、message 和 timestamp

#### Scenario: 支持的 agent 类型
- **WHEN** 系统校验 agent status
- **THEN** agent SHALL 仅允许 `codex`、`claude-code` 或 `opencode`

#### Scenario: 支持的状态类型
- **WHEN** 系统校验 agent status state
- **THEN** state SHALL 仅允许 `running`、`completed`、`needs_user`、`error` 或 `idle`

#### Scenario: idle 状态语义
- **WHEN** 系统收到 state 为 `idle` 的 agent status
- **THEN** 系统 SHALL 将其解释为清除对应 terminal session 的 UI agent status

### Requirement: Agent 状态清除策略
系统 SHALL 按状态语义清除 terminal tab 上的 agent status。

#### Scenario: 活跃 tab completed 自动清除
- **WHEN** 当前活跃 terminal session 收到 `completed` 状态
- **THEN** terminal tab SHALL 短暂展示完成状态
- **THEN** 系统 SHALL 在 2 到 3 秒内自动清除该状态

#### Scenario: 非活跃 tab completed 保持至查看
- **WHEN** 非当前活跃 terminal session 收到 `completed` 状态
- **THEN** terminal tab SHALL 保持完成状态标记
- **THEN** 用户选择该 tab 后系统 SHALL 清除该状态

#### Scenario: running 被后续状态替换
- **WHEN** terminal session 当前状态为 `running`
- **THEN** 后续 `completed`、`needs_user`、`error` 或 `idle` SHALL 替换或清除该状态

#### Scenario: error 状态在用户查看后清除
- **WHEN** terminal session 当前状态为 `error`
- **THEN** terminal tab SHALL 保持错误状态标记
- **THEN** 用户选择该 tab 后系统 SHALL 清除该状态

#### Scenario: 手动中止清除状态
- **WHEN** 用户通过 terminal 输入手动中止信号（例如 Ctrl+C、Ctrl+D 或单独 Esc）
- **THEN** 系统 SHALL 立即清除该 terminal session 的 agent status
- **THEN** 系统 SHALL 在短时间内忽略该 session 随后到达的终态通知，避免状态回弹

#### Scenario: 新运行状态重新开始
- **WHEN** 手动中止后的 terminal session 收到新的 `running` 状态
- **THEN** 系统 SHALL 重新开始展示该 terminal session 的 agent status
