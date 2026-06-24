## Context

文件预览面板已经能读取并渲染 Markdown，`MarkdownPreview` 负责 GFM task checkbox 写回、代码块复制、标题树和评论交互；`FilePreviewPanel` 持有 `rootPath`、`selectedFile`、`fileContent`、`activeSessionId` 等上下文，并负责文件读取、任务 checkbox 写回和评论发送。

SDD 命令模型已经存在 workflow provider 与确认式 terminal 写入：`apply` 属于高风险 action，必须先展示确认/编辑 payload UI，再由用户确认写入 terminal。RavenSpec apply 已映射到 `$sdd-apply-change <change>`，OpenSpec apply 映射到 `$openspec-apply-change <change>`。

这次能力的关键约束是：任务文档内的 Apply 按钮只能作为生成 scoped agent payload 的入口，不得从渲染层直接执行 CLI，也不得绕过高风险确认。

## Goals / Non-Goals

**Goals:**

- 只在受支持的 SDD 任务文档中展示 Apply 控件。
- 支持对单个未完成 task item 生成 scoped apply payload。
- 支持对 task group 中所有未完成 task item 生成 scoped apply payload。
- 对已完成 task item 和无未完成任务的 task group 不提供立即 apply 操作。
- 复用现有 SDD workflow payload 和高风险确认式 terminal 写入流程。
- 保持 Markdown task checkbox 写回行为、评论行为、标题树和查找行为不变。

**Non-Goals:**

- 不新增直接执行 OpenSpec/RavenSpec CLI 的 UI 路径。
- 不实现 task 执行状态追踪，也不根据 agent 输出自动勾选任务。
- 不支持普通 Markdown 文件中的 Apply 按钮。
- 不改变 OpenSpec/RavenSpec artifact 文件命名规则。
- 不扩展 apply skill 本身；本变更只补充 payload 中的范围说明。

## Decisions

### 决策 1：路径决定是否启用 SDD task Apply

**选择**：`FilePreviewPanel` 基于 `rootPath` 与 `selectedFile` 得到项目相对路径，只识别：

- `openspec/changes/<change>/tasks.md`
- `ravenspec/changes/<change>/TASK.md`

识别结果包含 `workflow`、`changeName`、`taskFilePath`，并作为 prop 传给 `MarkdownPreview`。

**理由**：

- 路径规则是两种 workflow 的 artifact 契约，不需要额外 CLI 查询。
- 在容器层识别可避免 `MarkdownPreview` 依赖项目根路径或 terminal session。
- 普通 Markdown 文件天然不会收到 apply 上下文，从源头避免误显示。

**替代方案**：在 `MarkdownPreview` 内部自行解析文件路径。否决原因是预览组件会承担过多工作区上下文，不利于保持展示组件边界。

### 决策 2：MarkdownPreview 只渲染并回传 task target

**选择**：`MarkdownPreview` 接收可选的 task apply target 列表或解析上下文，渲染 task item / group 的 Apply 按钮；点击后回调 `onTaskApply(target)`，target 包含类型、标题/正文、行号或稳定 task index、所属 group 信息。

**理由**：

- 预览组件已经拥有渲染出的 Markdown 结构，适合把按钮放到正确节点附近。
- 回调数据保持 UI 语义，不携带 terminal session 或 skill 命令。
- checkbox 的 `taskIndex` 写回逻辑可以继续独立工作。

**替代方案**：在 Markdown AST 渲染前把按钮注入源 Markdown。否决原因是会污染源文档模型，并且容易干扰 checkbox 写回定位。

### 决策 3：任务解析使用源 Markdown 的轻量结构化结果

**选择**：在 `src/utils/markdown-task.ts` 中新增或扩展解析函数，从源码中识别：

- task item 的完成状态、正文、行号、层级、序号；
- task group heading 的标题、层级、起止行；
- group 下未完成 task item 列表。

渲染层以该结果判断哪些 task item/group 可 apply。

**理由**：

- 源 Markdown 是 line number 与 checkbox 状态的事实来源。
- group apply 必须知道 heading 管辖范围内未完成任务，单靠 React 渲染节点难以可靠得到。
- 复用 `markdown-task.ts` 可以把 checkbox 与 apply 的任务识别规则集中维护。

**替代方案**：直接遍历 DOM 寻找 checkbox 与 heading。否决原因是 DOM 不保留源码行号，嵌套列表和 heading 范围判断不稳定。

### 决策 4：payload 生成仍归属于 SDD router 语义

**选择**：为已确定 workflow/change/action/scope 的调用提供 payload builder，生成：

- OpenSpec：`$openspec-apply-change <change>`
- RavenSpec：`$sdd-apply-change <change>`

并追加明确范围说明，例如只执行选中的 task item，或只执行某 task group 内未完成任务。

**理由**：

- 保持 Dashboard、命令入口和任务文档按钮对 workflow 命令的理解一致。
- payload 是给 agent 的 skill 触发文本，不是 UI 直接执行 CLI。
- scope 说明解决 apply skill 默认 change-level 的边界问题。

**替代方案**：在 `FilePreviewPanel` 手写完整 command 字符串。否决原因是会复制 provider 映射，后续 Raven/OpenSpec 命令名变化时容易分叉。

### 决策 5：点击 Apply 后打开确认/编辑 UI

**选择**：`FilePreviewPanel` 点击 task apply 后构造高风险 SDD action 的确认状态，展示当前 workflow、change、scope 和可编辑 payload；用户确认后才写入 active terminal session 并执行。

**理由**：

- `apply` 已被定义为高风险 action，不能一键直写 terminal。
- task item/group scope 是自然语言说明，用户应有机会编辑。
- 当前无 active terminal 时，应保留 payload 草稿并展示错误，而不是丢失用户选择。

**替代方案**：按钮点击后直接粘贴到 terminal 输入框。否决原因是绕过高风险确认，且用户无法在发送前修正范围文本。

## Risks / Trade-offs

- [Risk] Markdown heading 与 task list 的组合形式很多，group 识别可能过宽或过窄 -> Mitigation: group 只以 heading 层级边界计算，未归属 heading 的任务只提供 item Apply。
- [Risk] task item 文本很长，按钮附近 UI 可能拥挤 -> Mitigation: 使用紧凑图标/短文字按钮，长范围说明只出现在确认 payload 中。
- [Risk] apply skill 仍可能执行整个 change -> Mitigation: payload 明确写入“只执行所选 task item/group”的范围说明，由确认界面允许用户编辑。
- [Risk] 普通 Markdown 文件路径类似 task 文档但不属于根路径 -> Mitigation: 只对项目相对路径精确匹配 `openspec/changes` 与 `ravenspec/changes`。
- [Risk] 任务解析与 checkbox 写回规则不一致 -> Mitigation: 扩展同一个 `markdown-task.ts` 模块，并添加覆盖 task item/group 解析的测试。

## Migration Plan

1. 不迁移现有 OpenSpec/RavenSpec artifact 文件。
2. 新增解析和 payload builder 后，已有任务文档在预览时自动获得 Apply 控件。
3. 若确认流程无法发送到 terminal，保留 payload 草稿并展示错误，不修改源 Markdown。
