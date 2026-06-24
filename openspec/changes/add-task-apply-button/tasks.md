## 1. 任务解析与上下文识别

- [ ] 1.1 扩展 `markdown-task` 工具，解析 task item 的完成状态、正文、行号、序号、层级和所属 heading group。
- [ ] 1.2 为 OpenSpec `tasks.md` 与 RavenSpec `TASK.md` 增加路径识别逻辑，产出 workflow、changeName 与 taskFilePath。
- [ ] 1.3 添加 focused 测试覆盖 task item、已完成任务、heading group 和非 SDD Markdown 路径。

## 2. Scoped Apply Payload 与确认流程

- [ ] 2.1 在 SDD payload 生成逻辑中支持 scoped apply target，生成 OpenSpec `$openspec-apply-change <change>` 与 RavenSpec `$sdd-apply-change <change>` payload。
- [ ] 2.2 让 task item payload 明确只执行所选 task item，task group payload 明确只执行该组内所有未完成 task item。
- [ ] 2.3 在 `FilePreviewPanel` 中接入高风险确认/编辑 payload 流程，确认前不写入 terminal，当前无 active terminal 时保留草稿并展示反馈。

## 3. Markdown 预览 Apply 控件

- [ ] 3.1 在 `MarkdownPreview` 中为受支持任务文档的未完成 task item 渲染 Apply 控件，并保持 checkbox 写回行为不变。
- [ ] 3.2 在 `MarkdownPreview` 中为存在未完成任务的 heading group 渲染 Apply 控件，全部完成的 group 不展示立即 Apply。
- [ ] 3.3 确保普通 Markdown 文件不展示 task Apply 控件，评论、查找、标题树和代码块复制行为不受影响。

## 4. 验证与收尾

- [ ] 4.1 运行 focused 测试或构建检查，确认解析、payload 和 UI 编译通过。
- [ ] 4.2 审查实现与 OpenSpec delta 的一致性，修正缺口并更新任务状态。
