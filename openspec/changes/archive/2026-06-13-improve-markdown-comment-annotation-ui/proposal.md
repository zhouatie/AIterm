## Why

Markdown 预览划线评论目前把“添加评论”和“查看评论”的浮动 icon 放在选中文本或已评论文本首行的右侧。这个定位会在选区后方仍有正文时遮挡相邻文案，特别是在中文段落、长标题和窄预览区域中影响阅读。评论入口属于附加交互，不应侵入 Markdown 正文的排版和阅读流。

需要把评论交互拆成更清晰的两类：选中文本后的临时创建工具条，以及已存在评论的右侧批注边栏标记。这样用户能继续通过划线高亮理解评论锚点，同时评论 icon 不再覆盖正文。

## What Changes

- 将选中文本后的“添加评论”入口改为 selection toolbar，浮在选区上方或下方，不跟随选区末尾插入到正文行内。
- 将已有评论的可点击标记移动到 Markdown 预览右侧 annotation gutter，按评论锚点的纵向位置对齐。
- 点击评论标记、评论列表项或等效评论入口时，Markdown 预览应滚动到对应评论锚点位置。
- 为 Markdown 正文和 gutter 预留布局空间，确保评论标记不遮挡正文、查找框、标题树入口或评论面板。
- 在预览区域过窄或无法安全显示 gutter 时，隐藏行旁评论标记，保留划线高亮和右上角评论面板入口作为等效入口。
- 保持现有评论数据模型、锚点恢复、持久化、评论 CRUD、预览查找、标题树导航和 GFM checkbox 写回行为不变。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `file-preview`: 优化 Markdown 预览划线评论的创建入口和已评论标记位置，要求评论 UI 不遮挡正文阅读内容。

## Impact

- 影响渲染层文件：`src/components/MarkdownPreview.tsx` 和 `src/utils/markdown-comment-anchors.ts` 中的评论操作入口、标记坐标计算与激活评论滚动定位。
- 影响上层编排：`src/components/FilePreviewPanel.tsx` 中可能需要向 MarkdownPreview 传递评论面板可见状态、窄布局状态或评论选中意图。
- 影响样式：`src/index.css` 中新增或调整 selection toolbar、annotation gutter、gutter marker 和响应式隐藏规则。
- 影响 OpenSpec delta：`file-preview`。
- 不改变评论持久化格式，不迁移 `.aiterm/markdown-preview-comments.json`，不改写源 Markdown 文件。
