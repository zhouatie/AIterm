## Why

Markdown 预览评论目前只停留在 AIterm 内部的阅读批注层。用户在 review OpenSpec、Raven 或其他 Markdown 文档时，已经可以把修改意见锚定到具体文本，但后续仍需要手工把文件路径、原文和评论内容复制到 Codex 等 agent 终端中。这个转换过程容易漏掉上下文，也会让多条评论的处理边界变得不清楚。

需要为评论条增加“发送给 agent”的显式动作：用户点击单条评论或多选评论后，AIterm 将结构化评论内容注入当前活跃 terminal tab。若该 tab 中运行的是 Codex，Codex 就能直接按注入内容读取对应文件、定位评论原文，并决定更新 spec 或代码。

## What Changes

- 在 Markdown 评论面板中为评论条提供发送给 agent 的按钮。
- 支持多选评论，并对选中评论执行批量发送或批量删除。
- 注入内容使用稳定的文本块格式，每条评论都包含 `@相对文件路径`、评论 ID、被评论原文、评论正文，以及可推断的 workflow/change 信息。
- 发送目标使用当前活跃 terminal session，不硬编码 Codex；用户可以把当前 tab 用作 Codex、Claude Code、OpenCode 或其他兼容 agent。
- 发送成功后在评论面板内提供轻量反馈；若当前无可用 terminal session 或写入失败，展示错误并保留评论状态。
- 不改变 Markdown 评论持久化格式，不把发送状态写入 `.aiterm/markdown-preview-comments.json`。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `file-preview`: Markdown 预览评论支持将单条或多条评论作为结构化上下文发送到当前活跃 agent terminal。

## Impact

- 影响渲染层文件：`src/components/FilePreviewPanel.tsx` 中的评论列表、评论详情、选中状态和发送动作。
- 可能新增工具模块：用于将 `MarkdownPreviewComment` 格式化为 agent 注入文本，并从文件路径推断 `openspec` / `raven` workflow 与 change 名称。
- 复用现有 preload API：通过 `window.terminalApi.input(activeSessionId, payload)` 向当前活跃 PTY 写入内容。
- 影响样式：`src/index.css` 中新增或调整评论条多选、发送按钮、发送状态反馈样式。
- 不新增主进程 IPC，不改变终端 PTY 输入链路，不修改评论 JSON 数据结构。
