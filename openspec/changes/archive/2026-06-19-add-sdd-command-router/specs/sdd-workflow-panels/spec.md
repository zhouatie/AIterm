## MODIFIED Requirements

### Requirement: Dashboard 推荐下一步状态
OpenSpec Change Dashboard SHALL 根据 artifact 完整度和 task 进度展示每个 active change 的推荐下一步状态。推荐下一步状态 SHALL 只表达工作流建议，不 SHALL 自动执行命令。用户显式触发推荐动作时，Dashboard SHALL 将当前 change 和推荐 action 交给 SDD Command Router 进行解析确认；确认前 SHALL NOT 向 terminal session 写入内容。

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

#### Scenario: 用户触发推荐动作
- **WHEN** 用户在 Dashboard 中显式触发某个 active change 的推荐动作
- **THEN** Dashboard SHALL 将该 change 的名称和推荐 action 传递给 SDD Command Router
- **AND** SDD Command Router SHALL 展示确认界面
- **AND** 系统 SHALL NOT 在确认前向 terminal session 写入内容

#### Scenario: 用户说下一步
- **WHEN** 用户通过 SDD 命令入口输入 `下一步`
- **AND** 当前 SDD change 对应 OpenSpec Dashboard 中存在推荐下一步状态
- **THEN** 系统 SHALL 使用该推荐下一步状态作为候选 action
- **AND** 系统 SHALL 在确认界面展示 action 来源为 Dashboard 推荐

#### Scenario: 用户触发 Update Change 旁路动作
- **WHEN** 用户在 Dashboard 中显式触发某个 active change 的 Update Change 动作
- **THEN** Dashboard SHALL 将该 change 的名称和 `update-change` action 传递给 SDD Command Router
- **AND** SDD Command Router SHALL 展示确认界面
- **AND** Dashboard SHALL NOT 改变该 change 的推荐下一步状态
- **AND** 系统 SHALL NOT 在确认前向 terminal session 写入内容
