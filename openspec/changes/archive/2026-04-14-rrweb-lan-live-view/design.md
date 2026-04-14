## Context

AIterm 是一个 Electron 终端工作台，Renderer Process 基于 React + xterm.js（v6，DOM 渲染器）。Main Process 已有 `http.Server` 用于 terminal attention 通知，IPC 模式成熟（ipcMain / ipcRenderer + contextBridge）。

本次变更在现有架构上叠加一条"实时查看"数据通路：Renderer 录制 DOM → IPC → Main Process 分发 → LAN SSE → 手机浏览器。

## Goals / Non-Goals

**Goals:**
- 手机浏览器通过扫码连接局域网，实时查看 AIterm 当前界面
- 低延迟（< 200ms 端到端）
- 不影响 app 现有性能和功能
- 默认关闭，用户主动开启

**Non-Goals:**
- 历史回放（不存储事件）
- 跨公网访问（仅局域网）
- 多人同时操作（只读查看）
- 移动端交互控制

## Decisions

### 决策 1：使用 rrweb 而非截图流

**选择**：rrweb DOM mutation 录制

**理由**：
- xterm.js v6 使用 DOM 渲染器，终端内容以真实 DOM 节点呈现，rrweb 可完整录制
- 文字在手机端清晰（DOM 重建，非 JPEG 压缩）
- 事件驱动，延迟 < 100ms；截图方案最差 1s 延迟
- 空闲时无数据产生，截图方案无论是否变化都持续传输

**备选**：截图流（`webContents.capturePage()` + JPEG）
- 优点：实现极简
- 缺点：文字清晰度差（JPEG 伪影），延迟高（轮询），终端文字场景下体验不可接受

---

### 决策 2：rrweb recorder 运行在 Renderer Process

**选择**：在 Renderer Process 中调用 `rrweb.record()`，通过 `ipcRenderer.send` 将事件传给 Main Process

**理由**：
- rrweb 必须运行在有 DOM 的环境（即 Renderer Process）
- 与现有 IPC 模式（terminal I/O、文件操作）一致
- Main Process 负责网络 I/O，职责分离清晰

**注意**：rrweb 事件为 JS 对象，IPC 传输时 Electron 会自动序列化（结构化克隆），无需手动 JSON.stringify

---

### 决策 3：Main Process 提供 SSE + HTTP 单服务

**选择**：
- Node.js 内置 `http` 模块：端口 `7778`，同时提供 viewer HTML 页面（`GET /`）和 SSE 事件流（`GET /events`）

**理由**：
- SSE（Server-Sent Events）是纯 HTTP push，无需 WebSocket upgrade 握手
- iOS Safari / 局域网环境下 WebSocket upgrade 存在可靠性问题（`onopen` 不触发），SSE 更稳定
- `EventSource` 原生支持自动重连，客户端无需手动处理断线
- 单端口单服务，减少依赖，部署和调试更简单
- 无需 `ws` 外部依赖（已移除）

**备选 A**：WebSocket（`ws` 库）+ HTTP 双端口（原始方案）
- 初版实现后发现：iOS Safari / LAN 下 WebSocket upgrade 不可靠，`ws.onopen` 始终不触发
- 放弃，改为 SSE

**备选 B**：单端口 WebSocket（HTTP + WebSocket upgrade 复用）
- 同样受上述 WebSocket 可靠性问题影响，放弃

---

### 决策 4：二维码通过 App UI 展示

**选择**：在 App 的 Settings Panel 或工具栏新增 "Live View" 入口，点击显示二维码弹窗

**理由**：
- 与现有 UI 模式（SettingsPanel、ContextMenu）一致
- 显示 IP:PORT，用户扫码即连
- 使用 `qrcode` npm 包生成 SVG，纯前端渲染，无外部依赖

---

### 决策 5：rrweb 事件节流

**选择**：Main Process 收到事件后立即 broadcast，不做额外节流

**理由**：
- 正常终端操作（非 AI agent）mutation 密度可控
- LAN 带宽充足（10MB/s+），rrweb 事件流通常 < 50KB/s
- rrweb 内部已有 rAF 批处理，无需二次节流

**风险**：高速终端输出时（如 `cat` 大文件）短时间内 mutation 密集 → 见 Risks

---

### 决策 6：手机端 viewer 页面结构

**选择**：单 HTML 文件，本地引用 `rrweb.js`，通过 SSE（EventSource）接收事件并 feed 给 Replayer

```
连接协议：EventSource('/events')，自动重连
接收流程：
  - 缓冲所有事件，直至收到第一个 FullSnapshot（type=2）
  - 必须包含前置 Meta 事件（type=4）：data.width / data.height 为源端屏幕分辨率
  - 用完整队列 [Meta, FullSnapshot, ...] 初始化 Replayer（liveMode: true）
  - Meta 事件触发 Replayer.handleResize()，iframe 变为可见并获得实际宽高

缩放逻辑：
  - 从 Meta 事件 data.width 获取源端宽度（而非查询 iframeEl.offsetWidth，
    后者在 iframe 初始化期间可能为 0 或不准确）
  - scale = window.innerWidth / data.width
  - 应用 CSS transform: scale(scale)，transform-origin: top left 到 .replayer-wrapper
  - 监听 window.resize 事件重新计算
  - viewport meta 保留 maximum-scale=5.0 支持原生 pinch-zoom

rrweb.js 来源：由 HTTP server 从本地 node_modules 提供，无需 CDN
```

## Risks / Trade-offs

**[风险 1] 高速终端输出导致 IPC/SSE 拥塞**
→ 缓解：rrweb 的 `sampling` 选项可降低 mutation 事件频率；Main Process 可加简单的 event queue + 批量 flush（每 100ms）

**[风险 2] 首次全量快照体积较大（1-5 MB）**
→ 缓解：手机端连接时发送完整 event buffer（仅包含最新一次 full-snapshot + 之后的 incremental），不发送历史全部 events；SSE 传输 JSON 文本，LAN 带宽通常足够

**[风险 3] 局域网 IP 变化（DHCP 重新分配）**
→ 缓解：每次开启 Live View 时重新获取当前 IP，二维码实时生成

**[风险 4] rrweb 无法捕获某些 Electron 特有渲染内容（如 `<webview>`）**
→ 缓解：当前 App 无 `<webview>`，风险不适用；如未来引入需评估

**[风险 5] 手机与电脑不在同一局域网**
→ 缓解：属于 Non-Goal，文档说明仅支持局域网

## Migration Plan

1. 安装新依赖（`rrweb`、`qrcode`；`ws` 已移除）
2. 实现 rrweb recorder 模块（Renderer）
3. 实现 Live View server 模块（Main）
4. 扩展 preload IPC bridge
5. 添加 UI 入口（二维码弹窗）
6. 本地联调验证（手机扫码测试）

无需数据迁移，无破坏性变更，可随时安全回滚（删除模块即可）。

## Open Questions

- ~~viewer 页面的 IP 自动发现：使用 `os.networkInterfaces()` 过滤 IPv4 非 loopback 地址，多网卡时如何选择？~~
  **已解决**：实现中通过跳过前缀名单（`lo`、`utun`、`awdl`、`docker` 等虚拟网卡）过滤，取第一个非内网虚拟 IPv4 地址。
