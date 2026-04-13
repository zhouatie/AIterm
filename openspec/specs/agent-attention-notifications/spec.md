# agent-attention-notifications Specification

## Purpose
TBD - created by archiving change add-codex-hook-gui-notify. Update Purpose after archive.
## Requirements
### Requirement: Agent 通知入口
系统 SHALL 提供一个仅本机可访问的通知入口，用于接收 Codex、Claude Code、OpenCode 推送的 terminal attention 事件。

#### Scenario: 接收合法 agent 通知
- **WHEN** agent hook 或 plugin 向通知入口发送包含有效 token、terminal session id、agent、event 和 message 的请求
- **THEN** 系统 SHALL 接收该事件并将其关联到对应 terminal session

#### Scenario: 拒绝非法 token
- **WHEN** 通知入口收到缺失 token 或 token 不匹配的请求
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

#### Scenario: 拒绝未知 terminal session
- **WHEN** 通知入口收到的 terminal session id 不属于当前活跃或已存在的 PTY 会话
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
系统 SHALL 提供 Codex hook 可调用的轻量脚本，将 Codex hook 输入转换为 GUI terminal attention 事件。

#### Scenario: Stop hook 推送通知
- **WHEN** Codex 触发 `Stop` hook 且通知环境变量存在
- **THEN** hook 脚本 SHALL 向 GUI 通知入口发送 agent 为 `codex`、event 为 `Stop` 的 attention 事件

#### Scenario: 通知环境不存在时静默退出
- **WHEN** Codex hook 脚本运行但缺少 GUI 通知入口或 terminal session 环境变量
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

#### Scenario: 通知发送失败时不影响 Codex
- **WHEN** hook 脚本无法连接 GUI 通知入口或请求失败
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

### Requirement: Claude Code hook 推送
系统 SHALL 提供 Claude Code hook 可调用的轻量脚本或配置，将 Claude Code notification 事件转换为 GUI terminal attention 事件。

#### Scenario: permission prompt 推送通知
- **WHEN** Claude Code 触发 `Notification` hook 且 `notification_type` 为 `permission_prompt`
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:permission_prompt` 的 attention 事件

#### Scenario: idle prompt 推送通知
- **WHEN** Claude Code 触发 `Notification` hook 且 `notification_type` 为 `idle_prompt`
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:idle_prompt` 的 attention 事件

#### Scenario: Claude Code 通知失败时不影响 agent
- **WHEN** Claude Code hook 无法连接 GUI 通知入口或请求失败
- **THEN** hook SHALL 正常退出
- **THEN** hook SHALL NOT 阻塞 Claude Code 正常流程

### Requirement: OpenCode plugin 推送
系统 SHALL 提供 OpenCode plugin 或配置，将 OpenCode permission 和 idle 事件转换为 GUI terminal attention 事件。

#### Scenario: permission asked 推送通知
- **WHEN** OpenCode plugin 收到 `permission.asked` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `permission.asked` 的 attention 事件

#### Scenario: session idle 推送通知
- **WHEN** OpenCode plugin 收到 `session.idle` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.idle` 的 attention 事件

#### Scenario: OpenCode 通知失败时不影响 agent
- **WHEN** OpenCode plugin 无法连接 GUI 通知入口或请求失败
- **THEN** plugin SHALL 正常结束当前事件处理
- **THEN** plugin SHALL NOT 阻塞 OpenCode 正常流程

### Requirement: GUI attention 通知分发
系统 SHALL 在接收到合法 terminal attention 事件后同时触发系统通知和渲染进程状态更新。

#### Scenario: 发送系统通知
- **WHEN** 主进程接收到合法 terminal attention 事件
- **THEN** 系统 SHALL 发送 Electron 原生系统通知
- **THEN** 通知内容 SHALL 能表达对应 agent 需要用户回到 GUI 终端处理

#### Scenario: 推送渲染进程事件
- **WHEN** 主进程接收到合法 terminal attention 事件
- **THEN** 系统 SHALL 通过 preload 暴露的 terminal API 向渲染进程推送该事件

#### Scenario: 系统通知失败时保留 UI 状态
- **WHEN** 主进程接收到合法 terminal attention 事件但系统通知无法展示
- **THEN** 系统 SHALL 仍向渲染进程推送该事件

### Requirement: terminal tab attention 状态
terminal 面板 SHALL 在对应二级 terminal tab 上展示 agent 需要处理的状态，并在用户回到该上下文后清除。

#### Scenario: 非活跃 tab 收到 attention
- **WHEN** 非当前活跃 terminal session 收到 attention 事件
- **THEN** 对应二级 terminal tab SHALL 显示需要处理的状态标记

#### Scenario: 活跃 tab 收到 attention
- **WHEN** 当前活跃 terminal session 收到 attention 事件
- **THEN** 系统 SHALL 记录该 session 的 attention 状态
- **THEN** 对应二级 terminal tab SHALL 显示需要处理的状态标记

#### Scenario: 选择 tab 后清除状态
- **WHEN** 用户选择带有 attention 状态的二级 terminal tab
- **THEN** 系统 SHALL 清除该 terminal session 的 attention 状态

#### Scenario: 用户输入后清除状态
- **WHEN** 用户向带有 attention 状态的 terminal session 输入内容
- **THEN** 系统 SHALL 清除该 terminal session 的 attention 状态

#### Scenario: session 关闭后清除状态
- **WHEN** 带有 attention 状态的 terminal session 被关闭或退出
- **THEN** 系统 SHALL 清除该 terminal session 的 attention 状态

