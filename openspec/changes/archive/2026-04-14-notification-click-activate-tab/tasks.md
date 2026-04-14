## 1. 主进程：Notification 点击处理（main.ts）

- [x] 1.1 将 `sendTerminalAttention` 中的 `new Notification({...}).show()` 改为先创建实例、绑定 `click` 事件再调用 `.show()`
- [x] 1.2 在 `click` 回调中，若 `mainWindow` 存在且未销毁，调用 `mainWindow.restore()`（最小化时）、`mainWindow.show()`、`mainWindow.focus()`
- [x] 1.3 在 `click` 回调中，通过 `mainWindow.webContents.send('terminal:activateSession', { id: attention.id })` 向渲染进程发送激活指令

## 2. IPC 桥接层：暴露新事件（preload.ts）

- [x] 2.1 在 `TerminalApi` 接口中新增 `onActivateSession(callback: (data: { id: string }) => void): () => void`
- [x] 2.2 在 `contextBridge.exposeInMainWorld('terminalApi', {...})` 中实现 `onActivateSession`，监听 `terminal:activateSession` 并返回取消订阅函数

## 3. 渲染进程：响应激活指令（TerminalPanel.tsx）

- [x] 3.1 新增 `useEffect`，调用 `window.terminalApi.onActivateSession` 订阅激活事件
- [x] 3.2 收到事件后调用 `handleSelectSession(id)` 切换 terminal session tab
- [x] 3.3 收到事件后调用 `setSidebarCollapsed(false)` 展开侧边栏
- [x] 3.4 确认当 `id` 对应的 session 不存在时，`handleSelectSession` 不产生副作用（静默忽略）
