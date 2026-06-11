## MODIFIED Requirements

### Requirement: 进程安全隔离
主进程与渲染进程之间 SHALL 通过 contextBridge + preload 脚本进行安全通信，渲染进程 SHALL NOT 直接访问 Node.js API。主窗口 SHALL NOT 启用已移除浏览器功能所需的 `<webview>` 标签支持。

#### Scenario: 渲染进程隔离
- **WHEN** 渲染进程尝试访问 Node.js 模块（如 `require('fs')`）
- **THEN** 访问 SHALL 被拒绝（nodeIntegration 禁用、contextIsolation 启用）

#### Scenario: preload 暴露 API
- **WHEN** 渲染进程需要与主进程通信
- **THEN** SHALL 通过 preload 脚本在 `window` 上暴露的 API 进行，而非直接使用 ipcRenderer

#### Scenario: webview 标签不启用
- **WHEN** 主窗口创建时
- **THEN** webPreferences SHALL NOT 启用 `webviewTag`

## REMOVED Requirements

### Requirement: webview 新窗口请求拦截
**Reason**: 内嵌浏览器 webview 被移除，主进程不再需要拦截浏览器面板的新窗口请求。
**Migration**: 外部浏览器自行处理新窗口请求。

### Requirement: 浏览器 URL 打开 preload API
**Reason**: 内嵌浏览器被移除，preload 不再暴露 `browserApi`。
**Migration**: 渲染进程不再接收 `browser:open-url` 消息。
