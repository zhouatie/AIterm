## Context

AIterm 的 Markdown 评论由 `FilePreviewPanel` 统一编排：组件持有 `rootPath`、`selectedFile`、`markdownComments`、`activeCommentId`、`commentLocationMap` 和 `activeSessionId`。评论数据通过 `.aiterm/markdown-preview-comments.json` 按项目相对文件路径保存，每条评论包含 `id`、`filePath`、`anchor.quote/prefix/suffix`、`body`、`createdAt` 和 `updatedAt`。

终端输入链路已经存在：渲染进程可调用 `window.terminalApi.input(sessionId, data)`，preload 将其转发到 `terminal:input` IPC，主进程再写入对应 PTY stdin。当前功能可以复用这条链路，不需要新增后端协议。

## Goals / Non-Goals

**Goals:**

- 用户可以从 Markdown 评论面板把单条评论发送到当前活跃 terminal tab。
- 用户可以多选评论并一次性发送到当前活跃 terminal tab。
- 注入内容对人和 agent 都清晰，至少包含文件路径、评论 ID、被评论原文和评论正文。
- 对 OpenSpec/Raven change 文件，注入内容携带可推断的 workflow 与 change 名称，降低 agent 误判。
- 发送动作不修改源 Markdown 文件，也不修改评论持久化数据。
- 当前无可用 terminal session 时，用户能看到明确反馈。

**Non-Goals:**

- 不直接调用 Codex/OpenAI/Claude API。
- 不检测当前 terminal 中实际运行的 agent 类型，也不限制必须是 Codex。
- 不实现评论处理状态持久化，例如 `applied/resolved/failed`。
- 不新增请求 JSON 队列或异步任务系统。
- 不改变评论锚点恢复算法。

## Decisions

### 决策 1：发送目标使用当前活跃 terminal session

**选择**：`FilePreviewPanel` 继续接收 `activeSessionId`，发送动作直接调用 `window.terminalApi.input(activeSessionId, payload)`。

**理由**：

- 用户已经通过 terminal tab 表达了当前希望交互的 agent 会话。
- 复用现有 PTY 输入链路可以避免新增主进程 API 和 agent 专用协议。
- 该设计对 Codex、Claude Code、OpenCode 或普通 shell 都保持中立。

**替代方案**：在 AIterm 内部直接调用 Codex API。否决原因是会绑定具体 agent 协议，并绕开用户当前 terminal 会话的状态、权限和上下文。

### 决策 2：注入内容使用固定块格式

**选择**：单条发送注入一行短指令和该评论对应的评论块；多条发送包含一个完整总说明头，以及多条评论块。每条评论块以 `@<相对文件路径>` 开头，并包含元信息、被评论原文和评论正文。

推荐格式：

```text
请处理以下 AIterm Markdown 评论。规则：
1. 每个 <aiterm-comment> 是一条独立评论。
2. @ 后面的文件是评论所在文件。
3. selected_text 是用户评论锚定的原文。
4. comment 是用户希望你处理的意见。
5. 如果文件属于 openspec/changes 或 ravenspec/changes，优先更新对应 spec/change artifacts；需要代码修改时再继续实现。
6. 如果评论意图不明确，先问我。

<aiterm-comment id="comment-id" workflow="openspec" change="change-name">
@openspec/changes/change-name/specs/file-preview/spec.md

selected_text:
```md
被评论原文
```

comment:
评论内容
</aiterm-comment>
```

**理由**：

- `@path` 保留用户期望的 agent 文件引用入口。
- `selected_text` 让 agent 不必仅凭行号或模糊描述定位评论。
- `id` 使多条评论处理结果可回指到具体评论。
- `workflow/change` 让 agent 直接选择 OpenSpec 或 Raven 流程，而不是猜。
- 单条评论保留 SDD 处理语义，但不重复注入长规则说明，避免用户连续发送多条单评时 prompt 被样板文本淹没。

### 决策 3：文件路径使用项目相对路径

**选择**：注入中的 `@` 路径使用相对 `rootPath` 的路径；若 `comment.filePath` 是绝对路径，则先转换为项目相对路径。无法转换时使用评论保存时的 `filePath`，并在块内保留原始值。

**理由**：

- Codex 等 agent 通常在项目根目录工作，相对路径最稳定。
- 相对路径更短，适合多条评论注入。
- 当前评论持久化已经按项目相对文件路径分组保存。

### 决策 4：workflow/change 只做路径推断

**选择**：根据评论文件路径推断：

- `openspec/changes/<name>/...` -> `workflow="openspec"`，`change="<name>"`
- `ravenspec/changes/<name>/...` -> `workflow="raven"`，`change="<name>"`
- 其他路径 -> `workflow="unknown"`，不填 change 或填 `change="unknown"`

**理由**：

- 路径推断确定性强，不需要读取外部 CLI 状态。
- 注入内容仍然保持 agent 可读，即使 workflow unknown 也可处理普通 Markdown 评论。
- 不把 OpenSpec/Raven 逻辑耦合进评论存储模型。

### 决策 5：多选状态只存在于当前 UI 会话

**选择**：评论列表支持勾选多条评论，选中集合仅保存在 `FilePreviewPanel` state 中。发送后清空或保留选中集合以实现重发，由实现时按交互细节决定；但不得写入评论 JSON。

**理由**：

- 这是一次性发送动作，不是评论生命周期状态。
- 不改持久化格式可以保持已有评论数据兼容。
- 后续如果需要 `resolved/applied`，应作为单独 change 设计。

### 决策 5.1：多选删除复用评论保存链路

**选择**：用户多选评论后，可以通过评论列表工具条删除选中评论。删除动作基于当前内存评论列表过滤选中 ID，并复用现有 `markdownCommentApi.save` 保存剩余评论；成功后清空选中集合。如果当前 active comment 被删除，则退出详情态。

**理由**：

- 单条删除已经是立即删除并保存，多选删除沿用同一交互语义。
- 不新增评论生命周期字段，也不改变评论 JSON 格式。
- 删除后清空选择可以避免用户误以为已删除评论仍处于选中状态。

### 决策 6：发送只注入 prompt，不自动提交

**选择**：发送动作 SHALL 向 PTY 写入完整 payload，但不得在末尾追加提交用回车。多行 payload 使用 bracketed paste 序列包裹，使支持该协议的 agent prompt 将整段内容作为一次粘贴写入输入框，而不是把中间换行或末尾字符当成执行命令。

**理由**：

- 用户点击“发送给 agent”的核心预期是把评论上下文放入当前 agent prompt，最终是否执行应由用户确认。
- 评论 payload 是多行文本，直接写入 `\n` 和末尾 `\r` 会让 Codex 等交互式 agent 误以为用户按下 Enter 并立即执行。
- bracketed paste 是终端中区分粘贴文本与逐键输入的通用协议，适合把多行内容安全放进 prompt。

**风险**：若当前 tab 中的程序不支持 bracketed paste，可能无法按预期解析粘贴边界。缓解方式是在按钮 tooltip 和错误反馈中明确“发送到当前 terminal tab”，并默认只在用户主动点击后触发。

## Risks / Trade-offs

- [Risk] 当前 terminal 不在 agent prompt 中，payload 可能进入 shell 或正在运行的 TUI -> Mitigation: 只由显式按钮触发，不追加提交回车，并通过 bracketed paste 降低多行文本被逐行执行的风险。
- [Risk] 评论正文或选中文本中包含三反引号导致代码块边界混乱 -> Mitigation: formatter 对 fence 长度做动态选择，或在内容中使用更长的反引号 fence。
- [Risk] 多条评论 payload 过长 -> Mitigation: 第一阶段允许发送；后续可增加长度提示或分批发送。
- [Risk] 注入后无法知道 agent 是否真正处理成功 -> Mitigation: 本阶段只负责投递上下文，不持久化处理状态。
- [Risk] 多选 UI 增加评论面板密度 -> Mitigation: 使用紧凑 checkbox 和图标按钮，避免把评论列表变成复杂任务管理器。

## Migration Plan

1. 不迁移 `.aiterm/markdown-preview-comments.json`。
2. 新增 formatter 和 UI 状态后，已有评论可直接发送。
3. 若用户没有打开 terminal 或 `activeSessionId` 为空，发送动作展示错误，不修改评论。

## Open Questions

- 是否需要发送后自动关闭评论面板？默认不关闭，便于用户继续发送其他评论。
- 多选发送后是否清空选中集合？默认可清空，避免重复发送；实现时可根据交互手感微调。
