## ADDED Requirements

### Requirement: webview 新窗口请求拦截
主进程 SHALL 拦截所有浏览器面板 webview 的新窗口请求，并通过 IPC 转发给渲染进程处理。

#### Scenario: 拦截 webview guest 的新窗口请求
- **WHEN** 类型为 `webview` 的 webContents 被创建且其 session partition 为 `persist:browser`
- **THEN** 主进程 SHALL 对该 webContents 调用 `setWindowOpenHandler`
- **THEN** handler SHALL 返回 `{ action: 'deny' }` 阻止新窗口创建

#### Scenario: 通过 IPC 转发拦截的 URL
- **WHEN** `setWindowOpenHandler` 拦截到新窗口请求
- **THEN** 主进程 SHALL 通过 `mainWindow.webContents.send('browser:open-url', { url })` 将目标 URL 发送给渲染进程

#### Scenario: 主窗口销毁时安全处理
- **WHEN** `setWindowOpenHandler` 触发时主窗口已销毁或不存在
- **THEN** 主进程 SHALL 不发送 IPC 消息且不抛出异常

### Requirement: 浏览器 URL 打开 preload API
preload 脚本 SHALL 通过 contextBridge 暴露 `browserApi` 对象，提供 `browser:open-url` 消息的监听方法。

#### Scenario: 暴露 browserApi
- **WHEN** 渲染进程加载完成
- **THEN** `window.browserApi` SHALL 可用，包含 `onOpenUrl(callback)` 方法
- **THEN** `onOpenUrl` SHALL 返回取消订阅函数

#### Scenario: 接收打开 URL 消息
- **WHEN** 主进程发送 `browser:open-url` 消息
- **THEN** 已注册的 `onOpenUrl` 回调 SHALL 被调用，参数为 `{ url: string }`
