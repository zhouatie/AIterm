## Context

当前 `sendTerminalAttention`（`main.ts`）在发送系统通知时直接调用 `new Notification({...}).show()`，未绑定任何 `click` 事件。点击通知后操作系统会关闭弹窗，但应用窗口不会被唤起，终端 tab 也不会自动切换。

涉及模块：
- `main.ts`（Electron 主进程）：负责创建和展示系统通知
- `preload.ts`：contextBridge 层，负责向渲染进程暴露 IPC 事件
- `TerminalPanel.tsx`（渲染进程）：负责 terminal session 的状态管理与侧边栏展示

## Goals / Non-Goals

**Goals:**
- 点击系统通知时，将应用窗口拉回前台（最小化则先还原）
- 点击后自动切换到触发该通知的 terminal session tab
- 若侧边栏处于收起状态，自动展开
- 只清除被激活 session 的 attention 状态，其他 session 的 attention 状态保持不变

**Non-Goals:**
- 不修改通知的展示样式或内容
- 不处理通知被关闭（dismiss）时的行为
- 不支持多个通知同时点击的去重逻辑

## Decisions

### 决策 1：通过 IPC 消息传递激活指令

**选择**：主进程在 `Notification` 的 `click` 回调中，通过 `mainWindow.webContents.send('terminal:activateSession', { id })` 向渲染进程发送激活指令。

**备选方案**：复用现有的 `terminal:attention` 事件并在渲染进程做二次处理。

**原因**：`activateSession` 语义独立，是用户主动触发的导航行为，而 `attention` 是系统推送的状态变化事件，混用会造成事件语义模糊，且难以在未来区分两种触发源。

---

### 决策 2：在主进程 focus 窗口，不依赖 OS 默认行为

**选择**：在 `click` 回调中显式调用 `mainWindow.restore()`（若最小化）+ `mainWindow.show()` + `mainWindow.focus()`。

**原因**：macOS 点击通知会自动将 app 拉回前台，但 Windows 不保证此行为。显式调用确保跨平台一致性，无额外副作用。

---

### 决策 3：侧边栏展开逻辑放在渲染进程

**选择**：`TerminalPanel` 收到 `onActivateSession` 事件后，除调用 `handleSelectSession` 外，同时调用 `setSidebarCollapsed(false)`。

**原因**：`sidebarCollapsed` 状态由渲染进程的 `TerminalPanel` 独立持有，主进程无从感知，也不应承担 UI 状态管理职责。在渲染进程处理符合现有状态管理模式。

---

### 决策 4：preload 新增 onActivateSession

**选择**：在 `TerminalApi` 接口中新增 `onActivateSession(callback)` 方法，监听 `terminal:activateSession` IPC 事件。

**原因**：与现有 `onAttention`、`onAttentionCleared` 模式完全一致，保持 API 风格统一。

## Risks / Trade-offs

- **[风险] PTY session 已销毁但通知仍可点击** → 渲染进程收到 `activateSession` 时，若 session id 不存在于当前 workspaces，`handleSelectSession` 不会找到目标，无副作用，静默忽略即可。
- **[风险] 多个通知堆积，快速连续点击** → 每次点击独立触发一次 IPC，渲染进程串行处理，最终停留在最后一次点击的 session，行为符合预期。
