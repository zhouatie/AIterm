## ADDED Requirements

### Requirement: SDD 工作流面板入口
系统 SHALL 在左侧工作区提供 `Files / OpenSpec` 模式切换，使用户可以在现有文件树预览和 OpenSpec Change Dashboard 之间切换。该切换 SHALL 不销毁右侧 terminal session，不改变当前活跃 terminal tab，不移除现有文件预览能力。

#### Scenario: 显示模式切换
- **WHEN** 左侧工作区处于展开状态
- **THEN** 系统 SHALL 显示 `Files / OpenSpec` 模式切换入口
- **AND** 当前模式 SHALL 有明确激活态

#### Scenario: 切换到 OpenSpec 模式
- **WHEN** 用户从 `Files` 模式切换到 `OpenSpec` 模式
- **THEN** 左侧工作区 SHALL 显示 OpenSpec Change Dashboard
- **AND** 右侧 terminal session SHALL 保持原有运行状态
- **AND** 当前活跃 terminal tab SHALL 保持不变

#### Scenario: 切回 Files 模式
- **WHEN** 用户从 `OpenSpec` 模式切回 `Files` 模式
- **THEN** 左侧工作区 SHALL 恢复现有文件树和文件预览界面
- **AND** 文件树已加载状态和当前文件预览状态 SHALL 尽可能保留

### Requirement: OpenSpec Change Dashboard 数据加载
系统 SHALL 基于当前活跃 terminal session 的工作目录加载 OpenSpec 工作流数据，并 SHALL 只读取该工作目录下的 `openspec/changes` 相关内容。

#### Scenario: 当前项目存在 openspec changes
- **WHEN** 用户打开 OpenSpec Change Dashboard
- **AND** 当前活跃 terminal session 的工作目录下存在 `openspec/changes`
- **THEN** 系统 SHALL 扫描 `openspec/changes` 下的 active change 目录
- **AND** 系统 SHALL 展示扫描到的 active changes

#### Scenario: 当前项目没有 openspec changes
- **WHEN** 用户打开 OpenSpec Change Dashboard
- **AND** 当前活跃 terminal session 的工作目录下不存在 `openspec/changes`
- **THEN** 系统 SHALL 显示空状态
- **AND** 系统 SHALL NOT 展示误导性的 change 列表

#### Scenario: 刷新 Dashboard
- **WHEN** 用户触发 Dashboard 刷新
- **THEN** 系统 SHALL 重新读取当前活跃 terminal session 工作目录下的 OpenSpec 数据
- **AND** 系统 SHALL 用最新扫描结果更新 Dashboard

#### Scenario: active terminal cwd 变化
- **WHEN** 当前活跃 terminal session 的工作目录发生变化
- **AND** 左侧处于 `OpenSpec` 模式
- **THEN** Dashboard SHALL 基于新的工作目录重新加载 OpenSpec 数据

### Requirement: Change 列表与 artifact 状态
OpenSpec Change Dashboard SHALL 按 change 展示 artifact 完整度，包括 `proposal.md`、`design.md`、`tasks.md` 和 `specs/**/*.md` 的存在状态。

#### Scenario: 展示 active changes
- **WHEN** Dashboard 扫描到一个或多个 active change
- **THEN** 系统 SHALL 以列表形式展示每个 change 的名称
- **AND** 系统 SHALL 不把 `openspec/changes/archive` 下的 archived change 当作 active change 展示

#### Scenario: 展示 artifact 完整度
- **WHEN** Dashboard 展示一个 active change
- **THEN** 系统 SHALL 展示该 change 的 `proposal`、`design`、`specs` 和 `tasks` 状态
- **AND** 已存在 artifact SHALL 显示完成状态
- **AND** 缺失 artifact SHALL 显示缺失状态

#### Scenario: specs artifact 状态
- **WHEN** active change 下存在一个或多个 `specs/**/spec.md` 文件
- **THEN** 该 change 的 `specs` artifact SHALL 显示完成状态
- **AND** 系统 SHALL 展示 specs 文件数量或等效摘要

#### Scenario: 没有 active changes
- **WHEN** Dashboard 扫描完成且没有 active change
- **THEN** 系统 SHALL 显示无 active changes 的空状态
- **AND** 系统 SHALL 保留刷新入口

### Requirement: tasks 进度展示
OpenSpec Change Dashboard SHALL 解析每个 active change 的 `tasks.md` 中的 GFM task checkbox，并展示任务总数和完成数。

#### Scenario: tasks.md 包含任务 checkbox
- **WHEN** active change 存在 `tasks.md`
- **AND** `tasks.md` 包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务总数
- **AND** Dashboard SHALL 展示已完成任务数
- **AND** Dashboard SHALL 展示可扫描的进度表达

#### Scenario: tasks.md 不存在
- **WHEN** active change 不存在 `tasks.md`
- **THEN** Dashboard SHALL 将 tasks artifact 显示为缺失
- **AND** Dashboard SHALL NOT 显示虚假的任务进度

#### Scenario: tasks.md 存在但没有 checkbox
- **WHEN** active change 存在 `tasks.md`
- **AND** `tasks.md` 不包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示 tasks artifact 已存在
- **AND** Dashboard SHALL 显示无可统计任务或等效状态

### Requirement: Dashboard artifact 导航
OpenSpec Change Dashboard SHALL 允许用户从 change 条目打开已存在的 artifact 文件，并在左侧预览区域展示该文件内容。

#### Scenario: 打开已存在 artifact
- **WHEN** 用户在 Dashboard 中点击某个已存在 artifact
- **THEN** 系统 SHALL 在左侧预览区域打开该 artifact 文件
- **AND** Markdown artifact SHALL 使用现有 Markdown 预览能力渲染

#### Scenario: 点击缺失 artifact
- **WHEN** 用户尝试点击缺失 artifact
- **THEN** 系统 SHALL NOT 尝试打开不存在的文件
- **AND** 系统 SHALL 以禁用状态或轻量提示表达该 artifact 尚未创建

#### Scenario: 导航不修改文件
- **WHEN** 用户通过 Dashboard 打开任一 artifact
- **THEN** 系统 SHALL NOT 修改该 artifact 文件内容
- **AND** 系统 SHALL NOT 自动勾选或取消 `tasks.md` 任务

### Requirement: Dashboard 推荐下一步状态
OpenSpec Change Dashboard SHALL 根据 artifact 完整度和 task 进度展示每个 active change 的推荐下一步状态。推荐下一步状态 SHALL 只表达工作流建议，不 SHALL 自动执行命令。

#### Scenario: 缺少 proposal
- **WHEN** active change 缺少 `proposal.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为创建 proposal 或继续产物创建的等效状态

#### Scenario: 缺少 design 或 specs
- **WHEN** active change 已存在 `proposal.md`
- **AND** `design.md` 或 `specs/**/*.md` 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为继续补齐 design / specs 的等效状态

#### Scenario: 缺少 tasks
- **WHEN** active change 已存在 `proposal.md`、`design.md` 和至少一个 `specs/**/*.md`
- **AND** `tasks.md` 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为创建 tasks 的等效状态

#### Scenario: tasks 未全部完成
- **WHEN** active change 已存在 `tasks.md`
- **AND** `tasks.md` 中存在未完成任务
- **THEN** Dashboard SHALL 将推荐下一步显示为 apply 或继续实现的等效状态

#### Scenario: tasks 全部完成
- **WHEN** active change 已存在 `tasks.md`
- **AND** `tasks.md` 中所有可统计任务均已完成
- **THEN** Dashboard SHALL 将推荐下一步显示为 verify、review 或 archive 的等效状态

#### Scenario: 推荐状态不自动执行
- **WHEN** Dashboard 展示推荐下一步状态
- **THEN** 系统 SHALL NOT 因展示该状态向 terminal session 写入命令
- **AND** 系统 SHALL NOT 自动调用 AI agent 或 OpenSpec CLI

### Requirement: Agent Inbox 入口与待处理提示
系统 SHALL 提供 Agent Inbox 入口，用于集中查看所有 terminal session 的 agent status。入口 SHALL 在存在需要用户介入的 agent 状态时显示待处理数量提示。

#### Scenario: 显示 Agent Inbox 入口
- **WHEN** 应用主窗口渲染完成
- **THEN** 系统 SHALL 提供可打开 Agent Inbox 的入口
- **AND** 该入口 SHALL 提供明确的 tooltip 或 `aria-label`

#### Scenario: 待处理数量提示
- **WHEN** 任一 terminal session 的 agent status 为 `needs_user` 或 `error`
- **THEN** Agent Inbox 入口 SHALL 显示待处理数量提示
- **AND** 数量 SHALL 等于当前 `needs_user` 与 `error` 状态 session 的总数

#### Scenario: 无待处理状态
- **WHEN** 当前不存在 `needs_user` 或 `error` 状态的 terminal session
- **THEN** Agent Inbox 入口 SHALL 不显示待处理数量或 SHALL 显示零状态

### Requirement: Agent Inbox 列表展示
Agent Inbox SHALL 展示当前所有非 idle agent status，并按处理优先级排序。

#### Scenario: 展示 agent status 条目
- **WHEN** terminal session 收到非 `idle` agent status
- **THEN** Agent Inbox SHALL 展示对应条目
- **AND** 条目 SHALL 包含 agent 类型、状态、状态消息和关联 terminal session 信息

#### Scenario: 状态优先级排序
- **WHEN** Agent Inbox 同时存在多个状态条目
- **THEN** 条目 SHALL 按 `needs_user`、`error`、`running`、`completed` 的优先级排序
- **AND** 同一状态优先级内 SHALL 使用最近更新时间或等效稳定规则排序

#### Scenario: completed 状态展示
- **WHEN** terminal session 的 agent status 为 `completed`
- **THEN** Agent Inbox SHALL 允许用户看到该 completed 条目
- **AND** completed 条目 SHALL 不计入标题栏待处理数量

#### Scenario: running 状态展示
- **WHEN** terminal session 的 agent status 为 `running`
- **THEN** Agent Inbox SHALL 允许用户看到该 running 条目
- **AND** running 条目 SHALL 不计入标题栏待处理数量

### Requirement: Agent Inbox session 激活
Agent Inbox SHALL 允许用户从任一条目激活对应 terminal session，并切换到 terminal 面板显示该 session。

#### Scenario: 激活存在的 session
- **WHEN** 用户点击 Agent Inbox 中关联有效 terminal session 的条目
- **THEN** 系统 SHALL 切换到 terminal 面板
- **AND** 系统 SHALL 激活该条目关联的 terminal session
- **AND** 该 terminal session 的内容 SHALL 显示在右侧 terminal 区域

#### Scenario: terminal 侧边栏收起时激活 session
- **WHEN** 用户点击 Agent Inbox 条目
- **AND** terminal 侧边栏处于收起状态
- **THEN** 系统 SHALL 激活对应 terminal session
- **AND** 系统 SHALL 确保用户可以识别当前被激活的 terminal session

#### Scenario: session 已不存在
- **WHEN** 用户点击 Agent Inbox 条目
- **AND** 该条目关联的 terminal session 已关闭或不存在
- **THEN** 系统 SHALL 移除该条目或显示不可用状态
- **AND** 系统 SHALL NOT 抛出异常或切换到错误界面

### Requirement: Agent Inbox 状态同步与清除
Agent Inbox SHALL 与 terminal tab 使用同一份 agent status 状态语义，保持更新、替换和清除行为一致。

#### Scenario: 新状态替换旧状态
- **WHEN** 同一 terminal session 收到新的合法 agent status
- **THEN** Agent Inbox SHALL 用新状态替换该 session 的旧条目状态
- **AND** terminal tab 上展示的 agent status SHALL 与 Inbox 一致

#### Scenario: idle 状态清除条目
- **WHEN** terminal session 收到 `idle` agent status
- **THEN** Agent Inbox SHALL 移除该 session 的 agent status 条目
- **AND** terminal tab SHALL 同步清除对应状态

#### Scenario: 用户输入后清除待处理终态
- **WHEN** 用户向带有 `needs_user`、`completed` 或 `error` 状态的 terminal session 输入内容
- **THEN** Agent Inbox SHALL 清除该 session 的对应条目
- **AND** terminal tab SHALL 同步清除对应状态

#### Scenario: 选择 session 后清除待处理终态
- **WHEN** 用户选择带有 `needs_user`、`completed` 或 `error` 状态的 terminal session
- **THEN** Agent Inbox SHALL 按现有 terminal 清除规则更新对应条目
- **AND** terminal tab SHALL 按同一规则更新状态

#### Scenario: session 关闭后清除条目
- **WHEN** 带有 agent status 的 terminal session 被关闭或退出
- **THEN** Agent Inbox SHALL 移除该 session 的 agent status 条目
- **AND** 待处理数量 SHALL 重新计算

### Requirement: SDD 工作流面板不直接执行 AI 或 OpenSpec 命令
SDD 工作流面板 SHALL 作为本地状态、导航和提醒界面存在。它 SHALL NOT 直接调用远程 AI API，SHALL NOT 自动向 terminal session 写入 OpenSpec 命令，SHALL NOT 自动提交 commit。

#### Scenario: Dashboard 展示 change 状态
- **WHEN** Dashboard 展示 active change、artifact 状态或推荐下一步状态
- **THEN** 系统 SHALL NOT 自动调用 AI API
- **AND** 系统 SHALL NOT 自动向 terminal session 输入命令

#### Scenario: Agent Inbox 展示 agent 状态
- **WHEN** Agent Inbox 展示 `running`、`completed`、`needs_user` 或 `error` 状态
- **THEN** 系统 SHALL NOT 自动响应 agent 请求
- **AND** 系统 SHALL NOT 自动批准权限请求或执行 terminal 输入

#### Scenario: 用户执行导航操作
- **WHEN** 用户点击 Dashboard artifact 或 Agent Inbox 条目
- **THEN** 系统 SHALL 只执行对应的本地导航或 session 激活动作
- **AND** 系统 SHALL NOT 因该点击提交代码或修改 OpenSpec artifact 内容
