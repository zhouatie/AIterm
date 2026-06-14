## Why

Markdown 文件预览里的代码块目前只能手动选中复制，长代码或包含缩进的内容容易选错。为 fenced code block 增加一键复制，可以让用户快速复用文档中的命令、配置和代码片段。

## What Changes

- Markdown 文件预览中的 fenced code block 显示复制按钮。
- 用户点击复制按钮后，系统将该代码块的代码内容写入系统剪贴板。
- 复制内容只包含代码本体，不包含 Markdown fence、语言标识或复制按钮文本。
- 复制按钮不改变现有 Markdown 渲染、代码高亮、GFM checkbox 写回、评论选区、标题树导航和预览查找行为。
- 不支持终端输出中的 ``` 代码块复制，也不扩展非 Markdown 代码文件预览。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `file-preview`: Markdown 文件预览中的 fenced code block 需要支持一键复制代码内容。

## Impact

- 受影响实现：`src/components/MarkdownPreview.tsx`、`src/index.css`。
- 受影响行为：Markdown 文件预览中代码块的可操作控件、剪贴板写入、代码块布局与 hover/focus 状态。
- 不影响主进程 IPC、preload API、文件树扫描、非 Markdown 代码文件预览、终端输出渲染或评论数据格式。
