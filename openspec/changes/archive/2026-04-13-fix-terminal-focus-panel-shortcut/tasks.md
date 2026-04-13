## 1. 修复 isEditableTarget 函数

- [x] 1.1 在 `src/ShortcutContext.tsx` 的 `isEditableTarget` 函数中，将 `tagName === 'textarea'` 的判断替换为：若 textarea 位于 `.xterm` 容器内则返回 `false`（不拦截），否则返回 `true`（拦截）
- [x] 1.2 为修改添加注释，说明 xterm.js 内部使用隐藏 textarea 作为键盘捕获元素，以及 `.xterm` 容器作为检测标志的原因

## 2. 验证

- [x] 2.1 手动验证：在终端获焦状态下按 `Meta+B` 和 `Meta+S`，确认面板正常展开/收起
- [x] 2.2 手动验证：在工作区重命名输入框中输入时，确认面板快捷键不触发
- [x] 2.3 手动验证：在设置面板中录制快捷键时，确认 `stopPropagation` 逻辑不受影响
