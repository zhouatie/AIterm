## Why

用户收到系统通知后，点击通知只能关闭弹窗，无法自动跳转到对应的 terminal tab。需要用户手动找到发出通知的 terminal session，交互路径冗长。

## What Changes

- 点击系统通知后，应用窗口自动拉回前台（若最小化则先还原）
- 点击系统通知后，自动切换到触发通知的 terminal session tab
- 若 terminal 侧边栏处于收起状态，自动展开侧边栏
- 其他 terminal session 的 attention 状态保持不变（只清除被激活 session 的 attention）

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `agent-attention-notifications`：扩展「GUI attention 通知分发」需求，要求系统通知支持点击交互——点击后激活对应 terminal session 并展开侧边栏

## Impact

- `src/main.ts`：在创建 `Notification` 时绑定 `click` 事件，点击后 focus 主窗口并向渲染进程发送 `terminal:activateSession` IPC 消息
- `src/preload.ts`：在 `TerminalApi` 中新增 `onActivateSession` 方法，通过 contextBridge 暴露给渲染进程
- `src/components/TerminalPanel.tsx`：监听 `onActivateSession` 事件，调用 `handleSelectSession` 切换 tab，并展开 terminal 侧边栏
