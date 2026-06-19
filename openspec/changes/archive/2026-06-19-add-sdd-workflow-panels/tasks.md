## 1. 数据模型与扫描能力

- [x] 1.1 定义 OpenSpec Dashboard 数据类型，覆盖 change 名称、artifact 状态、spec 文件数量、tasks 总数、完成数和推荐下一步状态
- [x] 1.2 在主进程新增 OpenSpec workflow 扫描逻辑，只读取当前 rootPath 下的 `openspec/changes`、artifact 文件和 `tasks.md`
- [x] 1.3 在 preload 中暴露 OpenSpec workflow 读取 API，并补充对应 TypeScript 类型
- [x] 1.4 实现 tasks checkbox 统计逻辑，正确处理缺失 `tasks.md`、无 checkbox 和部分完成三类状态

## 2. 左侧 SDD 工作流模式

- [x] 2.1 在左侧文件预览工作区增加 `Files / OpenSpec` 模式切换入口，并保持当前模式激活态清晰
- [x] 2.2 保留 `Files` 模式下现有文件树、Markdown 预览、查找、评论和 task checkbox 写回行为
- [x] 2.3 在 `OpenSpec` 模式下根据当前活跃 terminal cwd 加载 Dashboard 数据
- [x] 2.4 支持 Dashboard 手动刷新，并在活跃 terminal cwd 变化时重新加载 OpenSpec 数据

## 3. OpenSpec Change Dashboard

- [x] 3.1 实现 active change 列表，排除 `openspec/changes/archive`
- [x] 3.2 展示每个 change 的 `proposal`、`design`、`specs`、`tasks` artifact 完整度
- [x] 3.3 展示每个 change 的 tasks 进度，包括任务总数、完成数和无可统计任务状态
- [x] 3.4 展示每个 change 的推荐下一步状态，覆盖补 proposal、补 design/specs、补 tasks、apply、verify/review/archive
- [x] 3.5 支持从 Dashboard 打开已存在 artifact，并复用现有 Markdown 预览渲染
- [x] 3.6 对缺失 artifact 提供禁用状态或轻量提示，不尝试打开不存在文件
- [x] 3.7 确保 Dashboard 导航不修改 artifact 内容、不自动写入 terminal、不调用 AI API

## 4. Agent status 共享状态

- [x] 4.1 将 terminal agent status 状态提升为渲染层共享 store 或 context，统一订阅 status 与 clear 事件
- [x] 4.2 让 TerminalPanel 使用共享 agent status 状态，保持现有 tab 状态标识、聚合标识和清除规则
- [x] 4.3 让 TerminalPanel 向共享状态登记 session summary，供 Agent Inbox 展示 session 信息
- [x] 4.4 保持用户选择 session、向 session 输入内容、session 关闭或退出时的 agent status 清除语义一致

## 5. Agent Inbox

- [x] 5.1 在主窗口提供 Agent Inbox 入口，并显示 `needs_user` 与 `error` 待处理数量 badge
- [x] 5.2 实现 Agent Inbox 面板，展示所有非 idle agent status 条目
- [x] 5.3 按 `needs_user`、`error`、`running`、`completed` 优先级排序条目，同优先级内使用稳定排序
- [x] 5.4 展示每个条目的 agent 类型、状态、状态消息、更新时间和关联 terminal session 信息
- [x] 5.5 支持点击 Inbox 条目激活对应 terminal session，并切换到 terminal 面板
- [x] 5.6 处理 session 已关闭或不存在的条目，移除或显示不可用状态且不抛出异常
- [x] 5.7 确保 Inbox 展示和点击行为不自动响应 agent、不批准权限请求、不写入 terminal 输入

## 6. 联调与验收

- [x] 6.1 验证没有 active changes、存在单个 active change、存在多个 active changes 时的 Dashboard 展示
- [x] 6.2 验证 artifact 缺失、specs 存在、tasks 部分完成和 tasks 全部完成时的推荐状态
- [x] 6.3 验证 `Files / OpenSpec` 切换不会破坏文件树状态、Markdown 预览和右侧 terminal session
- [x] 6.4 验证 Codex / Claude Code / OpenCode status 事件能同时更新 terminal tab 和 Agent Inbox
- [x] 6.5 验证 Inbox badge 只统计 `needs_user` 与 `error`，不统计 `running` 与 `completed`
- [x] 6.6 验证点击 Inbox 条目能激活对应 terminal session，session 不存在时不会产生异常
