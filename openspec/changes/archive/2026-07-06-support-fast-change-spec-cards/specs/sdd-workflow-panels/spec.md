## MODIFIED Requirements

### Requirement: Change 列表与 artifact 状态
OpenSpec Change Dashboard SHALL 按 change 展示 artifact 完整度。OpenSpec change SHALL 展示 `proposal.md`、`design.md`、`tasks.md` 和 `specs/**/*.md` 的存在状态；RavenSpec 完整 SDD change SHALL 展示 `PRD.md`、`DESIGN.md`、`TASK.md` 和 `specs/**/*.md` 的存在状态；RavenSpec fast-change SHALL 展示 `CHANGE.md` 状态，并将 `specs/**/*.md` 作为可选摘要。

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

#### Scenario: 展示 RavenSpec 完整 SDD artifact 完整度
- **WHEN** Dashboard 展示一个 RavenSpec active change
- **AND** 该 change 使用完整 SDD 模式
- **THEN** 系统 SHALL 展示该 change 的 `PRD`、`DESIGN`、`specs` 和 `TASK` 状态
- **AND** 已存在 artifact SHALL 显示完成状态
- **AND** 缺失 artifact SHALL 显示缺失状态

#### Scenario: 展示 RavenSpec fast-change artifact
- **WHEN** Dashboard 展示一个 RavenSpec active change
- **AND** 该 change 目录存在 `CHANGE.md`
- **AND** 该 change 未使用完整 SDD 模式
- **THEN** 系统 SHALL 将该 change 识别为 fast-change
- **AND** 系统 SHALL 展示 `CHANGE` artifact 为已存在状态
- **AND** 系统 SHALL NOT 展示 `PRD`、`DESIGN` 或 `TASK` 缺失状态

#### Scenario: fast-change specs 可选
- **WHEN** Dashboard 展示一个 RavenSpec fast-change
- **AND** 该 change 下不存在 `specs/**/*.md`
- **THEN** 系统 SHALL NOT 将该 change 标记为 artifact 不完整
- **AND** 系统 SHALL NOT 使用警告态要求用户补齐 specs

#### Scenario: specs artifact 状态
- **WHEN** active change 下存在一个或多个 `specs/**/spec.md` 文件
- **THEN** 该 change 的 `specs` artifact SHALL 显示完成状态
- **AND** 系统 SHALL 展示 specs 文件数量或等效摘要

#### Scenario: 没有 active changes
- **WHEN** Dashboard 扫描完成且没有 active change
- **THEN** 系统 SHALL 显示无 active changes 的空状态
- **AND** 系统 SHALL 保留刷新入口

### Requirement: tasks 进度展示
OpenSpec Change Dashboard SHALL 解析每个 active change 的任务或验证 artifact 中的 GFM checkbox，并展示可扫描进度。OpenSpec change SHALL 默认解析 `tasks.md`；RavenSpec 完整 SDD change SHALL 默认解析 `TASK.md`；RavenSpec fast-change SHALL 默认解析 `CHANGE.md` 中的 verification checkbox。

#### Scenario: OpenSpec tasks.md 包含任务 checkbox
- **WHEN** OpenSpec active change 存在 `tasks.md`
- **AND** `tasks.md` 包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务总数
- **AND** Dashboard SHALL 展示已完成任务数
- **AND** Dashboard SHALL 展示可扫描的进度表达

#### Scenario: RavenSpec TASK.md 包含任务 checkbox
- **WHEN** RavenSpec active change 使用完整 SDD 模式
- **AND** 该 change 存在 `TASK.md`
- **AND** `TASK.md` 包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务总数
- **AND** Dashboard SHALL 展示已完成任务数
- **AND** Dashboard SHALL 展示可扫描的进度表达

#### Scenario: RavenSpec fast-change CHANGE.md 包含验证 checkbox
- **WHEN** RavenSpec active change 使用 fast-change 模式
- **AND** `CHANGE.md` 包含 GFM checkbox
- **THEN** Dashboard SHALL 展示验证项总数
- **AND** Dashboard SHALL 展示已完成验证项数
- **AND** Dashboard SHALL 使用验证进度文案而不是任务进度文案

#### Scenario: 任务 artifact 不存在
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 不存在对应 workflow 的任务 artifact
- **THEN** Dashboard SHALL 将任务 artifact 显示为缺失
- **AND** Dashboard SHALL NOT 显示虚假的任务进度

#### Scenario: fast-change 没有验证 checkbox
- **WHEN** RavenSpec active change 使用 fast-change 模式
- **AND** `CHANGE.md` 不包含 GFM checkbox
- **THEN** Dashboard SHALL 展示 `CHANGE.md` 已存在
- **AND** Dashboard SHALL 显示无可统计验证项或等效状态
- **AND** Dashboard SHALL NOT 显示 `TASK` 缺失

#### Scenario: 任务 artifact 存在但没有 checkbox
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 存在对应 workflow 的任务 artifact
- **AND** 该 artifact 不包含 GFM task checkbox
- **THEN** Dashboard SHALL 展示任务 artifact 已存在
- **AND** Dashboard SHALL 显示无可统计任务或等效状态

### Requirement: Dashboard artifact 导航
OpenSpec Change Dashboard SHALL 允许用户从 change 条目打开已存在的 artifact 文件，并在左侧预览区域展示该文件内容。

#### Scenario: 打开已存在 artifact
- **WHEN** 用户在 Dashboard 中点击某个已存在 artifact
- **THEN** 系统 SHALL 在左侧预览区域打开该 artifact 文件
- **AND** Markdown artifact SHALL 使用现有 Markdown 预览能力渲染

#### Scenario: 打开 fast-change CHANGE artifact
- **WHEN** Dashboard 展示一个 RavenSpec fast-change
- **AND** 用户点击已存在的 `CHANGE` artifact
- **THEN** 系统 SHALL 在左侧预览区域打开该 change 的 `CHANGE.md`
- **AND** Markdown artifact SHALL 使用现有 Markdown 预览能力渲染

#### Scenario: 点击缺失 artifact
- **WHEN** 用户尝试点击缺失 artifact
- **THEN** 系统 SHALL NOT 尝试打开不存在的文件
- **AND** 系统 SHALL 以禁用状态或轻量提示表达该 artifact 尚未创建

#### Scenario: 导航不修改文件
- **WHEN** 用户通过 Dashboard 打开任一 artifact
- **THEN** 系统 SHALL NOT 修改该 artifact 文件内容
- **AND** 系统 SHALL NOT 自动勾选或取消 `tasks.md`、`TASK.md` 或 `CHANGE.md` 中的 checkbox

### Requirement: Dashboard 推荐下一步状态
OpenSpec Change Dashboard SHALL 根据 workflow、change 模式、artifact 完整度和任务或验证进度展示每个 active change 的推荐下一步状态。推荐下一步状态 SHALL 只表达工作流建议，不 SHALL 因展示状态自动执行命令。用户显式触发推荐动作时，Dashboard SHALL 将当前 change、workflow 和推荐 action 交给 SDD Command Router；低风险动作 SHALL 可直接写入 terminal 并执行，高风险动作或包含跳过门禁的动作 SHALL 先展示确认界面。

#### Scenario: OpenSpec 缺少 proposal
- **WHEN** OpenSpec active change 缺少 `proposal.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为创建 proposal 或继续产物创建的等效状态

#### Scenario: RavenSpec 缺少 PRD
- **WHEN** RavenSpec active change 使用完整 SDD 模式
- **AND** 该 change 缺少 `PRD.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为继续创建 PRD 的等效状态

#### Scenario: RavenSpec fast-change 推荐检查 CHANGE
- **WHEN** RavenSpec active change 使用 fast-change 模式
- **AND** 该 change 存在 `CHANGE.md`
- **THEN** Dashboard SHALL 将推荐下一步显示为检查 `CHANGE.md` 或等效状态
- **AND** Dashboard SHALL NOT 因缺少 `PRD.md`、`DESIGN.md`、`TASK.md` 或 specs 推荐补齐完整 SDD artifact

#### Scenario: 缺少 design 或 specs
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 已存在对应 workflow 的首个需求 artifact
- **AND** design artifact 或 `specs/**/*.md` 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为继续补齐 design / specs 的等效状态

#### Scenario: 缺少任务 artifact
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 已存在对应 workflow 的需求、design 和至少一个 `specs/**/*.md`
- **AND** 任务 artifact 缺失
- **THEN** Dashboard SHALL 将推荐下一步显示为创建任务 artifact 的等效状态

#### Scenario: tasks 未全部完成
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 已存在任务 artifact
- **AND** 任务 artifact 中存在未完成任务
- **THEN** Dashboard SHALL 将推荐下一步显示为 apply 或继续实现的等效状态

#### Scenario: tasks 全部完成
- **WHEN** active change 使用 OpenSpec 或 RavenSpec 完整 SDD 模式
- **AND** active change 已存在任务 artifact
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
- **AND** 当前 SDD change 对应 OpenSpec Dashboard 中存在推荐下一步状态
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
