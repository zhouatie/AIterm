## MODIFIED Requirements

### Requirement: OpenSpec Change Dashboard 数据加载
系统 SHALL 基于当前活跃 terminal session 的工作目录加载 SDD 工作流数据，并 SHALL 读取该工作目录下受支持的 SDD changes 目录。受支持目录至少包括 `openspec/changes` 与 `ravenspec/changes`。Dashboard SHALL 保留 OpenSpec 数据展示能力，并在 RavenSpec 目录存在时展示 RavenSpec active changes。

#### Scenario: 当前项目存在 openspec changes
- **WHEN** 用户打开 OpenSpec Change Dashboard
- **AND** 当前活跃 terminal session 的工作目录下存在 `openspec/changes`
- **THEN** 系统 SHALL 扫描 `openspec/changes` 下的 active change 目录
- **AND** 系统 SHALL 展示扫描到的 OpenSpec active changes

#### Scenario: 当前项目存在 ravenspec changes
- **WHEN** 用户打开 OpenSpec Change Dashboard
- **AND** 当前活跃 terminal session 的工作目录下存在 `ravenspec/changes`
- **THEN** 系统 SHALL 扫描 `ravenspec/changes` 下的 active change 目录
- **AND** 系统 SHALL 展示扫描到的 RavenSpec active changes

#### Scenario: 当前项目同时存在两种 workflow
- **WHEN** 当前活跃 terminal session 的工作目录下同时存在 `openspec/changes` 与 `ravenspec/changes`
- **THEN** Dashboard SHALL 合并展示两种 workflow 的 active changes
- **AND** 每个 change 条目 SHALL 展示其 workflow 来源

#### Scenario: 当前项目没有 SDD changes
- **WHEN** 用户打开 OpenSpec Change Dashboard
- **AND** 当前活跃 terminal session 的工作目录下不存在任何受支持的 SDD changes 目录
- **THEN** 系统 SHALL 显示空状态
- **AND** 系统 SHALL NOT 展示误导性的 change 列表

#### Scenario: 刷新 Dashboard
- **WHEN** 用户触发 Dashboard 刷新
- **THEN** 系统 SHALL 重新读取当前活跃 terminal session 工作目录下的 SDD 数据
- **AND** 系统 SHALL 用最新扫描结果更新 Dashboard

#### Scenario: active terminal cwd 变化
- **WHEN** 当前活跃 terminal session 的工作目录发生变化
- **AND** 左侧处于 `OpenSpec` 模式
- **THEN** Dashboard SHALL 基于新的工作目录重新加载 SDD 数据

### Requirement: Change 列表与 artifact 状态
OpenSpec Change Dashboard SHALL 按 change 展示 artifact 完整度。OpenSpec change SHALL 展示 `proposal.md`、`design.md`、`tasks.md` 和 `specs/**/*.md` 的存在状态；RavenSpec change SHALL 展示 `PRD.md`、`DESIGN.md`、`TASK.md` 和 `specs/**/*.md` 的存在状态。

#### Scenario: 展示 active changes
- **WHEN** Dashboard 扫描到一个或多个 active change
- **THEN** 系统 SHALL 以列表形式展示每个 change 的名称
- **AND** 系统 SHALL 展示每个 change 的 workflow
- **AND** 系统 SHALL 不把 `openspec/changes/archive` 或 `ravenspec/changes/archive` 下的 archived change 当作 active change 展示

#### Scenario: 展示 OpenSpec artifact 完整度
- **WHEN** Dashboard 展示一个 OpenSpec active change
- **THEN** 系统 SHALL 展示该 change 的 `proposal`、`design`、`specs` 和 `tasks` 状态
- **AND** 已存在 artifact SHALL 显示完成状态
- **AND** 缺失 artifact SHALL 显示缺失状态

#### Scenario: 展示 RavenSpec artifact 完整度
- **WHEN** Dashboard 展示一个 RavenSpec active change
- **THEN** 系统 SHALL 展示该 change 的 `PRD`、`DESIGN`、`specs` 和 `TASK` 状态
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
OpenSpec Change Dashboard SHALL 解析每个 active change 的任务 artifact 中的 GFM task checkbox，并展示任务总数和完成数。OpenSpec change SHALL 默认解析 `tasks.md`；RavenSpec change SHALL 默认解析 `TASK.md`。

#### Scenario: OpenSpec tasks.md 包含任务 checkbox
- **WHEN** OpenSpec active change 存在 `tasks.md`
- **AND** `tasks.md` 包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务总数
- **AND** Dashboard SHALL 展示已完成任务数
- **AND** Dashboard SHALL 展示可扫描的进度表达

#### Scenario: RavenSpec TASK.md 包含任务 checkbox
- **WHEN** RavenSpec active change 存在 `TASK.md`
- **AND** `TASK.md` 包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务总数
- **AND** Dashboard SHALL 展示已完成任务数
- **AND** Dashboard SHALL 展示可扫描的进度表达

#### Scenario: 任务 artifact 不存在
- **WHEN** active change 不存在对应 workflow 的任务 artifact
- **THEN** Dashboard SHALL 将任务 artifact 显示为缺失
- **AND** Dashboard SHALL NOT 显示虚假的任务进度

#### Scenario: 任务 artifact 存在但没有 checkbox
- **WHEN** active change 存在对应 workflow 的任务 artifact
- **AND** 该 artifact 不包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务 artifact 已存在
- **AND** Dashboard SHALL 显示无可统计任务或等效状态

### Requirement: Dashboard 推荐下一步状态
OpenSpec Change Dashboard SHALL 根据 workflow、artifact 完整度和 task 进度展示每个 active change 的推荐下一步状态。推荐下一步状态 SHALL 只表达工作流建议，不 SHALL 因展示状态自动执行命令。用户显式触发推荐动作时，Dashboard SHALL 将当前 change、workflow 和推荐 action 交给 SDD Command Router；低风险动作 SHALL 可直接写入 terminal 并执行，高风险动作或包含跳过门禁的动作 SHALL 先展示确认界面。

#### Scenario: OpenSpec 缺少 proposal
- **WHEN** OpenSpec active change 缺少 `proposal.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为创建 proposal 或继续产物创建的等效状态

#### Scenario: RavenSpec 缺少 PRD
- **WHEN** RavenSpec active change 缺少 `PRD.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为继续创建 PRD 的等效状态

#### Scenario: 缺少 design 或 specs
- **WHEN** active change 已存在对应 workflow 的首个需求 artifact
- **AND** design artifact 或 `specs/**/*.md` 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为继续补齐 design / specs 的等效状态

#### Scenario: 缺少任务 artifact
- **WHEN** active change 已存在对应 workflow 的需求、design 和至少一个 `specs/**/*.md`
- **AND** 任务 artifact 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为创建任务 artifact 的等效状态

#### Scenario: tasks 未全部完成
- **WHEN** active change 已存在任务 artifact
- **AND** 任务 artifact 中存在未完成任务
- **THEN** Dashboard SHALL 将推荐下一步显示为 apply 或继续实现的等效状态

#### Scenario: tasks 全部完成
- **WHEN** active change 已存在任务 artifact
- **AND** 任务 artifact 中所有可统计任务均已完成
- **THEN** Dashboard SHALL 将推荐下一步显示为 verify、review 或 archive 的等效状态

#### Scenario: 推荐状态不自动执行
- **WHEN** Dashboard 展示推荐下一步状态
- **THEN** 系统 SHALL NOT 因展示该状态向 terminal session 写入命令
- **AND** 系统 SHALL NOT 自动调用 AI agent、OpenSpec CLI 或 Raven CLI

#### Scenario: 用户触发低风险推荐动作
- **WHEN** 用户在 Dashboard 中显式触发某个 active change 的推荐动作
- **AND** 推荐 action 为低风险 action
- **AND** 该 action 不包含显式跳过的门禁
- **THEN** Dashboard SHALL 将该 change 的 workflow、名称和推荐 action 传递给 SDD Command Router
- **AND** SDD Command Router SHALL 将 payload 写入当前活跃 terminal session 并执行

#### Scenario: 用户触发高风险推荐动作
- **WHEN** 用户在 Dashboard 中显式触发某个 active change 的推荐动作
- **AND** 推荐 action 为高风险 action
- **THEN** Dashboard SHALL 将该 change 的 workflow、名称和推荐 action 传递给 SDD Command Router
- **AND** SDD Command Router SHALL 展示确认界面
- **AND** 系统 SHALL NOT 在确认前向 terminal session 写入内容

#### Scenario: 用户说下一步
- **WHEN** 用户通过 SDD 命令入口输入 `下一步`
- **AND** 当前 SDD change 对应 Dashboard 中存在推荐下一步状态
- **THEN** 系统 SHALL 使用该推荐下一步状态作为候选 action
- **AND** 系统 SHALL 在确认界面展示 action 来源为 Dashboard 推荐

#### Scenario: 用户触发 Update Change 旁路动作
- **WHEN** 用户在 Dashboard 中显式触发某个 active change 的 Update Change 动作
- **THEN** Dashboard SHALL 将该 change 的 workflow、名称和 `update-change` action 传递给 SDD Command Router
- **AND** SDD Command Router SHALL 将 payload 写入当前活跃 terminal session 并执行
- **AND** Dashboard SHALL NOT 改变该 change 的推荐下一步状态
- **AND** 若当前无活跃 terminal session，系统 SHALL 保留 payload 草稿并展示无法执行的反馈

#### Scenario: Update Change 按钮文案
- **WHEN** Dashboard 展示 active change 的操作按钮
- **THEN** Update Change 操作按钮 SHALL 显示文案 `更新change`
- **AND** 系统 SHALL NOT 只显示 `更新`

### Requirement: SDD change 卡片操作布局
Dashboard SHALL 以稳定、可点击的布局展示每个 SDD change 卡片的操作按钮。操作按钮区域 SHALL 在视觉上每行最多展示两个按钮；当空间不足时 SHALL 自动换行为单列，而不是将三个或更多文字按钮挤在同一行。

#### Scenario: 宽面板展示操作按钮
- **WHEN** change 卡片存在三个或更多操作按钮
- **AND** 面板宽度足以展示两列按钮
- **THEN** 操作按钮区域 SHALL 每行最多展示两个按钮
- **AND** 第三个及后续按钮 SHALL 换行展示

#### Scenario: 窄面板展示操作按钮
- **WHEN** change 卡片操作区域不足以稳定展示两列按钮
- **THEN** 操作按钮 SHALL 以单列展示
- **AND** 按钮文本 SHALL NOT 相互重叠或被挤压到不可读

#### Scenario: 操作按钮布局不影响推荐状态
- **WHEN** Dashboard 刷新 change 状态或推荐下一步状态
- **THEN** 操作按钮布局 SHALL 保持每行最多两个按钮
- **AND** 系统 SHALL NOT 因布局调整改变任何 action 的语义
