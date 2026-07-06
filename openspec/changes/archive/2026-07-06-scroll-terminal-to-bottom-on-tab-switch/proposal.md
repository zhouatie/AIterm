## Why

用户切换 terminal tab 后右侧 terminal 内容会跟着切换，但 viewport 停留在之前的历史位置，常常看不到最新输出，需要每次手动滚动到底部。terminal tab 的切换应优先展示当前会话最新上下文，降低重复手动操作。

## What Changes

- 切换到任一 terminal tab 后，右侧当前 terminal viewport 自动滚动到 xterm 普通 buffer 底部。
- 通过鼠标点击 tab、快捷键切换 tab、Agent Inbox/通知激活 session、Spec Dashboard 绑定/激活 session 等统一入口切换时都应保持一致行为。
- 自动滚动只改变 viewport 查看位置，不向 PTY stdin 写入内容，不影响 PTY 进程、输出历史、tab 结构或会话生命周期。
- 保留用户在当前活跃 tab 内手动滚动回看历史、使用首尾滚动控件和复制选中文本的能力。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `terminal-tabs`: terminal tab 切换后的 viewport 默认定位需要从保留历史滚动位置调整为自动滚动到底部。

## Impact

- 影响 `TerminalPanel` 中 terminal session 激活、快捷键切换、通知/Agent Inbox 激活、Spec Dashboard 激活等入口。
- 影响 `TerminalInstance` 活跃态恢复后的 xterm viewport 定位和 scroll state 上报时机。
- 不新增外部依赖，不改变 PTY 输入输出协议，不改变 terminal 内容持久化策略。
