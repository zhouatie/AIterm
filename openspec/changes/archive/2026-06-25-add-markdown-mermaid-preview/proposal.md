## Why

Markdown 预览目前会把 `mermaid` fenced code block 当普通代码块展示，用户在左侧预览中无法直接查看图表结果。项目已经引入本地 `mermaid` 渲染能力，应在 Markdown 预览中复用该能力，让文档中的图表代码直接呈现为图表。

## What Changes

- 在 Markdown 文件预览中识别语言标识为 `mermaid` 的 fenced code block。
- 将有效 Mermaid 图表代码渲染为 SVG 图表，而不是普通高亮代码块。
- 渲染失败时在预览区展示失败反馈，并保留图表源码便于用户排查。
- Markdown 预览和 Mermaid 工具中的图表支持点击进入全屏查看。
- 全屏查看时支持使用鼠标滚轮放大或缩小图表。
- 全屏查看支持在图表模式和源码模式之间切换，便于查看复杂时序图源码。
- 全屏查看默认按可用宽高等比适配图表，使图表尽量撑满查看区域且不变形。
- 全屏查看默认适配基于 Mermaid SVG 的可见内容边界，避免因 SVG 大画布或空白 viewBox 导致图表过小。
- 全屏查看中的图表 / 源码切换控件点击命中区域与视觉按钮保持一致，避免点击位置偏移。
- 全屏查看右上角工具栏中的图表、源码、复制、关闭四个控件整个可见按钮区域都可点击。
- 全屏查看支持一键复制当前模式内容：图表模式复制 SVG，源码模式复制 Mermaid 源码。
- 全屏查看中的缩放百分比固定在全屏容器右下角，关闭按钮保持在右上角。
- 保持普通代码块高亮、复制按钮、任务 checkbox、评论、查找和标题导航等既有 Markdown 预览行为不变。

## Capabilities

### New Capabilities

### Modified Capabilities
- `file-preview`: Markdown 文件预览需要支持 Mermaid fenced code block 的图表渲染。
- `utility-tools`: Mermaid 图表预览工具需要支持图表全屏查看和滚轮缩放。

## Impact

- 影响代码：`src/components/MarkdownPreview.tsx`、`src/components/UtilityToolsPanel.tsx`、`src/index.css`。
- 依赖：复用现有 `mermaid` 前端依赖，不引入新依赖。
- 行为：改变 Markdown 预览中 `mermaid` 代码块的展示方式，并增强 Mermaid 工具预览图表查看能力；普通代码块和非 Markdown 文件预览不受影响。
