## Why

长 Markdown 文档在预览区内只能依靠滚动或查找定位内容，用户很难快速理解文档结构并跳转到目标章节。为 Markdown 预览补充可悬浮展开的标题树，可以把预览区从单纯阅读升级为更高效的文档导航入口。

## What Changes

- 在 Markdown 预览区域左侧新增一个悬浮标题树入口。
- 当用户将鼠标移动到入口或标题树区域时，标题树展开显示当前 Markdown 文档的不同级别标题。
- 标题树按 `h1` 到 `h6` 层级缩进展示，保持与实际渲染结果一致。
- 用户点击标题树中的标题后，预览区滚动定位到对应标题。
- 仅 Markdown 文件预览显示标题树；非 Markdown 文件预览保持现状。
- 无标题的 Markdown 文档不显示标题树入口，避免空浮层占用界面。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `file-preview`: Markdown 文件预览增加基于当前文档标题结构的悬浮标题树和点击跳转能力。

## Impact

- 影响 `src/components/MarkdownPreview.tsx`：需要收集渲染后的标题节点、展示悬浮标题树，并处理标题点击滚动。
- 可能影响 `src/index.css` 或组件内样式：需要补充标题树入口、展开面板、层级缩进、hover/focus 状态等视觉样式。
- 不需要新增主进程 IPC、文件系统 API 或外部依赖。
- 需要验证现有 Markdown 渲染、GFM checkbox 写回、预览区查找和非 Markdown 代码预览不受影响。
