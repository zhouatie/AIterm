## Why

AIterm 当前顶部栏已经承载文件树、主题、Live View 和更新检查等常用入口，但缺少开发者日常高频文本工具。把 JSON 格式化、通用二维码生成和 Mermaid 图表预览放进顶部功能区，可以让用户在不离开工作台、不切换外部网页的情况下快速处理终端或文件中的片段。

## What Changes

- 在标题栏新增一个“工具” icon-only 入口，并遵循现有 hover、tooltip 和拖拽区避让规则。
- 新增统一的开发者工具面板，点击工具入口时打开面板，并在面板内通过工具标签切换 JSON、二维码和 Mermaid。
- 工具面板使用更大的工作区尺寸，优先保证 Mermaid 图表预览可读。
- JSON 工具支持格式化、压缩、错误提示和复制输出。
- 二维码工具支持对用户输入的任意文本生成二维码，并复用现有 `qrcode` 依赖。
- Mermaid 工具支持输入 Mermaid 源码并渲染图表预览，渲染失败时展示错误。
- 工具面板关闭后保留本次输入和结果状态，重新打开时继续显示上次内容。

## Capabilities

### New Capabilities
- `utility-tools`: 覆盖顶部单一工具入口、统一工具面板，以及 JSON 格式化、二维码生成、Mermaid 图表预览的用户行为。

### Modified Capabilities
- `panel-layout`: 标题栏将增加一个工具入口，要求保持窗口 chrome 视觉一致性、按钮可点击性和拖拽区域可用性。

## Impact

- 影响渲染层 UI：`src/App.tsx` 顶部栏入口、一个新的工具面板组件，以及必要的样式。
- 复用现有依赖：`lucide-react` 用于按钮图标，`qrcode` 用于二维码 SVG 生成。
- 新增前端依赖：`mermaid` 用于本地 Mermaid 图表渲染。
- 不影响主进程 IPC、PTY 生命周期、终端 tab 状态或文件预览读写链路。
- 不引入新的应用级快捷键；工具入口通过顶部 icon 打开。
