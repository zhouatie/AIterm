## Why

当前左侧工作区的模式切换以 Files 在前，容易让 OpenSpec 工作流入口不够突出。将 OpenSpec 调整为默认入口并放在 Files 前面，可以让正在使用 SDD/OpenSpec 的用户启动后优先看到 change 状态和下一步。

## What Changes

- 左侧工作区模式切换入口的顺序调整为 `OpenSpec / Files`。
- 应用启动或左侧工作区首次渲染时，默认选中 `OpenSpec` 模式。
- 用户仍可切换到 `Files` 模式，现有文件树和文件预览能力不移除。
- 不引入新的外部依赖、API 或兼容性分支。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `sdd-workflow-panels`: 左侧工作区模式切换的展示顺序和默认激活模式从 Files 优先调整为 OpenSpec 优先。
- `panel-layout`: 应用启动时左栏默认内容需与 OpenSpec 默认模式保持一致，不再要求默认显示文件预览面板。

## Impact

- 影响左侧工作区 tab/segment 控件的配置顺序与初始状态。
- 影响应用启动后左栏默认展示内容。
- 需要确认相关 UI 状态初始化、持久化逻辑和测试断言不再默认依赖 Files 模式。
