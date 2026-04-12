## Why

当前前端开发工作流中，终端（运行 codex/claude-code 等 AI 编程代理）、浏览器（查文档）、其他工具之间需要频繁切换，导致上下文碎片化、效率降低。需要一个统一的 GUI 工作台，将终端作为核心模块嵌入，后续可按需扩展其他功能面板（Chat、文件浏览器等），减少应用切换。

## What Changes

- 新建一个 Electron 桌面应用项目，作为个人开发工作台的基座
- 在应用窗口中嵌入一个基于 xterm.js 的终端面板，通过 node-pty 连接真实 shell 进程
- 终端面板支持基础交互：命令输入/输出、ANSI 颜色渲染、滚动回看
- 搭建可扩展的面板架构，为后续模块（Chat 面板、侧边栏等）预留扩展点

## Capabilities

### New Capabilities

- `electron-shell`: Electron 应用基座——窗口管理、进程模型（主进程/渲染进程）、IPC 通信基础设施
- `embedded-terminal`: 嵌入式终端面板——xterm.js 渲染 + node-pty 后端 + IPC 桥接，提供完整的交互式终端体验
- `panel-layout`: 面板布局系统——管理主内容区的面板切换与排列，为后续多面板扩展提供基础结构

### Modified Capabilities

（无，这是全新项目）

## Impact

- **新增依赖**: electron, xterm.js, node-pty, 以及相关构建工具（electron-builder 或 electron-forge）
- **构建流程**: 需要配置 Electron 打包流程，node-pty 包含 native addon 需要 rebuild
- **目标平台**: macOS 优先（开发者本机使用）
- **代码结构**: 新建完整项目，包含主进程、渲染进程、预加载脚本的标准 Electron 结构
