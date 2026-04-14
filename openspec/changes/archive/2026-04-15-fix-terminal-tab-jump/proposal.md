## Why

切换 terminal tab 时，整个 tab 列表会出现明显的"抖动/跳动"。原因是活跃态与非活跃态的垂直 margin 不一致（活跃态 marginTop=4 + marginBottom=4 = 总占位 42px；非活跃态 marginTop=2 + marginBottom=0 = 总占位 36px），切换时两个 tab 的占位空间同时变化 ±6px，导致列表 reflow。这不是设计意图，而是样式参数的疏漏。

## What Changes

- 统一活跃态与非活跃态 terminal tab 的垂直 margin，使每个 tab 行的总垂直占位保持恒定，消除切换时的布局跳动
- 从 transition 属性中移除 `margin`（不再需要动画化 margin 变化）

## Capabilities

### New Capabilities

_无新增能力。_

### Modified Capabilities

- `terminal-tabs`: 活跃 tab 的卡片化浮起效果中，上下 margin 需调整为与非活跃态等高的方案，使切换不产生 layout reflow

## Impact

- **代码**: `src/components/TerminalPanel.tsx` — session 行的 inline style（marginTop / marginBottom / transition 属性）
- **视觉**: 活跃态 tab 与相邻 tab 之间的间距会略有调整，但卡片浮起效果通过 box-shadow / border / background 保持
- **规格**: `openspec/specs/terminal-tabs/spec.md` 中"活跃 tab 通过上下 margin 拉开间距 ≥ 3px"的要求需重新审视——可改为 padding 或其他不影响外部布局的方式
