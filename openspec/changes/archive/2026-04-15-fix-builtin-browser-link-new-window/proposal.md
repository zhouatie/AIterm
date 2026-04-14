## Why

内置浏览器面板中点击链接（`target="_blank"` 或 `window.open`）时，链接会在新的 Electron 窗口中打开，而不是在浏览器面板内以新 Tab 打开。根本原因是当前使用的 `<webview>` 的 `new-window` 事件已被 Electron 废弃，在新版本中不再可靠触发；同时主进程也缺少对 webview guest webContents 的新窗口拦截处理。

## What Changes

- 在主进程中监听 `web-contents-created` 事件，对所有 webview 类型的 guest webContents 注册 `setWindowOpenHandler`，拦截新窗口请求并转发给渲染进程
- 新增 IPC 通道 `browser:open-url`，由主进程发送、渲染进程监听，用于将被拦截的 URL 传递给 BrowserPanel 以新 Tab 打开
- 在 BrowserPanel 中注册 IPC 监听，接收主进程传来的 URL 并调用 `addTab()` 在面板内打开
- 移除渲染进程中已废弃的 `new-window` 事件监听器
- 移除 webview 标签上的 `allowpopups` 属性（新窗口请求改由主进程统一拦截处理）

## Capabilities

### New Capabilities

（无新增能力，此变更修复现有能力的实现缺陷）

### Modified Capabilities

- `browser-panel`: 弹窗处理的实现方式从渲染进程废弃 API 迁移到主进程 `setWindowOpenHandler`，确保新窗口请求可靠地在面板内新 Tab 打开
- `electron-shell`: 新增 webview guest webContents 的新窗口拦截逻辑和 IPC 通道

## Impact

- **主进程代码** (`src/main.ts`): 新增 `web-contents-created` 事件监听和 `browser:open-url` IPC 发送逻辑
- **预加载脚本** (`src/preload.ts`): 新增 `browser:open-url` 的 IPC 接收 API 暴露
- **浏览器面板组件** (`src/components/BrowserPanel.tsx`): 移除废弃的 `new-window` 事件监听，新增 IPC 消息接收处理；移除 `allowpopups` 属性
- **类型声明** (`src/global.d.ts`): 扩展 Window 接口声明新增的 browserApi
