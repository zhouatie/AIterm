## Context

当前 `TerminalInstance.tsx` 中终端容器使用绝对定位，样式为 `{ position: 'absolute', top: 0, left: 8, right: 0, bottom: 0 }`。`left: 8` 导致容器实际宽度为 `parentWidth - 8px`。

xterm.js 的 `FitAddon` 基于容器可用像素宽度计算可填充的字符列数（`cols = Math.floor(availableWidth / charWidth)`）。由于字符单元格是固定像素宽度（约 8.4px @14px fontSize），不整除的余数像素无法被利用，产生右侧空白。左侧 8px 间距 + 右侧余数空白，使 TUI 应用（如 CodeMaker CLI）无法视觉上占满终端面板宽度。

## Goals / Non-Goals

**Goals:**
- 终端内容占满面板的完整宽度，消除左右空白
- 保持终端文字不紧贴容器左边缘的视觉体验（合理内边距）
- 确保 FitAddon 正确计算列数，使 TUI 应用渲染填满终端宽度

**Non-Goals:**
- 不修改 SplitLayout、PanelManager 等上层布局组件
- 不调整 xterm.js 字体大小或字体族
- 不修改 PTY 层逻辑

## Decisions

### 决策 1：移除 `left: 8` 偏移，改用 xterm.js 内置 padding

**选择**: 将容器改为 `left: 0`，通过 xterm.js Terminal 构造选项的 `scrollMarkerWidth` 或直接覆写 `.xterm-viewport` / `.xterm-screen` 的 CSS padding 来实现左侧内边距。

**备选方案**:
- **方案 A**（采用）: `left: 0` + CSS 覆写 xterm 内部元素 padding。FitAddon 的 `fit()` 方法在计算列数时会考虑 xterm 容器内部的 padding，因此不会产生列数不匹配的问题。
- **方案 B**: `left: 0` + 外层容器 `paddingLeft: 8`。问题是 FitAddon 基于容器 `clientWidth`（包含 padding）计算列数，但 xterm canvas 实际渲染区域不包含 padding，仍会产生宽度差。
- **方案 C**: 直接 `left: 0`，不加任何内边距。最简单但文字会紧贴左边缘，视觉体验下降。

**理由**: 方案 A 让 FitAddon 的列数计算和 xterm 的渲染区域完全一致，从根本上消除宽度不匹配问题。xterm.js v5+ 支持通过 CSS 自定义内部间距，FitAddon 会正确处理。

### 决策 2：内边距数值

**选择**: 使用较小的左侧内边距（4-6px），而非原来的 8px。

**理由**: 原来 8px 的 `left` 偏移过大，在终端场景下不必要。4-6px 足以防止文字紧贴边缘，同时最大化可用宽度，减少列数损失。

## Risks / Trade-offs

- **[列数微调]** → 可用宽度增加约 2-8px，可能多出 0-1 列。这是预期行为，对用户体验是正向的。
- **[CSS 覆写维护性]** → 覆写 xterm 内部 CSS 类名可能在 xterm 升级时失效 → 使用稳定的 `.xterm` 选择器，且变更范围小，易于维护。
- **[视觉微差]** → 去除左侧间距后终端区域与 Tab 栏的对齐关系可能微调 → 通过内边距补偿，实际影响极小。
