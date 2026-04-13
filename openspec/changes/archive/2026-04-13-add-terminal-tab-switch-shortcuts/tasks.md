## 1. 扩展快捷键动作定义

- [x] 1.1 在 `src/ShortcutContext.tsx` 中新增 `select-previous-terminal-tab` 与 `select-next-terminal-tab` 动作 ID
- [x] 1.2 在 `SHORTCUT_ACTIONS` 中新增两个动作的标题与说明，确保设置面板能自动展示
- [x] 1.3 在 `DEFAULT_SHORTCUT_BINDINGS` 中设置默认绑定：`Meta+Shift+[` 与 `Meta+Shift+]`
- [x] 1.4 确认快捷键录入、规范化、显示和持久化逻辑能处理 `[` / `]` 主键

## 2. 实现 terminal tab 快捷键切换

- [x] 2.1 在 `src/components/TerminalPanel.tsx` 中新增从 `WorkspaceNode[]` 扁平化二级 terminal session 顺序的辅助逻辑
- [x] 2.2 新增选择上一项 / 下一项 terminal tab 的处理逻辑，按全局二级 terminal 顺序循环切换
- [x] 2.3 单个 terminal tab 或找不到当前活跃 session 时保持状态不变
- [x] 2.4 复用现有 session 选择流程，确保切换后 active session、workspace 路径上下文和终端内容同步更新
- [x] 2.5 通过 `registerAction` 注册两个新 terminal tab 切换动作，并在组件卸载时注销
- [x] 2.6 在目标 terminal tab 成为 active 后聚焦对应的 xterm 实例

## 3. 更新设置面板文案

- [x] 3.1 更新 `src/components/SettingsPanel.tsx` 中写死“3 个动作”的说明文案，使其覆盖新增 terminal tab 切换动作
- [x] 3.2 确认新增动作在设置面板中与现有动作使用同一套冲突校验和保存流程

## 4. 验证

- [ ] 4.1 手动验证首次加载默认绑定包含 `Command + Shift + [` 和 `Command + Shift + ]`
- [ ] 4.2 手动验证多个 workspace / 多个二级 terminal tab 场景下，快捷键按左侧导航顺序上一项 / 下一项循环切换
- [ ] 4.3 手动验证只有一个 terminal tab 时，触发两个快捷键不会改变当前状态或重建终端
- [ ] 4.4 手动验证目标 terminal tab 所属 workspace 折叠时，快捷键能切换终端内容但不会强制展开 workspace
- [ ] 4.5 手动验证终端获焦状态下两个快捷键仍可触发，重命名输入框获焦时不会触发
- [ ] 4.6 手动验证设置面板中可重新绑定两个新动作，并能阻止与已有动作重复绑定
- [ ] 4.7 手动验证 terminal tab 切换后键盘焦点进入目标终端
