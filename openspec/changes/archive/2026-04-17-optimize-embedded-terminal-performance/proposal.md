## Why

当前嵌入式终端在单 tab、普通命令输出场景下已经可用，但在多 terminal 并存、AI 持续流式输出、TUI 高频重绘和布局变化时，渲染链路会放大浏览器与 React 容器层的额外开销，体感流畅性明显落后于 Ghostty 这类原生终端。现在需要先补齐一批结构性优化，拉近常见工作流中的响应速度与稳定性差距，并为后续继续迭代终端性能建立明确边界。

## What Changes

- 优化终端输出分发链路，避免单个 session 的高频输出被广播到所有终端实例后再逐个过滤，降低多 terminal 并存时的无效唤醒和渲染开销。
- 优化非活跃 terminal 的运行策略，避免后台 terminal 继续参与实时输出写入、尺寸同步和不必要的观察器工作，提升多 tab 场景下的前台交互流畅性。
- 为 PTY 输出引入按 session 的微批次写入策略，降低高频流式输出下的 IPC 与 `xterm.write` 调用频率，同时保持可接受的交互延迟。
- 引入可控的 WebGL renderer 路径，允许在支持的环境下启用 `@xterm/addon-webgl`，并在不支持或初始化失败时自动回退到默认 renderer。
- 补充终端性能相关设置入口，使 renderer 策略具备显式可控性，便于验证、回退和后续迭代。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `embedded-terminal`: 终端输出分发、后台实例活跃策略、输出批处理与 renderer 选择行为的要求将发生变化
- `settings-panel`: 设置面板将新增终端 renderer 策略配置，用于控制是否尝试启用 WebGL renderer

## Impact

- **受影响代码**：`src/components/TerminalInstance.tsx`、`src/components/TerminalPanel.tsx`、`src/main.ts`、`src/preload.ts`、`src/pty-manager.ts`、`src/components/SettingsPanel.tsx`、终端设置相关工具模块
- **受影响系统**：Electron 主进程 IPC、渲染进程 terminal 生命周期管理、xterm renderer 初始化路径、应用内设置持久化
- **依赖变更**：预计新增 `@xterm/addon-webgl`
- **无外部 API 变更**：不涉及对外网络接口或 CLI 参数变更
