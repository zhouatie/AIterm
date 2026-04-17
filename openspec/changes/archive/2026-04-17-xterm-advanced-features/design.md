## Context

AIterm 是基于 Electron + React + xterm.js 6.0.0 的桌面终端模拟器。当前 xterm.js 仅加载了 WebglAddon（GPU 渲染）和 WebLinksAddon（URL 链接检测）两个插件，大量高阶能力未被利用。

终端核心组件 `TerminalInstance.tsx` 负责 xterm.js 实例的创建、addon 加载、PTY I/O 绑定和尺寸适配。所有 addon 在 `useEffect` 初始化阶段通过 `terminal.loadAddon()` 加载。终端实例通过 `sessionId` 与主进程 PTY 绑定，活跃/非活跃状态通过 `attachOutput`/`detachOutput` 管理。

现有基础设施：
- 自定义 `fitTerminal()` 替代 FitAddon（正确处理 macOS overlay 滚动条宽度）
- 已有 FilePreviewPanel、GitDiffPanel 等面板组件，可作为链接跳转目标
- tab-state.json 持久化 tab 布局（但不含终端内容）
- Attention 系统通过 HTTP 旁路服务器接收 AI Agent 通知

## Goals / Non-Goals

**Goals:**
- 系统性集成 xterm.js 可用的高阶插件和 API，提升终端基础体验
- 构建 AI 原生终端的差异化能力（Decoration、Buffer API）
- 实现终端与面板系统的联动（文件路径点击跳转）
- 实现终端内容跨重启持久化

**Non-Goals:**
- 不替换现有的自定义 `fitTerminal()` 实现（它已正确解决 macOS 问题）
- 不修改现有的 attention HTTP 服务器（自定义 OSC 协议留作未来迭代）
- 不实现完整的终端多路复用器（tmux-like 能力不在范围内）
- 不实现终端输出的 AI 自动分析（Buffer API 仅提供数据访问层，消费端不在本次范围）

## Decisions

### D1: Addon 加载策略 — 统一在初始化阶段加载

**决策**: 所有新增 addon 在 `TerminalInstance` 初始化 `useEffect` 中统一加载，与现有 WebLinksAddon/WebglAddon 保持一致模式。

**理由**: 当前代码已在初始化阶段完成所有 addon 加载，新增 addon 遵循相同模式可减少架构复杂度。Search、Unicode11 等无状态 addon 无需延迟加载。

**备选方案**: 按需延迟加载 addon → 增加代码复杂度但节省少量内存，收益不大（addon 本身很轻量）。

### D2: 渲染器降级链 — WebGL → Canvas → DOM

**决策**: 修改现有渲染器初始化逻辑，在 WebGL 失败时先尝试 Canvas，Canvas 也失败时再降至 DOM。

```
try { terminal.loadAddon(new WebglAddon()) }
catch {
  try { terminal.loadAddon(new CanvasAddon()) }
  catch { /* DOM fallback — no addon needed */ }
}
```

**理由**: Canvas 渲染器性能远优于 DOM（接近 WebGL），且兼容性比 WebGL 更好。Image addon 依赖 Canvas 渲染器，此降级链也为 Image addon 提供基础。

### D3: 搜索 UI — 浮层式搜索栏

**决策**: 搜索 UI 采用终端右上角浮层样式（参考 VS Code 终端搜索），包含输入框、上/下导航按钮、匹配计数、正则/大小写切换按钮、关闭按钮。

**理由**: 浮层式不占用终端行空间，用户在搜索时仍可看到最大化的终端内容。VS Code 的终端搜索交互已被广泛接受。

**备选方案**: 顶部工具栏内嵌搜索 → 需要改动面板布局，侵入性更大。

### D4: 终端装饰系统 — 基于 Decoration API 的行级标记

**决策**: 使用 xterm.js `terminal.registerDecoration()` API 实现三类装饰：
1. **命令边界装饰**: 在每条命令的起始行左侧放置视觉分隔标记
2. **AI 区域装饰**: 高亮 AI Agent 的输出区域（起止行背景色变化）
3. **错误行装饰**: 在包含错误模式的行左侧放置红色指示点

**命令边界检测方式**: 监听 PTY 输出中的 shell 集成转义序列（OSC 133），若 shell 不支持则回退到基于 prompt 模式匹配的启发式检测。

**理由**: Decoration API 是 xterm.js 原生支持的行级标注机制，性能好、与终端滚动自动同步、不影响文本流。

### D5: 自定义链接 — registerLinkProvider + IPC 跳转

**决策**: 使用 `terminal.registerLinkProvider()` 注册自定义链接检测器，识别 `file:line:col` 格式的文件路径。点击后通过 IPC 通知主进程（或直接调用已有的 `window.fileApi`），在 FilePreviewPanel 中打开对应文件并定位到指定行。

**链接检测正则**:
```
/((?:\/|\.\/|\.\.\/)?(?:[\w.-]+\/)*[\w.-]+\.\w+)(?::(\d+))?(?::(\d+))?/
```

**理由**: `registerLinkProvider` 与已有的 `WebLinksAddon` 互不冲突，可以同时注册多个 Provider。利用已有的 FilePreviewPanel 避免重复建设。

### D6: 终端内容持久化 — 独立文件存储

**决策**: 使用 `@xterm/addon-serialize` 在应用退出时将每个终端会话的缓冲区序列化，存储到 `<userData>/terminal-buffers/<sessionId>.txt`。重启时在恢复 tab 布局后回写序列化内容。

**存储策略**:
- 每个 session 独立文件，避免单文件过大
- 序列化内容限制最大行数（默认 1000 行），防止存储膨胀
- 使用 IPC 通道在应用退出时同步写入

**备选方案**: 将序列化数据嵌入 tab-state.json → 单文件体积膨胀，10 个 tab 各 1000 行会使 JSON 变得很大。

### D7: 内联图片 — 依赖 Canvas 渲染器

**决策**: Image addon 仅在 Canvas 渲染器生效时加载。在 WebGL 渲染器下不加载 Image addon（xterm-addon-image 不兼容 WebGL）。

**实现方式**: 在渲染器降级链中跟踪当前使用的渲染器类型，仅在 Canvas 激活时加载 Image addon。

**限制**: 默认 WebGL 渲染器下用户无法使用内联图片。可在设置中增加"优先使用 Canvas 渲染器"选项供需要内联图片的用户切换。

### D8: Buffer API 访问 — 暴露为组件方法

**决策**: 在 `TerminalInstance` 组件上通过 `useImperativeHandle` 暴露 Buffer 访问方法，供父组件 `TerminalPanel` 调用：
- `getBufferLines(count: number): string[]` — 获取最近 N 行
- `getVisibleContent(): string` — 获取当前可视区域内容
- `getAllContent(): string` — 获取全部缓冲区内容

**理由**: Buffer API 是 xterm.js 核心内置能力，不需要额外 addon。通过 `useImperativeHandle` 暴露方法是 React 组件间通信的标准模式。

## Risks / Trade-offs

**[风险] Image addon 与 WebGL 互斥** → 在设置面板中增加渲染器选择选项；默认 WebGL 优先，用户可手动切换到 Canvas 以启用内联图片。

**[风险] Serialize addon 写入大量数据导致退出延迟** → 限制序列化行数上限（1000 行），使用同步写入避免应用退出前数据丢失。

**[风险] 自定义链接检测的正则误匹配** → 对检测到的文件路径做存在性校验（通过 IPC 查询主进程），不存在的路径不显示为链接。

**[风险] 命令边界检测的启发式方法不准确** → 优先依赖 shell 集成 OSC 133 序列（zsh/bash 的现代版本支持），启发式作为回退方案，准确率可接受即可。

**[风险] 多 addon 加载增加初始化时间** → 所有新增 addon 都是轻量级的（每个 <100KB），初始化开销可忽略。通过 performance.mark/measure 监控确认。

**[Trade-off] Unicode11 addon 会略微增加每次字符渲染的计算量** → 影响极小（仅在宽度查表时增加一次映射），收益（正确的 CJK/Emoji 渲染）远大于成本。
