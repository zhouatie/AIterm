## Context

AIterm 当前主界面是左侧文件预览、右侧 terminal 工作区。左侧已经能跟随当前 terminal cwd 显示文件树、预览 Markdown、写回 GFM checkbox，并把 Markdown 评论作为结构化 payload 发送到当前 terminal tab。右侧 terminal 已经支持 workspace / session 导航、agent status 标识和系统通知唤起。

SDD 工作流需要在这些能力之上增加两个状态视角：

- OpenSpec Change Dashboard：围绕 `openspec/changes/*` 展示 change、artifact、task 进度和下一步状态。
- Agent Inbox：围绕 terminal agent status 展示哪些 Codex / Claude Code / OpenCode 正在执行、已完成、等待用户或出错。

本变更应保持应用的“本地工作台 + 内置终端”定位，不引入远程 AI API，也不改变 agent 的执行方式。

## Goals / Non-Goals

**Goals:**

- 在左侧工作区增加 `Files / OpenSpec` 模式切换，让用户能在文件树和 SDD 工作流视图之间切换。
- 展示 active OpenSpec changes、artifact 完整度、`tasks.md` 完成进度和推荐下一步状态。
- 在主窗口提供 Agent Inbox 入口，聚合所有 terminal session 的 agent status。
- 支持从 Dashboard 打开对应 artifact 文件，从 Agent Inbox 激活对应 terminal session。
- 复用现有 terminal agent status、terminal session 激活、文件预览和 Markdown task 解析能力。

**Non-Goals:**

- 不在本变更中实现自动调用 AI API。
- 不自动执行 OpenSpec CLI 命令，不自动提交 commit。
- 不实现并行 worktree 编排。
- 不把 archived changes 作为可执行对象；archive 仅可作为后续扩展的只读浏览对象。
- 不替换现有文件树和 Markdown 预览能力。

## Decisions

### 1. 左侧使用模式切换，而不是替代文件树

左侧 `FilePreviewPanel` 保留现有文件树 + 预览结构，并在面板顶部增加 `Files / OpenSpec` 分段模式。`Files` 维持现有行为；`OpenSpec` 展示 Change Dashboard。模式状态可在当前应用会话内保持，第一版不要求跨重启持久化。

备选方案是用 Dashboard 替代文件树的 spec 模式。没有采用，因为现有文件树承担通用浏览、Markdown 预览、评论、查找等功能，替代会扩大交互回归风险。模式切换能把 SDD 工作流视图作为增量能力引入。

### 2. OpenSpec Dashboard 通过主进程本地扫描生成数据

新增 OpenSpec workflow 扫描入口，由主进程读取当前 rootPath 下的 `openspec/changes` 目录，返回结构化数据：

- change 名称；
- artifact 文件存在性：`proposal.md`、`design.md`、`tasks.md`、`specs/**/*.md`；
- `tasks.md` checkbox 总数和完成数；
- 推荐下一步状态。

不在运行期依赖 `openspec` CLI 输出。CLI 适合开发流程，但应用运行时只需要文件系统状态，主进程本地扫描更稳定，也更容易控制读取范围和错误反馈。

### 3. Dashboard 只做状态导航，不负责执行 agent

Dashboard 第一版展示推荐动作，例如 `Continue`、`Apply`、`Verify`、`Review`、`Archive`，并允许打开相关 artifact 文件。它不自动向 terminal 写入命令。后续若引入 Spec Command Bar，可复用 Dashboard 推断出的 changeName 和 artifact metadata 生成 terminal paste payload。

这样可以先把“看清状态”做稳定，再单独定义“执行动作”的输入确认和粘贴语义，避免 Dashboard 同时承担导航和命令执行两类职责。

### 4. Agent status 在渲染层提升为共享状态

当前 terminal tab 内部维护 `agentStatusBySessionId`。Agent Inbox 也需要同一份状态。如果 Inbox 重新订阅 `terminalApi.onAgentStatus` 并维护自己的状态，用户选择 tab、输入内容、session 关闭等清除规则容易与 terminal tab 不一致。

因此本变更应引入渲染层共享状态，例如 `TerminalRuntimeContext` 或 `AgentStatusContext`：

- 统一订阅 `terminalApi.onAgentStatus` 和 `terminalApi.onAgentStatusCleared`；
- 暴露 `agentStatusBySessionId`、`clearSessionAgentStatus`、`activateSession` 等能力；
- TerminalPanel 继续负责 session / workspace 生命周期，并向共享状态登记 session summary；
- Agent Inbox 读取同一份 status 和 session summary。

### 5. Agent Inbox 使用状态优先级排序

Inbox 按用户处理优先级展示：

1. `needs_user`
2. `error`
3. `running`
4. `completed`

标题栏 badge 只统计 `needs_user` 和 `error`。`running` 和 `completed` 可在面板内展示，但不应持续制造标题栏干扰。

### 6. Agent Inbox 激活 session 复用现有 terminal 激活路径

点击 Inbox 条目时，系统应切换到 terminal 面板并激活对应 session。该行为应复用现有 terminal session 激活逻辑，确保 terminal 侧边栏展开、当前 session 可见、焦点进入 terminal 内容。若 session 已关闭，Inbox 应移除该条目或显示不可用状态，不抛出错误。

## Risks / Trade-offs

- [Risk] OpenSpec 扫描范围过大导致 UI 卡顿 → 主进程扫描只读取 `openspec/changes` 下有限 artifact 和 `tasks.md` 内容，不扫描完整项目树；渲染层提供刷新入口。
- [Risk] Dashboard 与文件树同时存在造成左侧面板拥挤 → 使用单一 `Files / OpenSpec` 模式切换，避免两个导航树并排常驻。
- [Risk] Agent status 状态提升后影响 terminal tab 现有清除逻辑 → 保留现有状态优先级和清除规则，先抽出共享 store，再让 TerminalPanel 和 Inbox 共用。
- [Risk] 推荐下一步动作被误解为自动执行 → 第一版仅展示动作标签和打开 artifact，不向 terminal 自动写入命令。
- [Risk] change 数据与磁盘变更不同步 → Dashboard 提供手动刷新，并在 rootPath 或模式切换时重新加载。
