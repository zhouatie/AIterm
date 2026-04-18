## MODIFIED Requirements

### Requirement: Agent 通知入口
系统 SHALL 提供一个仅本机可访问的通知入口，用于接收 Codex、Claude Code、OpenCode 推送的 terminal agent status 事件。

#### Scenario: 接收合法 agent 状态
- **WHEN** agent hook 或 plugin 向通知入口发送包含有效 token、terminal session id、agent、state、event 和 message 的请求
- **THEN** 系统 SHALL 接收该状态并将其关联到对应 terminal session
- **THEN** 系统 SHALL 将该 session 的 agent 状态更新为 payload 中的 state

#### Scenario: 拒绝非法 token
- **WHEN** 通知入口收到缺失 token 或 token 不匹配的请求
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

#### Scenario: 拒绝未知 terminal session
- **WHEN** 通知入口收到的 terminal session id 不属于当前活跃或已存在的 PTY 会话
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

#### Scenario: 拒绝未知 agent 状态
- **WHEN** 通知入口收到的 state 不是 `running`、`completed`、`needs_user`、`error` 或 `idle`
- **THEN** 系统 SHALL 拒绝该请求
- **THEN** 系统 SHALL NOT 发送系统通知或更新 terminal tab 状态

### Requirement: Codex hook 推送
系统 SHALL 提供 Codex hook 可调用的轻量脚本，将 Codex hook 输入转换为 GUI terminal agent status 事件。

#### Scenario: UserPromptSubmit hook 推送执行中状态
- **WHEN** Codex 触发 `UserPromptSubmit` hook 且通知环境变量存在
- **THEN** hook 脚本 SHALL 向 GUI 通知入口发送 agent 为 `codex`、event 为 `UserPromptSubmit`、state 为 `running` 的状态事件

#### Scenario: Stop hook 推送完成状态
- **WHEN** Codex 触发 `Stop` hook 且通知环境变量存在
- **THEN** hook 脚本 SHALL 向 GUI 通知入口发送 agent 为 `codex`、event 为 `Stop`、state 为 `completed` 的状态事件
- **THEN** 系统 SHALL 将该状态解释为 Codex 当前回合已完成

#### Scenario: 通知环境不存在时静默退出
- **WHEN** Codex hook 脚本运行但缺少 GUI 通知入口或 terminal session 环境变量
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

#### Scenario: 通知发送失败时不影响 Codex
- **WHEN** hook 脚本无法连接 GUI 通知入口或请求失败
- **THEN** hook 脚本 SHALL 正常退出
- **THEN** hook 脚本 SHALL NOT 阻塞 Codex 正常流程

### Requirement: Claude Code hook 推送
系统 SHALL 提供 Claude Code hook 可调用的轻量脚本或配置，将 Claude Code lifecycle 和 notification 事件转换为 GUI terminal agent status 事件。

#### Scenario: UserPromptSubmit 推送执行中状态
- **WHEN** Claude Code 触发 `UserPromptSubmit` hook 且通知环境变量存在
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `UserPromptSubmit`、state 为 `running` 的状态事件

#### Scenario: permission prompt 推送待用户状态
- **WHEN** Claude Code 触发权限确认 hook
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:permission_prompt` 或 `PermissionRequest`、state 为 `needs_user` 的状态事件

#### Scenario: idle prompt 推送待用户状态
- **WHEN** Claude Code 触发 `Notification` hook 且 `notification_type` 为 `idle_prompt`
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Notification:idle_prompt`、state 为 `needs_user` 的状态事件

#### Scenario: Stop 推送完成状态
- **WHEN** Claude Code 触发 `Stop` hook 且通知环境变量存在
- **THEN** hook SHALL 向 GUI 通知入口发送 agent 为 `claude-code`、event 为 `Stop`、state 为 `completed` 的状态事件

#### Scenario: Claude Code 通知失败时不影响 agent
- **WHEN** Claude Code hook 无法连接 GUI 通知入口或请求失败
- **THEN** hook SHALL 正常退出
- **THEN** hook SHALL NOT 阻塞 Claude Code 正常流程

### Requirement: OpenCode plugin 推送
系统 SHALL 提供 OpenCode plugin 或配置，将 OpenCode session、permission 和 error 事件转换为 GUI terminal agent status 事件。

#### Scenario: session status 推送执行中状态
- **WHEN** OpenCode plugin 收到表示会话正在执行的 `session.status` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.status`、state 为 `running` 的状态事件

#### Scenario: permission asked 推送待用户状态
- **WHEN** OpenCode plugin 收到 `permission.asked` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `permission.asked`、state 为 `needs_user` 的状态事件

#### Scenario: session idle 推送完成状态
- **WHEN** OpenCode plugin 收到 `session.idle` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.idle`、state 为 `completed` 的状态事件

#### Scenario: session error 推送异常状态
- **WHEN** OpenCode plugin 收到 `session.error` 事件
- **THEN** plugin SHALL 向 GUI 通知入口发送 agent 为 `opencode`、event 为 `session.error`、state 为 `error` 的状态事件

#### Scenario: OpenCode 通知失败时不影响 agent
- **WHEN** OpenCode plugin 无法连接 GUI 通知入口或请求失败
- **THEN** plugin SHALL 正常结束当前事件处理
- **THEN** plugin SHALL NOT 阻塞 OpenCode 正常流程

### Requirement: GUI attention 通知分发
系统 SHALL 在接收到合法 terminal agent status 事件后更新渲染进程状态，并在需要用户回看终端的状态触发系统通知；系统 SHALL 支持用户通过点击系统通知直接激活对应的 terminal session。

#### Scenario: 需要用户回看状态发送系统通知
- **WHEN** 主进程接收到合法 terminal agent status 事件且 state 为 `needs_user`、`completed` 或 `error`
- **THEN** 系统 SHALL 发送 Electron 原生系统通知
- **THEN** 通知内容 SHALL 能表达对应 agent 的当前状态和需要用户回到 GUI 终端查看

#### Scenario: 执行中和空闲状态不发送系统通知
- **WHEN** 主进程接收到合法 terminal agent status 事件且 state 为 `running` 或 `idle`
- **THEN** 系统 SHALL NOT 发送 Electron 原生系统通知
- **THEN** 系统 SHALL 仍向渲染进程推送该状态事件

#### Scenario: 推送渲染进程事件
- **WHEN** 主进程接收到合法 terminal agent status 事件
- **THEN** 系统 SHALL 通过 preload 暴露的 terminal API 向渲染进程推送该事件

#### Scenario: 系统通知失败时保留 UI 状态
- **WHEN** 主进程接收到 `needs_user`、`completed` 或 `error` 状态但系统通知无法展示
- **THEN** 系统 SHALL 仍向渲染进程推送该状态事件

#### Scenario: 点击系统通知唤起应用窗口
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 将应用主窗口恢复至可见状态（若已最小化则先还原）
- **THEN** 系统 SHALL 将应用主窗口置于前台并获得焦点

#### Scenario: 点击系统通知激活对应 terminal session
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 切换到触发该通知的 terminal session tab
- **THEN** 该 terminal session 的 `needs_user`、`completed` 或 `error` 通知态 SHALL 被清除
- **THEN** 其他 terminal session 的 agent 状态 SHALL 保持不变

#### Scenario: 点击系统通知时展开 terminal 侧边栏
- **WHEN** 用户点击系统通知，且 terminal 侧边栏处于收起状态
- **THEN** terminal 侧边栏 SHALL 自动展开

#### Scenario: 点击系统通知时 terminal session 已不存在
- **WHEN** 用户点击系统通知，但对应 terminal session 已关闭或不再存在
- **THEN** 系统 SHALL 静默忽略该激活指令
- **THEN** 系统 SHALL NOT 产生报错或异常状态

### Requirement: terminal tab attention 状态
terminal 面板 SHALL 在对应二级 terminal tab 上展示 agent status，并按照状态类型在用户回到该上下文、输入内容、状态更新或 session 结束后清除。

#### Scenario: 非活跃 tab 收到待用户状态
- **WHEN** 非当前活跃 terminal session 收到 `needs_user` 状态事件
- **THEN** 对应二级 terminal tab SHALL 显示待用户处理的状态标记

#### Scenario: 活跃 tab 收到待用户状态
- **WHEN** 当前活跃 terminal session 收到 `needs_user` 状态事件
- **THEN** 系统 SHALL 记录该 session 的 agent 状态
- **THEN** 对应二级 terminal tab SHALL 显示待用户处理的状态标记

#### Scenario: 选择 tab 后清除待用户状态
- **WHEN** 用户选择带有 `needs_user` 状态的二级 terminal tab
- **THEN** 系统 SHALL 清除该 terminal session 的 `needs_user` 状态

#### Scenario: 用户输入后清除待用户状态
- **WHEN** 用户向带有 `needs_user` 状态的 terminal session 输入内容
- **THEN** 系统 SHALL 清除该 terminal session 的 `needs_user` 状态

#### Scenario: 完成状态更新待用户状态
- **WHEN** 带有 `needs_user` 状态的 terminal session 收到 `completed`、`running`、`error` 或 `idle` 状态
- **THEN** 系统 SHALL 用新的 agent 状态替换该 session 的 `needs_user` 状态

#### Scenario: session 关闭后清除状态
- **WHEN** 带有 agent 状态的 terminal session 被关闭或退出
- **THEN** 系统 SHALL 清除该 terminal session 的 agent 状态

## ADDED Requirements

### Requirement: Agent 状态数据模型
系统 SHALL 使用统一的 agent status 数据模型表达 terminal session 中 Codex、Claude Code、OpenCode 的生命周期状态。

#### Scenario: 状态包含最小展示信息
- **WHEN** 系统创建或分发 agent status
- **THEN** 状态对象 SHALL 包含 terminal session id、agent、state、event、message 和 timestamp
- **THEN** agent SHALL 为 `codex`、`claude-code` 或 `opencode`
- **THEN** state SHALL 为 `running`、`completed`、`needs_user`、`error` 或 `idle`

#### Scenario: idle 状态清除展示状态
- **WHEN** terminal session 收到 state 为 `idle` 的合法状态事件
- **THEN** 系统 SHALL 清除该 session 的 agent status UI 标识

### Requirement: Agent 状态清除策略
系统 SHALL 根据 agent status 类型使用不同清除策略。

#### Scenario: 活跃 tab 收到完成状态后自动淡出
- **WHEN** 当前活跃 terminal session 收到 `completed` 状态
- **THEN** 对应二级 terminal tab SHALL 短暂展示完成状态
- **THEN** 系统 SHALL 在 2 到 3 秒后自动清除该完成状态

#### Scenario: 非活跃 tab 收到完成状态后保留
- **WHEN** 非当前活跃 terminal session 收到 `completed` 状态
- **THEN** 对应二级 terminal tab SHALL 保留完成状态标记
- **THEN** 该完成状态 SHALL 在用户选择该 tab 后清除

#### Scenario: 执行中状态被后续状态替换
- **WHEN** terminal session 处于 `running` 状态
- **THEN** 系统 SHALL 在收到 `completed`、`needs_user`、`error` 或 `idle` 状态后替换或清除执行中状态

#### Scenario: 异常状态选择后清除
- **WHEN** 用户选择带有 `error` 状态的二级 terminal tab
- **THEN** 系统 SHALL 清除该 terminal session 的 `error` UI 标识

#### Scenario: 手动中断后清除执行状态
- **WHEN** 用户向处于 agent status 的 terminal session 发送 Ctrl+C、Ctrl+D 或单独 Esc
- **THEN** 系统 SHALL 立即清除该 terminal session 的 agent status UI 标识
- **THEN** 系统 SHALL 在短时间内忽略同一 session 随后补发的完成、待用户或异常状态
- **THEN** 后续新的 `running` 状态 SHALL 重新开始记录该 session 的 agent status
