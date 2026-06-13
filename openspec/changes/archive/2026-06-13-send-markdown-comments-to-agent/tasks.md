## 1. 注入内容格式化

- [x] 1.1 新增 Markdown 评论发送 formatter，输入 `rootPath`、当前文件路径和评论列表，输出稳定的 agent payload。
- [x] 1.2 formatter 为每条评论生成 `@相对文件路径`、评论 ID、`selected_text`、`comment`、`workflow` 和 `change`。
- [x] 1.3 支持从 `openspec/changes/<name>/` 与 `ravenspec/changes/<name>/` 路径推断 workflow/change。
- [x] 1.4 处理评论正文和被评论原文中的 Markdown fence，避免注入内容破坏块边界。
- [x] 1.5 为单条评论和多条评论生成相同结构的 payload，使用 bracketed paste 包裹多行内容且不追加提交用回车。

## 2. 评论面板发送交互

- [x] 2.1 在评论详情中增加“发送给 agent”按钮，将当前 active comment 注入当前活跃 terminal tab。
- [x] 2.2 在评论列表项中提供单条发送入口，避免必须先打开详情才能发送。
- [x] 2.3 为评论列表增加多选能力，允许用户选中多条评论。
- [x] 2.4 在评论面板 header 或列表工具区增加“发送选中评论”按钮，仅在存在选中项时可用。
- [x] 2.5 发送后展示轻量成功反馈；发送失败时展示错误，不清空评论或选中状态。

## 3. Terminal 注入链路

- [x] 3.1 在 `FilePreviewPanel` 中复用 `activeSessionId` 判断当前是否存在可用 terminal session。
- [x] 3.2 调用 `window.terminalApi.input(activeSessionId, payload)` 将格式化内容写入当前活跃 PTY。
- [x] 3.3 当前无 active session 时禁用发送按钮或展示明确错误。
- [x] 3.4 确保发送动作不触发 Markdown 文件写入、不调用评论保存 API、不改变评论持久化数据。

## 4. 样式与可用性

- [x] 4.1 为评论条多选 checkbox、发送图标按钮和选中状态补充紧凑样式。
- [x] 4.2 按钮使用 lucide 图标并提供 `title` / `aria-label`，保持键盘 focus 样式可见。
- [x] 4.3 确保评论面板在窄预览区域内不会因为新增按钮导致文本溢出或控件重叠。
- [x] 4.4 发送反馈使用现有评论错误/提示区域或等效轻量提示，不新增遮挡正文的大弹层。

## 5. 回归验证

- [x] 5.1 手动验证：单条评论发送到当前 Codex terminal 后，终端收到包含 `@文件路径`、原文和评论正文的 payload。
- [x] 5.2 手动验证：多选评论发送后，终端收到多条 `<aiterm-comment>` 块且顺序与评论列表一致。
- [x] 5.3 手动验证：OpenSpec change 文件评论能推断 `workflow="openspec"` 与正确 change 名称。
- [x] 5.4 手动验证：Raven change 文件评论能推断 `workflow="raven"` 与正确 change 名称。
- [x] 5.5 手动验证：当前无 active terminal 时，发送按钮不可用或展示错误，评论数据不丢失。
- [x] 5.6 手动验证：创建、查看、编辑、删除评论、标题树导航、预览查找和 GFM checkbox 写回保持现有行为。
- [x] 5.7 运行项目现有校验命令，确认 TypeScript/构建不引入回归。
