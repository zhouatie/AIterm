## ADDED Requirements

### Requirement: SDD 任务文档 Apply 控件
系统 SHALL 在 Markdown 预览中为受支持的 SDD 任务文档展示 scoped Apply 控件，使用户可以从 task item 或 task group 触发对应范围的 apply 确认流程。系统 SHALL 仅在 OpenSpec `openspec/changes/<change>/tasks.md` 与 RavenSpec `ravenspec/changes/<change>/TASK.md` 中展示这些控件。

#### Scenario: OpenSpec tasks 文档显示 Apply 控件
- **WHEN** 用户预览项目内 `openspec/changes/<change-name>/tasks.md`
- **AND** 文档包含未完成 task item
- **THEN** Markdown 预览 SHALL 在未完成 task item 附近展示 Apply 控件
- **AND** Apply 控件 SHALL 将 workflow 标记为 `openspec`
- **AND** Apply 控件 SHALL 将 `<change-name>` 作为目标 change

#### Scenario: RavenSpec TASK 文档显示 Apply 控件
- **WHEN** 用户预览项目内 `ravenspec/changes/<change-name>/TASK.md`
- **AND** 文档包含未完成 task item
- **THEN** Markdown 预览 SHALL 在未完成 task item 附近展示 Apply 控件
- **AND** Apply 控件 SHALL 将 workflow 标记为 `raven`
- **AND** Apply 控件 SHALL 将 `<change-name>` 作为目标 change

#### Scenario: 普通 Markdown 不显示 Apply 控件
- **WHEN** 用户预览不匹配受支持 SDD 任务文档路径的 Markdown 文件
- **THEN** Markdown 预览 SHALL NOT 展示 task apply 控件
- **AND** 系统 SHALL 保持普通 Markdown 渲染、task checkbox 写回、评论和查找行为可用

#### Scenario: 已完成 task item 不提供立即 Apply
- **WHEN** 受支持的 SDD 任务文档中某个 task item 已完成
- **THEN** Markdown 预览 SHALL NOT 将该 task item 展示为可立即 apply 的目标
- **AND** 该 task item 的 checkbox 状态 SHALL 仍按现有 Markdown task 行为渲染

#### Scenario: 对 task item 触发 Apply
- **WHEN** 用户点击未完成 task item 的 Apply 控件
- **THEN** 系统 SHALL 打开高风险确认/编辑 payload 界面
- **AND** 确认内容 SHALL 指明只执行该 task item
- **AND** 系统 SHALL NOT 在用户确认前向 terminal session 写入内容

#### Scenario: task group 有未完成任务时显示 Apply 控件
- **WHEN** 受支持的 SDD 任务文档中某个 heading 管辖范围内存在一个或多个未完成 task item
- **THEN** Markdown 预览 SHALL 为该 heading 对应的 task group 展示 Apply 控件
- **AND** 该 group Apply 控件 SHALL 表示执行该 task group 内所有未完成 task item

#### Scenario: task group 全部完成时不提供立即 Apply
- **WHEN** 受支持的 SDD 任务文档中某个 heading 管辖范围内的 task item 全部完成
- **THEN** Markdown 预览 SHALL NOT 将该 task group 展示为可立即 apply 的目标

#### Scenario: 对 task group 触发 Apply
- **WHEN** 用户点击 task group 的 Apply 控件
- **THEN** 系统 SHALL 打开高风险确认/编辑 payload 界面
- **AND** 确认内容 SHALL 指明只执行该 group 内所有未完成 task item
- **AND** 系统 SHALL NOT 在用户确认前向 terminal session 写入内容

#### Scenario: Apply 控件不修改任务文档
- **WHEN** 用户点击 task item 或 task group 的 Apply 控件
- **THEN** 系统 SHALL NOT 修改 Markdown 源文件
- **AND** 系统 SHALL NOT 自动勾选或取消任何 task checkbox
