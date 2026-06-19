## Why

当前应用已经具备左侧 Spec 文档预览、右侧 AI 终端、Markdown 评论发送给 agent、terminal agent status 通知等基础能力，但 SDD 开发过程仍主要依赖用户手动在文件树、OpenSpec 命令和多个 terminal tab 之间切换判断。需要引入面向 SDD 工作流的状态面板，让用户更快知道当前有哪些 change、每个 change 到哪一步、哪个 agent 需要处理。

## What Changes

- 新增 OpenSpec Change Dashboard，用工作流视角展示 active changes、artifact 完整度、任务完成进度和推荐下一步动作。
- 新增 Agent Inbox，用统一列表聚合 Codex / Claude Code / OpenCode 的 `running`、`completed`、`needs_user`、`error` 状态，并支持快速激活对应 terminal session。
- 在左侧工作区提供 `Files / OpenSpec` 模式切换，保留现有文件预览能力，不直接替代文件树。
- 在主窗口提供 Agent Inbox 入口和待处理数量提示，用于集中处理需要用户介入的 agent 状态。
- 复用现有 terminal 输入、terminal session 激活、agent status 通知和 Markdown 预览能力；不新增直接调用 AI API 的路径。

## Capabilities

### New Capabilities

- `sdd-workflow-panels`: 定义 OpenSpec Change Dashboard、Agent Inbox、SDD 工作流面板入口、状态展示、导航和终端联动行为。

### Modified Capabilities

无。

## Impact

- 影响渲染层主布局、左侧文件预览区域、terminal 面板状态聚合和标题栏 / 面板入口。
- 可能新增 OpenSpec change 扫描相关 IPC 或文件读取封装，用于读取 `openspec/changes/*`、artifact 文件存在性和 `tasks.md` checkbox 进度。
- 复用现有 `terminalApi.onAgentStatus`、`terminalApi.onAgentStatusCleared`、`terminalApi.onActivateSession`、`fileApi.readFile`、文件预览打开和 terminal session 激活链路。
- 不引入新的远程 AI API，不改变 Codex / Claude Code / OpenCode 的执行方式。
