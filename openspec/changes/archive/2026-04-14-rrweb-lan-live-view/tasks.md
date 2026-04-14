## 1. 安装依赖

- [x] 1.1 安装 `rrweb` 和 `rrweb-player` 到 dependencies
- [x] 1.2 安装 `ws` 到 dependencies（初版 WebSocket 方案；后改为 SSE，`ws` 已卸载）
- [x] 1.3 安装 `qrcode` 到 dependencies
- [x] 1.4 安装 `@types/qrcode` 到 devDependencies（`@types/ws` 随 `ws` 一并移除）

## 2. IPC Bridge（Preload）

- [x] 2.1 在 `preload.ts` 中新增 `LiveViewApi` 接口类型定义
- [x] 2.2 实现 `liveViewApi.start()`：通过 IPC 通知 Main Process 启动服务，返回 `{ url: string }` 或 `{ error: string }`
- [x] 2.3 实现 `liveViewApi.stop()`：通过 IPC 通知 Main Process 停止服务
- [x] 2.4 实现 `liveViewApi.sendEvent(event)`：通过 `ipcRenderer.send('rrweb:event', event)` 将 rrweb 事件发送给 Main Process
- [x] 2.5 通过 `contextBridge.exposeInMainWorld('liveViewApi', ...)` 暴露 API

## 3. Main Process：Live View Server

- [x] 3.1 新建 `src/live-view-server.ts` 模块
- [x] 3.2 实现 `startLiveViewServer()`：启动 HTTP server（端口 7778），提供 viewer HTML 和 SSE `/events` 端点，处理端口占用错误
- [x] 3.3 实现 `stopLiveViewServer()`：关闭所有 SSE 连接（`res.end()`），停止 HTTP server
- [x] 3.4 实现 event buffer：保存最新一次 full-snapshot 及之后的 incremental events
- [x] 3.5 实现新客户端连接时的追帧逻辑：向新连接的客户端发送 buffer 中的历史事件
- [x] 3.6 实现 `broadcastEvent(event)`：将事件广播给所有已连接客户端
- [x] 3.7 实现 `getLocalIpAddress()`：通过 `os.networkInterfaces()` 获取局域网 IPv4 地址
- [x] 3.8 编写 viewer HTML 内容（字符串模板）：包含 rrweb.js 本地引用（`/rrweb.js`）、SSE（EventSource）连接逻辑、Meta 事件缓冲 + scalePlayer 缩放、pinch-to-zoom 支持

## 4. Main Process：IPC Handler 注册

- [x] 4.1 在 `main.ts` 中注册 `ipcMain.handle('live-view:start', ...)` 调用 `startLiveViewServer()`
- [x] 4.2 在 `main.ts` 中注册 `ipcMain.on('live-view:stop', ...)` 调用 `stopLiveViewServer()`
- [x] 4.3 在 `main.ts` 中注册 `ipcMain.on('rrweb:event', ...)` 调用 `broadcastEvent()`

## 5. Renderer Process：rrweb 录制模块

- [x] 5.1 新建 `src/live-view-recorder.ts` 模块，封装 rrweb 录制逻辑
- [x] 5.2 实现 `startRecording()`：调用 `rrweb.record()`，在 emit 回调中调用 `liveViewApi.sendEvent(event)`
- [x] 5.3 实现 `stopRecording()`：调用 rrweb 返回的 stop 函数
- [x] 5.4 在 `App.tsx` 中集成录制模块，响应 Live View 开关状态

## 6. UI：二维码入口组件

- [x] 6.1 新建 `src/components/LiveViewPanel.tsx` 组件
- [x] 6.2 实现开关按钮：点击调用 `liveViewApi.start()` / `liveViewApi.stop()`
- [x] 6.3 实现二维码显示：使用 `qrcode` 生成 SVG，展示访问 URL
- [x] 6.4 实现错误状态显示（端口占用等）
- [x] 6.5 将 `LiveViewPanel` 集成到 `SettingsPanel` 或工具栏中

## 7. 联调验证

- [x] 7.1 本机浏览器访问 `http://localhost:7778` 验证 viewer 页面加载
- [x] 7.2 手机扫码连接，验证 rrweb 实时播放（DOM 变化同步）
- [x] 7.3 验证关闭 Live View 后服务停止，端口释放
- [x] 7.4 验证多次开关 Live View 无端口泄露
- [x] 7.5 验证手机端缩放效果（完成 8.1 修复后执行）

## 8. 缩放修复

- [x] 8.1 修复 viewer HTML `scalePlayer` 函数：从 Meta 事件（type=4）`data.width`/`data.height` 获取源端分辨率，计算 CSS `transform: scale()`，取代依赖 `iframeEl.offsetWidth` 的不稳定查询