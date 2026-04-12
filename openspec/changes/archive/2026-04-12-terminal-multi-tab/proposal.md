## Why

当前终端面板只支持单个终端会话。实际开发中，用户经常需要同时运行多个终端任务（如一个跑 dev server、一个跑 AI 编程代理、一个执行临时命令），必须在外部终端和应用之间切换，违背了工作台"减少上下文切换"的核心目标。支持多 Tab 终端可以让用户在一个面板内管理多个独立的终端会话。

## What Changes

- 终端面板内新增 Tab 栏，显示所有已打开的终端会话
- 点击 Tab 可切换到对应终端，终端内容和状态完整保留
- 提供新建 Tab 按钮（`+`），点击后创建新的终端会话
- 每个 Tab 提供关闭按钮（`×`），关闭时销毁对应 PTY 会话并释放资源
- 关闭最后一个 Tab 时自动创建一个新的空终端，保证终端面板始终可用
- 应用启动时默认创建一个终端 Tab

## Capabilities

### New Capabilities
- `terminal-tabs`: 终端多 Tab 管理能力，涵盖 Tab 栏 UI、Tab 的创建/切换/关闭、多终端实例的生命周期管理以及 Tab 间状态隔离

### Modified Capabilities
- `embedded-terminal`: 终端组件需要从"面板级单例"改造为"可实例化组件"，支持同一面板内存在多个独立的 xterm.js + PTY 实例，每个实例独立管理生命周期

## Impact

- `src/components/TerminalPanel.tsx`：从单终端面板重构为 Tab 容器 + 多终端实例
- `src/components/` 下新增 Tab 栏组件和单个终端实例组件
- `src/main.ts`：IPC handler 无需修改（pty-manager 已支持多 session）
- `src/pty-manager.ts`：无需修改（已基于 Map 支持多会话）
- `src/preload.ts`：无需修改（API 已按 session ID 隔离）
