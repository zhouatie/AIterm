## 1. 主进程：webview 新窗口拦截

- [x] 1.1 在 `src/main.ts` 中添加 `app.on('web-contents-created')` 监听器，对 `webContents.getType() === 'webview'` 且 session partition 为 `persist:browser` 的 webContents 调用 `setWindowOpenHandler`
- [x] 1.2 在 `setWindowOpenHandler` 回调中返回 `{ action: 'deny' }`，并通过 `mainWindow.webContents.send('browser:open-url', { url })` 将目标 URL 转发给渲染进程
- [x] 1.3 添加安全检查：发送 IPC 前确认 `mainWindow` 存在且未被销毁

## 2. Preload 脚本：暴露 browserApi

- [x] 2.1 在 `src/preload.ts` 中定义 `BrowserApi` 接口，包含 `onOpenUrl(callback: (data: { url: string }) => void): () => void` 方法
- [x] 2.2 通过 `contextBridge.exposeInMainWorld('browserApi', { ... })` 暴露 `browserApi` 对象，监听 `browser:open-url` IPC 通道并调用回调
- [x] 2.3 在 `src/global.d.ts` 中扩展 Window 接口，添加 `browserApi: BrowserApi` 声明

## 3. 渲染进程：BrowserPanel 适配

- [x] 3.1 在 `src/components/BrowserPanel.tsx` 中添加 `useEffect`，通过 `window.browserApi.onOpenUrl` 监听主进程推送的 URL，调用 `addTab(url)` 打开新 Tab
- [x] 3.2 移除 `bindWebviewEvents` 中对废弃 `new-window` 事件的监听代码（`addEventListener` 和 `removeEventListener`）
- [x] 3.3 移除 webview 标签上的 `allowpopups` 属性

## 4. 验证

- [x] 4.1 在内置浏览器中打开任意网页，点击 `target="_blank"` 链接，确认在面板内新 Tab 打开而非新 Electron 窗口
- [x] 4.2 确认 TypeScript 编译无错误（`npm run build` 或类似命令）
