## Why

Markdown 预览区目前支持阅读、标题导航、内容查找和任务 checkbox 写回，但用户无法对预览中的具体文本做轻量批注。为预览区增加“划线评论”能力，可以让用户在不进入完整 Markdown 编辑器、不改写正文的前提下记录局部反馈、问题和阅读笔记。

## What Changes

- Markdown 预览支持用户选择一段可见文本后创建评论。
- 已评论文本在预览中显示划线或等效批注标记，并提供可点击的评论入口。
- 用户可以查看、编辑、删除当前文件的评论。
- 评论数据通过项目根目录下的独立旁路文件保存，不直接写入源 Markdown 正文。
- 评论锚点在 Markdown 重新渲染、文件切换和应用重启后应尽量恢复到对应文本；无法恢复时应保留评论并标记为未定位。
- 非 Markdown 代码预览、文件树浏览、预览查找、标题树导航和 GFM checkbox 写回保持现有行为。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `file-preview`: Markdown 文件预览增加基于文本选区的划线评论、评论标记展示、评论 CRUD 和评论数据持久化要求。

## Impact

- 影响渲染层文件：`src/components/FilePreviewPanel.tsx`、`src/components/MarkdownPreview.tsx`、可能新增评论面板/弹层组件与评论锚点工具模块。
- 影响主进程与 preload：新增用于读取和保存项目级 Markdown 预览评论数据的受控 IPC/API。
- 影响样式：新增评论划线、高亮、边缘标记、编辑弹层等主题适配样式。
- 影响 OpenSpec delta：`file-preview`。
- 不引入完整 Markdown 编辑器、协作同步、线程回复或源文件内联批注格式。
