## Why

当前应用的很多高频操作已经通过 icon-only 按钮承载，但这些按钮的 hover 提示并不完整，也没有统一规则。随着快捷键系统已经支持配置和持久化，用户在鼠标悬停按钮时仍看不到对应的当前快捷键，会让“按钮行为”和“键盘入口”之间的信息割裂越来越明显。

## What Changes

- 新增一套统一的 icon 按钮 hover 提示能力，覆盖应用内现有 icon-only 操作按钮
- 约定所有 icon-only 按钮在 hover 时都要提供功能说明，避免只靠图形猜测按钮用途
- 对存在应用级快捷键绑定的按钮，在功能说明后统一追加当前生效快捷键，例如 `收起文件树（Command + S）`
- 约定 tooltip 文案优先复用共享动作元数据或统一 helper 生成，避免各组件各自硬编码导致改绑后提示失真
- 明确本次不扩展到非 icon 按钮，也不引入自定义浮层 tooltip 组件

## Capabilities

### New Capabilities
- `icon-button-tooltips`: 统一定义 icon-only 按钮的 hover 提示规则，以及快捷键后缀的展示方式

### Modified Capabilities

## Impact

- 受影响代码主要包括 `src/App.tsx`、`src/components/FileTree.tsx`、`src/components/TerminalPanel.tsx`、`src/components/SettingsPanel.tsx`
- 需要补充一层共享的 tooltip 文案生成逻辑，并与 `src/ShortcutContext.tsx` 中现有动作定义和快捷键格式化能力衔接
- 需要梳理当前哪些按钮属于 icon-only 操作按钮，并统一它们的 tooltip 来源与命名规则
