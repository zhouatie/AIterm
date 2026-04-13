## Why

当用户点击终端（xterm.js 实例）后，终端内部会将焦点转移到其隐藏的 `<textarea>` 输入捕获元素上。全局快捷键系统的 `isEditableTarget` 函数将所有 `<textarea>` 标签视为可编辑输入而跳过处理，导致展开/收起面板的快捷键（如 `Meta+B`、`Meta+S`）在终端获焦时完全失效，严重影响使用体验。

## What Changes

- 修复 `src/ShortcutContext.tsx` 中的 `isEditableTarget` 函数，使其能识别并排除 xterm.js 内部的 `<textarea>`（位于 `.xterm` 容器内），不将其视为用户可编辑字段
- 确保终端获焦时，`toggle-file-tree`（`Meta+S`）和 `toggle-terminal-sidebar`（`Meta+B`）等面板快捷键仍然正常触发
- 保留对真实可编辑元素（工作区重命名 `<input>`、设置面板 `<select>`、`contentEditable` 元素）的正确屏蔽逻辑

## Capabilities

### New Capabilities

无新增能力。

### Modified Capabilities

- `keyboard-shortcuts`：修改快捷键系统判断"可编辑目标"的规则——`isEditableTarget` 需额外识别 xterm.js 的内部 textarea，避免将其错误屏蔽。

## Impact

- **代码**：仅修改 `src/ShortcutContext.tsx` 中的 `isEditableTarget` 函数（约 6 行）
- **无 API / 依赖变更**
- **无破坏性变更**
- 影响范围：所有在终端获焦状态下触发的全局面板快捷键（`Meta+B`、`Meta+S` 等）
