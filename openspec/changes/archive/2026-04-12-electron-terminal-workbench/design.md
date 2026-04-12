## Context

这是一个全新项目。当前没有已有代码库。

目标用户是前端开发者（即作者本人），日常工作流依赖终端（运行 codex、claude-code 等 AI 编程代理）、浏览器、以及其他开发工具。频繁的应用切换导致上下文碎片化。

本设计规划一个 Electron 桌面应用作为个人开发工作台的基座，MVP 阶段只需实现嵌入式终端面板。

约束条件：
- 目标平台：macOS（开发者本机）
- 技术栈：Electron + TypeScript + React + xterm.js + node-pty
- MVP 原则：最小功能集，快速跑通端到端流程

## Goals / Non-Goals

**Goals:**
- 搭建 Electron 应用基础骨架（主进程、渲染进程、预加载脚本）
- 实现一个可用的嵌入式终端面板（能运行 codex/claude-code 等交互式 CLI 工具）
- 建立主进程与渲染进程之间的 IPC 通信机制
- 提供基础的面板布局系统，为后续扩展（Chat、侧边栏）留出结构

**Non-Goals:**
- 不做多标签页终端
- 不做分屏功能
- 不做主题/配色系统
- 不做 Chat 面板（后续迭代）
- 不做侧边栏文件浏览器（后续迭代）
- 不做跨平台支持（仅 macOS）
- 不做自动更新机制

## Decisions

### D1: 使用 Electron（而非 Tauri 或纯 Web）

**选择**: Electron

**理由**: node-pty 是 Node.js 原生模块，在 Electron 主进程中可以直接使用，无需额外的 Rust 绑定或 sidecar 进程。开发者是前端背景，Electron 的 JS/TS 全栈体验最顺畅。虽然包体积大（~150MB）、内存占用高（~200MB），但作为个人工具可以接受。

**备选方案**:
- Tauri 2：轻量快速，但 PTY 需要 Rust 插件，扩展模块可能频繁遇到 npm 生态兼容问题
- 纯 Web：开发最快，但不是独立应用，需要手动启动服务 + 打开浏览器

### D2: 使用 IPC 桥接终端（而非 WebSocket）

**选择**: Electron IPC (ipcMain / ipcRenderer / contextBridge)

**理由**: 终端数据在主进程的 node-pty 和渲染进程的 xterm.js 之间传输。Electron IPC 是进程间通信的原生方式，延迟低、无需额外的网络层。WebSocket 在 Electron 场景下是多余的抽象。

**数据流**:
```
渲染进程 (xterm.js)                     主进程 (node-pty)
    │                                       │
    │──── terminal:input (用户按键) ────────▶│
    │                                       │──▶ PTY stdin
    │                                       │
    │                                  PTY stdout ──▶│
    │◀──── terminal:output (shell 输出) ────│
    │                                       │
    │──── terminal:resize (窗口大小) ───────▶│
    │                                       │──▶ PTY resize
```

### D3: 渲染层使用 React

**选择**: React + TypeScript

**理由**: 后续面板系统需要组件化管理（终端面板、Chat 面板、侧边栏等），React 的组件模型天然适合。同时前端开发者对 React 生态最熟悉。

### D4: 使用 Electron Forge 作为构建工具

**选择**: Electron Forge (Vite 模板)

**理由**: Electron Forge 是 Electron 官方推荐的工具链，Vite 模板提供快速的 HMR 开发体验。相比 electron-builder，Forge 的开发体验更好，配置更简洁。node-pty 的 native addon rebuild 通过 `@electron/rebuild` 自动处理。

### D5: 面板布局采用简单状态切换

**选择**: React state 驱动的面板切换，不引入复杂布局引擎

**理由**: MVP 阶段只有一个终端面板，面板切换只需要一个 `activePanel` 状态。后续增加 Chat 面板时，也只是在组件之间切换。等到需要拖拽、分割等复杂布局时再引入专用库（如 react-mosaic）。

## Risks / Trade-offs

- **[node-pty native rebuild]** → node-pty 包含 C++ addon，每次 Electron 版本升级需要 rebuild。使用 `@electron/rebuild` 自动化处理，并在 CI 中验证。

- **[Electron 包体积大]** → ~150MB+。作为个人工具可以接受，不影响用户体验。

- **[IPC 性能与高频终端输出]** → 大量终端输出（如 `cat` 大文件）时 IPC 可能成为瓶颈。可以在 IPC 层做 batch 缓冲（积攒几毫秒再发送）来缓解，但 MVP 阶段先不做优化。

- **[安全性：渲染进程权限]** → 遵循 Electron 安全最佳实践：启用 contextIsolation、禁用 nodeIntegration、通过 preload 脚本暴露最小 API。
