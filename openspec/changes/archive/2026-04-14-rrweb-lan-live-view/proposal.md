## Why

开发者在使用 AIterm 工作时，有时需要在手机上实时查看桌面 app 的界面状态（如终端输出、文件操作等），以便在离开电脑时仍能关注进展。目前没有任何机制支持远程查看 app 界面。

## What Changes

- 新增 rrweb 录制模块，在 Renderer Process 中持续录制 DOM 变化
- 新增 WebSocket 服务端（Main Process），将 rrweb 事件流实时广播给已连接的客户端
- 新增内嵌 HTTP 服务端，向局域网设备提供 rrweb-player 查看页面
- 新增二维码展示功能，在 app 界面中显示局域网访问地址
- 手机浏览器通过扫码连接后可实时查看 app 当前界面，支持 pinch-to-zoom 缩放

## Capabilities

### New Capabilities

- `live-view-server`：在 Main Process 启动 WebSocket + HTTP 服务，管理客户端连接，广播 rrweb 事件流，并提供 viewer 页面
- `rrweb-recorder`：在 Renderer Process 集成 rrweb，录制 DOM 全量快照与增量 mutation，通过 IPC 传递给 Main Process
- `live-view-qrcode`：在 app 界面中展示二维码入口，显示当前局域网 IP 和访问端口，支持开启/关闭录制

### Modified Capabilities

（无）

## Impact

- **新增依赖**：`rrweb`（录制端）、`rrweb-player`（查看端，内嵌于 viewer HTML）、`qrcode`（二维码生成）
- **Main Process**：新增 WebSocket server、HTTP server、IPC handler
- **Renderer Process**：新增 rrweb 录制逻辑，新增二维码展示 UI 组件
- **Preload**：新增 IPC bridge 暴露录制控制 API（startRecording / stopRecording / onRrwebEvent）
- **无破坏性变更**：所有现有功能不受影响，live view 功能默认关闭
