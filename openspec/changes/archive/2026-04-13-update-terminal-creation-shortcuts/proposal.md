## Why

当前 terminal 面板已经支持通过鼠标创建新的 workspace、在某个 workspace 下新增二级 terminal tab、重命名 workspace，以及关闭单个二级 tab，但这些操作缺少完整的键盘入口，且 `Command + T` 仍然绑定“新增 workspace”，与双层导航的实际心智不一致。随着 workspace / 二级 tab 结构成为终端主导航，创建、重命名和关闭动作都需要明确的快捷键分工，才能让终端管理真正脱离鼠标操作。

## What Changes

- 将“新增 workspace”默认快捷键从 `Command + T` 调整为 `Command + N`，行为保持等同于 terminal 导航右上角的 `+`
- 新增“在当前激活 workspace 下新增 terminal tab”动作，默认快捷键为 `Command + T`
- 新增“重命名当前 workspace”动作，默认快捷键为 `Command + Shift + R`
- 新增“重命名当前二级 terminal tab”动作，默认快捷键为 `Command + R`
- 新增“关闭当前二级 terminal tab”动作，默认快捷键为 `Command + W`
- 新增“关闭当前 workspace”动作，默认快捷键为 `Command + Shift + W`
- 当前二级 terminal tab 支持手动重命名，且手动名称会覆盖自动基于 `cwd/git branch` 的命名结果
- 设置面板中的快捷键配置项同步更新，允许用户查看、修改并保存这些终端管理动作的绑定
- terminal 面板接入创建、重命名和关闭快捷键，并尽量复用现有鼠标 `+`、重命名输入态和关闭按钮的行为语义
- 保持现有 terminal tab 切换、侧边栏显隐和文件树显隐快捷键不变

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `keyboard-shortcuts`: 调整终端创建类动作的默认绑定，并新增 terminal 的创建、重命名、关闭动作定义
- `terminal-tabs`: 增加通过快捷键创建、重命名、关闭当前 terminal 上下文的行为，并允许二级 terminal tab 手动重命名覆盖自动命名
- `settings-panel`: 快捷键配置区需要展示并保存新的终端管理动作列表

## Impact

- 主要影响 `src/ShortcutContext.tsx`：新增 rename / close 相关动作 ID、文案和默认绑定，并将 `create-workspace` 默认值改为 `Meta+N`
- 影响 `src/components/TerminalPanel.tsx`：注册创建、重命名、关闭当前 workspace / terminal tab 的快捷键，并补充二级 tab 手动命名覆盖逻辑
- 影响 `src/components/SettingsPanel.tsx`：更新快捷键说明文案，并确保新增动作自动出现在配置列表中
- 需要同步修改 `openspec/specs/keyboard-shortcuts/spec.md`、`openspec/specs/terminal-tabs/spec.md` 与 `openspec/specs/settings-panel/spec.md` 的行为要求
