## MODIFIED Requirements

### Requirement: 弹窗处理
webview 中的弹窗请求 SHALL 通过主进程 `setWindowOpenHandler` 拦截，并在浏览器面板中以新 Tab 打开。

#### Scenario: 链接新窗口请求
- **WHEN** webview 中的页面请求打开新窗口（如 `target="_blank"` 或 `window.open`）
- **THEN** 主进程 SHALL 通过 `setWindowOpenHandler` 拦截该请求并返回 `{ action: 'deny' }`
- **THEN** 主进程 SHALL 通过 `browser:open-url` IPC 通道将目标 URL 发送给渲染进程
- **THEN** 浏览器面板 SHALL 在面板内创建新 Tab 加载该 URL，而非打开新的 Electron 窗口

#### Scenario: 渲染进程不使用废弃 API
- **WHEN** webview 元素创建并绑定事件时
- **THEN** SHALL NOT 监听已废弃的 `new-window` 事件
- **THEN** SHALL NOT 在 webview 标签上设置 `allowpopups` 属性

#### Scenario: IPC 消息接收与新 Tab 创建
- **WHEN** 渲染进程收到 `browser:open-url` IPC 消息
- **THEN** 浏览器面板 SHALL 调用 `addTab(url)` 在面板内打开该 URL
- **THEN** 如果浏览器面板当前未显示，面板 SHALL 自动打开
