## 1. 扩展快捷键系统

- [x] 1.1 在 `ShortcutContext.tsx` 的 `ShortcutActionId` 联合类型中新增 `select-terminal-tab-1` … `select-terminal-tab-9` 共 9 个字面量
- [x] 1.2 在 `SHORTCUT_ACTIONS` 数组中为 9 个新动作添加对应的 `{ id, title, description }` 条目（中文描述）
- [x] 1.3 在 `DEFAULT_SHORTCUT_BINDINGS` 中为 9 个动作添加默认绑定：`Meta+1` … `Meta+8` 及 `Meta+9`

## 2. 实现跳转逻辑

- [x] 2.1 在 `TerminalPanel.tsx` 中实现 `selectTerminalTabByIndex(index: number)` 函数：使用现有 `getOrderedSessionIds()` 获取有序 session 列表，按 1-based index 查找目标 session，超出范围时静默返回
- [x] 2.2 为 `select-terminal-tab-9` 实现"最后一个 tab"语义：将 `index` 固定为 `sessionIds.length`（即取最后一项）
- [x] 2.3 使用 `registerAction` 在 `useEffect` 中为 9 个动作分别注册处理器，调用 `selectTerminalTabByIndex`

## 3. 验证与收尾

- [x] 3.1 手动验证：打开 3 个以上 tab，测试 Cmd+1 / Cmd+2 / Cmd+9 跳转是否符合预期
- [x] 3.2 手动验证：tab 数量少于按键编号时（如只有 2 个 tab 按 Cmd+5）确认静默无效
- [x] 3.3 手动验证：在终端获焦状态下按 Cmd+1…9，确认快捷键正常穿透 xterm.js
- [x] 3.4 打开设置面板，确认 9 个新动作条目正常显示，可录入自定义绑定

