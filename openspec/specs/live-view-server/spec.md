# Spec: live-view-server

## Purpose

提供局域网 Live View 功能的 HTTP 服务层。负责在 Main Process 中启动/停止 HTTP 服务（端口 7778），通过 Server-Sent Events（SSE）将 rrweb 事件流实时推送给已连接的手机客户端，并托管供手机浏览器访问的 Viewer HTML 页面。

## Requirements

### Requirement: 启动与停止服务
系统 SHALL 在用户开启 Live View 时启动 HTTP 服务（端口 7778），在用户关闭时停止并释放端口。HTTP 服务同时提供 Viewer HTML 页面和 SSE 事件流端点。

#### Scenario: 用户开启 Live View
- **WHEN** 用户在 UI 中点击"开启 Live View"
- **THEN** HTTP server 在端口 7778 开始监听
- **THEN** app 显示当前局域网访问地址（`http://<ip>:7778`）

#### Scenario: 用户关闭 Live View
- **WHEN** 用户在 UI 中点击"关闭 Live View"
- **THEN** 所有 SSE 连接被断开
- **THEN** HTTP server 停止监听，端口释放

#### Scenario: 端口已被占用
- **WHEN** 启动时端口 7778 已被其他进程占用
- **THEN** 系统 SHALL 向用户展示错误提示，不崩溃

---

### Requirement: 通过 SSE 广播 rrweb 事件流
系统 SHALL 通过 Server-Sent Events（SSE）将从 Renderer Process 收到的 rrweb 事件实时推送给所有已连接的客户端。

#### Scenario: 新客户端连接
- **WHEN** 手机浏览器通过 EventSource 连接到 `/events` 端点
- **THEN** 服务端 SHALL 立即发送时钟同步消息（`__clock__`）
- **THEN** 若 buffer 中的 FullSnapshot 距今 < 3 秒，SHALL 立即发送缓冲区内容
- **THEN** 若 buffer 过旧，SHALL 触发 rrweb forceCheckout，等待新 FullSnapshot 到达后再发送
- **THEN** 之后持续推送新事件

#### Scenario: 增量事件广播
- **WHEN** Renderer Process 通过 IPC 发送新的 rrweb 事件
- **THEN** 服务端 SHALL 在 100ms 内将事件广播给所有已连接客户端

#### Scenario: 无客户端时跳过广播
- **WHEN** 没有任何 SSE 客户端连接
- **THEN** 服务端 SHALL 跳过 incremental 事件的缓冲与广播，减少不必要的序列化开销
- **THEN** Meta 和 FullSnapshot 事件 SHALL 仍然缓存，供下次连接使用

#### Scenario: 客户端断开
- **WHEN** 手机浏览器关闭或网络断开
- **THEN** 服务端 SHALL 移除该连接，不影响其他连接和录制进程

#### Scenario: 保持连接存活
- **WHEN** 终端处于 idle 状态，无 DOM 变化
- **THEN** 服务端 SHALL 每 15 秒向所有客户端发送 SSE 心跳注释（`:ping`）
- **THEN** 客户端浏览器不触发 `onmessage`，但 TCP 连接保持活跃

---

### Requirement: 提供 Viewer HTML 页面
系统 SHALL 通过 HTTP 提供一个 viewer 页面，手机浏览器访问后可接收并播放 rrweb 事件流。

#### Scenario: 访问 viewer 页面
- **WHEN** 手机浏览器访问 `http://<ip>:7778`
- **THEN** 服务器 SHALL 返回包含 rrweb Replayer 的 HTML 页面（gzip 压缩）
- **THEN** 页面自动建立 SSE 连接并开始播放

#### Scenario: 低延迟播放
- **WHEN** 手机建立 SSE 连接并收到 FullSnapshot
- **THEN** viewer SHALL 使用 `startLive(Date.now() + clockOffset)` 设置播放基准
- **THEN** 后续事件 SHALL 几乎无延迟地应用到 Replayer

#### Scenario: 自适应缩放
- **WHEN** rrweb Meta 事件携带源端分辨率（`data.width` / `data.height`）
- **THEN** viewer SHALL 按 `window.innerWidth / sourceWidth` 缩放内容
- **THEN** 支持 pinch-to-zoom 手势进一步缩放
