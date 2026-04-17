## Why

AIterm 当前仅使用了 xterm.js 两个插件（WebglAddon、WebLinksAddon），大量高阶能力未被开发。作为一个 AI 原生终端，缺少终端搜索、Unicode 正确渲染、会话内容持久化、AI 交互区域标记、智能文件链接跳转、内联图片等能力，使 AIterm 与 iTerm2/Warp 等成熟终端相比缺乏差异化竞争力。现在是系统性补齐 xterm.js 高阶能力的时机。

## What Changes

### 第一阶段：基础能力补齐
- 集成 `@xterm/addon-search`，支持 Cmd+F 终端内容搜索、高亮匹配、正则搜索、匹配项间导航
- 集成 `@xterm/addon-unicode11`，修复中日韩全角字符和 Emoji 的宽度计算与光标对齐
- 集成 `@xterm/addon-canvas`，在 WebGL 不可用时回退到 Canvas 渲染器（而非当前的 DOM 渲染器）

### 第二阶段：AI 原生终端能力
- 利用 xterm.js Decoration API 实现终端行级装饰：命令边界标记、AI Agent 输出区域高亮、错误行侧栏指示器
- 利用 xterm.js Buffer API 实现终端内容的编程式读取：提取最近 N 行上下文、命令输出捕获、智能复制

### 第三阶段：面板联动与持久化
- 利用 `registerLinkProvider()` 实现自定义链接检测：编译错误中的文件路径（`file:line:col`）可点击跳转到 FilePreviewPanel，相对路径、Git ref 等智能识别
- 集成 `@xterm/addon-serialize`，在应用退出时序列化终端缓冲区内容（含 ANSI 格式），重启后恢复上次终端显示内容

### 第四阶段：高级视觉能力
- 集成 `@xterm/addon-image`，支持 iTerm2 内联图片协议和 Sixel 图形，在终端中直接渲染图片

## Capabilities

### New Capabilities
- `terminal-search`: 终端内容搜索功能，包括搜索 UI、快捷键、高亮匹配、正则支持、匹配项间导航
- `terminal-unicode`: Unicode 11 宽度正确计算，修复 CJK 字符和 Emoji 的渲染对齐
- `terminal-canvas-renderer`: Canvas 渲染器回退层，补全 WebGL → Canvas → DOM 的渲染降级链
- `terminal-decorations`: 终端行级装饰系统，支持命令边界标记、AI 区域高亮、错误行指示器、书签
- `terminal-buffer-access`: 终端缓冲区编程式访问，支持上下文提取、命令输出捕获、智能复制
- `terminal-smart-links`: 自定义链接检测与面板联动，文件路径点击跳转到 FilePreviewPanel
- `terminal-content-persistence`: 终端内容序列化与跨重启恢复
- `terminal-inline-images`: 内联图片渲染，支持 iTerm2 协议和 Sixel 图形

### Modified Capabilities
- `embedded-terminal`: WebGL 渲染器回退链从 WebGL → DOM 变更为 WebGL → Canvas → DOM；新增 addon 的初始化与生命周期管理

## Impact

- **依赖变更**: 新增 `@xterm/addon-search`、`@xterm/addon-unicode11`、`@xterm/addon-canvas`、`@xterm/addon-serialize`、`@xterm/addon-image` 五个 npm 包
- **核心文件**: `TerminalInstance.tsx` 需要扩展 addon 加载逻辑、Link Provider 注册、Decoration 管理、Buffer 访问接口
- **新增 UI 组件**: 搜索栏组件（浮层式，参考 VS Code 终端搜索）
- **IPC 扩展**: 新增文件路径点击事件的 IPC 通道（终端 → FilePreviewPanel）；序列化数据的存储/读取 IPC
- **持久化扩展**: `tab-state.json` 需扩展为包含序列化的终端缓冲区内容，或使用独立的 `terminal-buffers/` 目录存储
- **渲染器兼容**: `@xterm/addon-image` 仅支持 Canvas 渲染器，需要在 Canvas 回退层就绪后才能启用
