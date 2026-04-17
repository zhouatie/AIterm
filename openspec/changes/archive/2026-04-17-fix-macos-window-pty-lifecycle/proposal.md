## Why

当前 macOS 关闭主窗口后，Electron 应用进程仍保持运行，但已有 PTY 会话没有被清理；再次点击 dock 重新打开窗口时，渲染进程会基于持久化 tab 布局创建新的 PTY，会导致旧 PTY 残留和新旧 session 重复。这个问题会让后台运行的 Codex/Claude/OpenCode 等 CLI agent 继续占用资源，并可能产生用户不可见的后台任务。

## What Changes

- 在 macOS 主窗口关闭链路中显式清理所有活跃 PTY 会话，保证关闭窗口后不会留下不可见的后台 PTY。
- 关闭 GUI 会终止活跃 PTY 时，先向用户展示二次确认；用户取消时不得关闭窗口或清理 PTY。
- 保留现有 tab 布局持久化能力：重新打开窗口时仍按保存的 workspace/session 结构恢复 UI，但只创建一组新的 PTY 会话。
- 确保应用退出链路仍只清理一次 PTY，重复清理应安全无副作用。
- 不引入 PTY reattach / detach 能力；关闭主窗口被定义为终止窗口内终端会话，而不是后台保活。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `electron-shell`: 明确关闭 GUI 前必须对将被终止的活跃 PTY 做二次确认；macOS 关闭所有窗口时也必须清理活跃 PTY，且 dock 重新打开窗口不得复用已销毁的 PTY。
- `terminal-tabs`: 明确持久化 tab 布局恢复只恢复结构和起始 cwd，不代表恢复关闭窗口前的运行中 PTY 进程。

## Impact

- **代码**: `src/main.ts` 的窗口关闭确认、`window-all-closed`、应用退出兜底清理生命周期处理。
- **代码**: `src/pty-manager.ts` 的 PTY 全量清理幂等性依赖现有 `disposeAllSessions()` 行为。
- **代码**: `src/components/TerminalPanel.tsx` 的持久化恢复语义需要与“窗口关闭后 PTY 已终止”保持一致。
- **行为**: 用户关闭主窗口时需要先确认会终止终端进程；确认后运行中的终端命令会被终止，重新打开窗口会创建新的 shell，而不是恢复原进程。
- **验证**: 需要覆盖关闭 GUI 确认/取消、关闭主窗口后旧 PTY 不残留、dock 重新打开后不会出现重复 session、应用退出时不报错。
