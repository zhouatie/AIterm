## MODIFIED Requirements

### Requirement: 进程安全隔离
主进程与渲染进程之间 SHALL 通过 contextBridge + preload 脚本进行安全通信，渲染进程 SHALL NOT 直接访问 Node.js API。

#### Scenario: 渲染进程隔离
- **WHEN** 渲染进程尝试访问 Node.js 模块（如 `require('fs')`）
- **THEN** 访问 SHALL 被拒绝（nodeIntegration 禁用、contextIsolation 启用）

#### Scenario: preload 暴露 API
- **WHEN** 渲染进程需要与主进程通信
- **THEN** SHALL 通过 preload 脚本在 `window` 上暴露的 API 进行，而非直接使用 ipcRenderer

#### Scenario: webview 标签启用
- **WHEN** 主窗口创建时
- **THEN** webPreferences SHALL 包含 `webviewTag: true`，以允许渲染进程使用 `<webview>` 标签嵌入网页内容
