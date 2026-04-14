## 1. 修复 inline style

- [x] 1.1 将 `TerminalPanel.tsx` 中 session 行的 `marginTop` 统一为 `2`（活跃与非活跃相同）
- [x] 1.2 将 `TerminalPanel.tsx` 中 session 行的 `marginBottom` 统一为 `2`（活跃与非活跃相同）
- [x] 1.3 从 session 行的 `transition` 属性中移除 `margin 0.2s ease-out`

## 2. 验证

- [x] 2.1 在多 tab 场景下切换 tab，确认列表无跳动/抖动
- [x] 2.2 确认活跃 tab 的卡片浮起视觉效果（阴影、毛玻璃、边框）仍然正常
- [x] 2.3 确认 hover 非活跃 tab 时的阴影与背景变化仍然正常
- [x] 2.4 确认项目可正常构建（无 TypeScript 或 lint 错误）
