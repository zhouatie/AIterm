## Why

OpenSpec 和 RavenSpec 的任务文档已经是用户拆解实现工作的主要入口，但在预览 `tasks.md` / `TASK.md` 时，用户仍需要手工复制 change 名称、选择 apply skill，并补充任务范围。这个流程容易选错 workflow 或遗漏任务范围，尤其是只想执行某个 task item 或某个 task group 的未完成任务时。

需要在受支持的 SDD 任务文档预览中提供显式 Apply 控件，让用户可以从任务项或任务组直接生成带范围说明的 agent payload，并沿用现有高风险确认流程后再写入 terminal。

## What Changes

- 在 Markdown 预览中识别受支持的 SDD 任务文档：OpenSpec 的 `openspec/changes/<change>/tasks.md` 与 RavenSpec 的 `ravenspec/changes/<change>/TASK.md`。
- 仅在上述任务文档中展示 Apply 控件，普通 Markdown 文件不展示。
- 为未完成 task item 提供 Apply 控件，用于生成只执行该任务项的 payload。
- 为存在未完成任务的 task group 提供 Apply 控件，用于生成执行该组内所有未完成任务的 payload。
- 已完成 task item 与已全部完成的 task group 不作为可立即 apply 的目标。
- OpenSpec payload 使用 `$openspec-apply-change <change>`，RavenSpec payload 使用 `$sdd-apply-change <change>`，并附带明确任务范围说明。
- Apply 属于高风险动作，点击后必须进入现有确认/编辑 payload 流程，不直接写入 terminal。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `file-preview`: Markdown 预览在受支持的 SDD 任务文档中展示 scoped Apply 控件，并将用户选择的 task item / task group 交给外层处理。
- `sdd-command-router`: 支持从已确定 workflow、change 与任务范围生成 apply payload，并沿用高风险确认式 terminal 写入语义。

## Impact

- 影响 Markdown 预览渲染：`src/components/MarkdownPreview.tsx` 需要渲染任务组/任务项 Apply 控件并保持 checkbox 写回行为。
- 影响文件预览容器：`src/components/FilePreviewPanel.tsx` 需要根据当前文件路径识别 workflow/change，构造确认 payload，并复用 terminal 输入流程。
- 可能影响或新增 Markdown task 解析工具：`src/utils/markdown-task.ts` 用于识别任务组、任务项、完成状态和源码位置。
- 影响 SDD payload 生成逻辑：`src/utils/sdd-command-router.ts` 需要支持带范围说明的 apply payload。
- 不新增主进程直接执行 OpenSpec/RavenSpec CLI 的路径，不绕过现有高风险确认界面。
