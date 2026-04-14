## Why

`switch-tab-by-number` 实现了 `Cmd+1…9` 直跳 terminal tab，但用户在按键前需要自己心算目标 tab 的序号，与快捷键的"快"相矛盾。按住 `Command` 键时在侧边栏临时显示序号，让用户一眼定位目标再按键，形成完整的视觉反馈闭环。

## What Changes

- 按住 `Command` 键时，侧边栏每个二级 terminal tab 前显示其跳转序号（1–8 前置数字，最后一个显示 9）；超出范围的 tab 不显示序号
- 松开 `Command` 键后序号消失，恢复默认的干净视图
- 窗口失焦时（`window.blur`）自动重置显示状态，避免数字残留（stuck key 问题）
- 数字使用 muted 色 + 等宽字体，前置对齐，不影响 tab 名称主视觉

## Capabilities

### New Capabilities

无新能力。

### Modified Capabilities

- `terminal-tabs`：新增"按住 Command 时显示 tab 序号"的交互行为规格

## Impact

- `src/components/TerminalPanel.tsx`：监听 `keydown/keyup(Meta)` 和 `window.blur`，维护 `isCmdHeld` 状态；在 tab 节点渲染中条件显示序号
- 无新依赖、无 IPC 变更、无持久化变更
- 依赖 `switch-tab-by-number` 变更已完成（序号语义保持一致）
