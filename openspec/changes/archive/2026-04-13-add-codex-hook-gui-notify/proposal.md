## Why

当前 GUI 终端可以运行 Codex、Claude Code 和 OpenCode，但这些 agent 进入需要用户处理的节点时，用户只能靠主动查看终端发现状态。需要一个轻量通知通道，让各 agent 的 hook / plugin 事件能把“需要处理”的状态推送到 GUI 客户端并提醒用户。

## What Changes

- 新增 Codex、Claude Code、OpenCode 到 GUI 客户端的通知能力，agent hook / plugin 触发后可把事件发送到当前 GUI 终端会话。
- Electron 主进程接收 agent 通知后，向系统发送原生通知，并通过 IPC 通知渲染进程。
- terminal tab 在收到对应会话的通知事件后显示需要处理的状态标记。
- 创建 PTY 会话时注入最小必要环境变量，使 agent hook / plugin 能定位 GUI 通知入口与当前终端会话。
- 不引入复杂 stdout 正则识别，不实现 Codex App Server 或完整 agent protocol 客户端。

## Capabilities

### New Capabilities
- `agent-attention-notifications`: 描述 Codex、Claude Code、OpenCode 的 hook / plugin 事件如何推送到 GUI 客户端、触发系统通知，并在对应 terminal tab 上展示需要处理状态。

### Modified Capabilities

## Impact

- 影响 Electron 主进程通知接收、系统通知和 IPC 分发逻辑。
- 影响 PTY 会话创建时的环境变量注入。
- 影响 preload 暴露的 terminal API 类型与事件监听接口。
- 影响 terminal tab 状态展示与用户切回/输入后的状态清除。
- 可能新增本地 hook 通知脚本、Claude Code hook 配置示例、OpenCode plugin 文件或配置示例，用于三个 agent 调用同一个 GUI 通知入口。
