## Why

当前 terminal 只支持相对切换（上一个 / 下一个），在打开多个 tab 时需要反复按键才能跳到目标终端，效率偏低。支持按编号直接跳转（类似浏览器 / iTerm2 的 Cmd+1…Cmd+9），让用户一键定位任意 tab，尤其适合同时运行多个长任务的场景。

## What Changes

- 新增 9 个快捷键动作：`select-terminal-tab-1` 至 `select-terminal-tab-9`，默认绑定为 `Command + 1` 至 `Command + 9`
- `Command + 9` 固定跳转到最后一个 tab（与 Chrome / Safari / iTerm2 行为一致），而非第 9 个
- Tab 序号基于侧边导航从上到下展示的二级 terminal 节点顺序（跨 workspace 展开后的扁平顺序）
- 9 个动作均加入设置面板的快捷键配置列表，支持用户自定义或清除绑定
- tab 数量不足时，编号超出范围的快捷键不产生任何效果

## Capabilities

### New Capabilities

无新能力，本次变更为对已有能力的扩展。

### Modified Capabilities

- `keyboard-shortcuts`：新增 9 个动作 ID 及其默认绑定，扩展 `ShortcutActionId` 类型和 `DEFAULT_SHORTCUT_BINDINGS`
- `terminal-tabs`：新增按编号直接跳转二级 terminal tab 的行为规格

## Impact

- `src/ShortcutContext.tsx`：扩展 `ShortcutActionId` 联合类型、`SHORTCUT_ACTIONS` 数组、`DEFAULT_SHORTCUT_BINDINGS`
- `src/components/TerminalPanel.tsx`：注册 9 个动作处理器，实现按编号查找并切换到对应 tab
- `src/components/SettingsPanel.tsx`：设置面板需容纳 9 个新条目，需确认布局不溢出
- 无新依赖、无 IPC 变更、无持久化格式变更
