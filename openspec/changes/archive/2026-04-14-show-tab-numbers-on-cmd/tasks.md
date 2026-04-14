## 1. 维护 isCmdHeld 状态

- [x] 1.1 在 `TerminalPanel.tsx` 中新增 `isCmdHeld` state（`useState(false)`）
- [x] 1.2 在 `useEffect` 中监听 `window` 的 `keydown`（`event.key === 'Meta'` → `true`）和 `keyup`（`event.key === 'Meta'` → `false`）事件
- [x] 1.3 在同一 `useEffect` 中监听 `window.blur`，触发时将 `isCmdHeld` 重置为 `false`

## 2. 渲染序号

- [x] 2.1 实现序号计算逻辑：基于 `getOrderedSessionIds` 扁平顺序，index 0–7 对应显示 `1`–`8`，最后一个 tab 显示 `9`，其余返回 `null`（不显示）
- [x] 2.2 在二级 terminal tab 节点 JSX 中，前置一个固定宽度容器（`1.25rem`），`isCmdHeld` 为 `true` 时显示序号文字，否则渲染空白占位，保持布局稳定
- [x] 2.3 序号样式：muted 色（使用现有 CSS 变量或 opacity）、等宽字体、字号略小于 tab 名称

## 3. 验证与收尾

- [x] 3.1 手动验证：按住 Cmd 时序号出现，松开后消失
- [x] 3.2 手动验证：Cmd+Tab 切走再切回，确认序号不残留
- [x] 3.3 手动验证：序号显示/隐藏切换时 tab 名称位置不跳动
- [x] 3.4 手动验证：打开超过 9 个 tab，确认最后一个显示 `9`，中间超出 8 的 tab 不显示序号

