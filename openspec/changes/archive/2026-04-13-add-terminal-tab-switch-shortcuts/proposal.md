## Why

当前 terminal 面板已经支持多个 workspace 与二级 terminal tab，但用户只能通过鼠标点击侧边导航切换活跃终端。频繁在多个终端任务之间切换时，缺少键盘入口会打断开发流。

本次变更为 terminal tab 增加上一项 / 下一项快捷键，让用户可以用 `Command + Shift + [` 和 `Command + Shift + ]` 在终端 tab 间快速切换。

## What Changes

- 新增两个应用级快捷键动作：
  - 上一个 terminal tab，默认 `Command + Shift + [`
  - 下一个 terminal tab，默认 `Command + Shift + ]`
- 两个动作进入现有快捷键设置面板，支持与现有动作一致的录入、校验、保存和重启恢复。
- terminal 面板接入两个新动作，按左侧导航从上到下的二级 terminal tab 顺序循环切换活跃终端。
- 当只有一个 terminal tab 时，触发上一项 / 下一项快捷键不改变当前活跃终端。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `keyboard-shortcuts`: 增加上一项 / 下一项 terminal tab 的默认快捷键定义、配置持久化与冲突校验覆盖范围。
- `terminal-tabs`: 增加通过快捷键在二级 terminal tab 之间循环切换的行为要求。

## Impact

- 主要影响 `src/ShortcutContext.tsx`：新增动作 ID、动作声明、默认绑定，以及对 `[` / `]` 这类单字符主键的规范化支持验证。
- 影响 `src/components/TerminalPanel.tsx`：注册上一项 / 下一项 terminal tab 动作，并基于当前 workspace 树计算切换目标。
- 影响 `src/components/SettingsPanel.tsx`：快捷键列表会随动作定义增加而自动展示新项，同时需要更新快捷键说明文案。
- 不新增依赖，不修改主进程 IPC，不改变 PTY 会话生命周期。
