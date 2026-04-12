## Why

终端实例容器在 `TerminalInstance.tsx` 中使用了 `left: 8` 的绝对定位偏移，导致 xterm.js 的可用宽度比父容器少 8px。FitAddon 基于这个较窄的宽度计算列数，由于字符单元格是固定像素宽度，填满整数列后的剩余像素成为右侧空白。加上左侧 8px 的间距，TUI 应用（如 CodeMaker CLI）无法占满终端面板的全部宽度，视觉效果不理想。

## What Changes

- 移除 `TerminalInstance` 容器的 `left: 8` 硬编码偏移，改为 `left: 0`，使终端容器占满父元素完整宽度
- 通过 xterm.js 的 `theme.padding` 或容器 CSS padding 实现等效的左侧内边距，确保光标和文字不紧贴左边缘，同时不影响 FitAddon 的列数计算
- 确保 FitAddon 在容器宽度变更后正确 refit，终端内容完整填满可用空间

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `embedded-terminal`: 终端实例容器的布局定位方式变更，修复宽度无法 100% 占满的问题

## Impact

- **受影响文件**: `src/components/TerminalInstance.tsx` — 修改容器样式
- **视觉影响**: 终端内容将完整占满面板宽度，TUI 应用渲染不再出现左右空白
- **兼容性**: FitAddon 的列数计算可能因可用宽度微调而产生 ±1 列变化，属于预期行为
- **依赖**: 无新增依赖，仅调整现有样式属性
