## Why

终端输出较长时，用户现在只能依赖滚轮或滚动条逐步回看，想快速跳到最早输出或回到底部继续跟随当前命令不够高效。为 terminal 增加一键滚动到最上与最下能力，可以补齐长日志、构建输出和 AI agent 输出场景下的基础导航体验。

## What Changes

- 在当前激活 terminal session 中增加“滚动到最上”和“滚动到最下”能力。
- 提供友好的显性入口，让用户无需记忆快捷键也能发现并触发首尾滚动。
- 支持 terminal-local 快捷键触发首尾滚动，并在触发后保持 terminal 输入焦点。
- 根据当前滚动位置与缓冲区状态更新控件可用性，避免无 scrollback 或已经位于目标位置时给出误导。
- 在 alternate screen（如 vim、less、htop 等全屏 TUI）中避免显示或触发应用级首尾滚动，减少对 TUI 自身交互语义的干扰。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `embedded-terminal`: 增加 terminal 滚动缓冲区的首尾快速导航行为与用户交互要求。

## Impact

- 影响渲染进程 terminal UI：`TerminalInstance`、`TerminalPanel` 以及相关样式。
- 使用 xterm.js 现有滚动 API，不新增主进程 IPC、不修改 PTY 生命周期、不新增外部依赖。
- 不改变现有普通滚动、文本选择、搜索、tab 管理和输出渲染行为。
