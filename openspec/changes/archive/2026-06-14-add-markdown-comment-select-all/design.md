## Context

当前 Markdown 评论面板已经在 `FilePreviewPanel` 中维护 `selectedCommentIds`，并基于该状态支持逐条勾选、发送选中评论和删除选中评论。评论列表工具栏只显示已选数量和批量操作按钮，缺少“选中全部当前文件评论”的入口。

这次变更只补齐评论列表的批量选择交互。评论数据、锚点恢复、agent payload、持久化 API 和 Markdown 源文件写回都不需要变化。

## Goals / Non-Goals

**Goals:**

- 在当前 Markdown 文件评论列表中提供清晰的全选/取消全选控制。
- 支持三种视觉/语义状态：未选中、部分选中、已全选。
- 全选范围只覆盖当前文件已加载的评论，且包含已定位和未定位评论。
- 保持现有发送选中、删除选中、逐条勾选和评论详情查看行为不变。

**Non-Goals:**

- 不新增跨文件评论选择或跨文件批量发送。
- 不新增 `Cmd+A` / `Ctrl+A` 快捷键，避免和文本输入、系统文本选择、Markdown 正文选择冲突。
- 不改变 `.aiterm/markdown-preview-comments.json` 数据结构。
- 不改变 agent payload 生成规则或 terminal 输入链路。

## Decisions

### 决策 1：全选状态从当前评论列表派生

选择：继续以 `selectedCommentIds` 作为选择状态源，新增派生状态：

- `allCommentsSelected`: 当前文件评论数大于 0，且选中数量等于评论数量。
- `someCommentsSelected`: 选中数量大于 0，且未达到全选。
- `selectedComments`: 继续由当前 `markdownComments` 过滤得到，避免旧 ID 参与批量操作。

理由：

- 当前组件已经用 `selectedCommentIds` 驱动逐条复选框、发送选中和删除选中。
- 派生全选状态不需要新增持久化字段，也不会污染评论数据。
- 从 `markdownComments` 过滤可自然限制范围为当前文件。

替代方案：为评论列表维护单独的 `selectAll` 布尔值。否决原因是评论新增、删除、发送后清空选择、切换文件等状态变化会让布尔值和实际选中 ID 容易不一致。

### 决策 2：使用三态 checkbox 作为工具栏全选控制

选择：在评论列表工具栏左侧增加 checkbox 控制。未选中表示当前无选中评论，部分选中时设置 checkbox 的 `indeterminate` DOM 属性，已全选时显示 checked。点击控制时：

- 已全选：清空 `selectedCommentIds`。
- 未全选或部分选中：将当前 `markdownComments` 的所有 ID 写入 `selectedCommentIds`。

理由：

- 列表每行已经使用 checkbox 表达“选择评论”，工具栏全选也使用 checkbox 能保持一致。
- 三态 checkbox 是列表选择的常见模式，能直接表达“部分选中”。
- 相比文本按钮，占用更小，也更适合工具栏当前紧凑布局。

替代方案：新增“全选/取消全选”文本按钮。否决原因是和现有 checkbox 选择模型不一致，并会挤压“发送选中”“删除”按钮空间。

### 决策 3：不引入快捷键

选择：本阶段只提供可点击控件，不为评论列表注册 `Cmd+A` / `Ctrl+A`。

理由：

- 应用内已有全局快捷键系统以 `Meta` 组合键为主，`Cmd+A` 是平台级文本选择习惯。
- 评论面板中存在 textarea、查找框、Markdown 正文选区等上下文，直接拦截全选快捷键容易破坏用户预期。
- 当前需求可以通过明显的工具栏控件满足。

## Risks / Trade-offs

- [Risk] React 不直接通过 JSX 属性控制 checkbox 的 `indeterminate` 状态 → Mitigation: 使用 ref 或 callback ref 在渲染后设置 DOM 属性，并同步 `aria-checked="mixed"`。
- [Risk] 工具栏空间较窄时新增控件挤压按钮 → Mitigation: 使用紧凑 checkbox+短文本布局，必要时让状态文本截断，批量操作按钮保持固定宽度。
- [Risk] 评论删除或发送后旧选中 ID 残留 → Mitigation: 批量操作继续从 `markdownComments` 派生 `selectedComments`；删除成功后清空选择，发送成功后移除已发送 ID。
- [Risk] 用户误以为全选会跨文件生效 → Mitigation: 工具栏文案和 aria-label 明确为当前列表/当前文件评论。
