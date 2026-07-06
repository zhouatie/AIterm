## Why

部分 Markdown 文件会在顶部使用 YAML front matter 作为文档属性，例如 skill 文档中的 `name`、`description`、`metadata` 等。当前 Markdown 预览会把这段内容按普通 Markdown 语法处理，容易显示成横线、正文或样式突兀的内容，导致文档顶部可读性差。

需要让顶部文档属性在预览中以独立、紧凑、可读的属性块呈现，同时保持正文 Markdown 渲染、评论、查找和任务交互不受影响。

## What Changes

- Markdown 预览识别文档开头的 YAML front matter 块，仅当文件以 `---` 起始并存在闭合 `---` 时生效。
- 顶部文档属性以专门样式展示，避免被渲染成普通横线或散乱正文。
- front matter 之后的正文继续按现有 Markdown/GFM 能力渲染。
- front matter 展示不改写源文件，不影响任务 checkbox 写回、代码块复制、Mermaid、标题树、预览查找和评论能力。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `file-preview`: Markdown 文件预览需要支持顶部 YAML front matter 的专门识别与属性块展示。

## Impact

- 受影响代码：`src/components/MarkdownPreview.tsx`、`src/index.css`。
- 受影响规格：`openspec/specs/file-preview/spec.md`。
- 不新增运行时依赖；可使用现有前端代码完成解析和渲染。
