## ADDED Requirements

### Requirement: Scoped SDD Apply Payload
系统 SHALL 支持为已确定 workflow、change 和任务范围生成 scoped apply agent payload。该 payload SHALL 复用对应 workflow 的 apply skill 触发文本，并 SHALL 明确声明只执行选中的 task item 或 task group 未完成任务。Scoped apply SHALL 继续按高风险 action 处理，必须在确认后才写入 terminal session。

#### Scenario: OpenSpec task item apply payload
- **WHEN** 用户从 OpenSpec task item 触发 scoped apply
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成包含 `$openspec-apply-change <change-name>` 的 agent payload
- **AND** payload SHALL 明确要求只执行选中的 task item

#### Scenario: OpenSpec task group apply payload
- **WHEN** 用户从 OpenSpec task group 触发 scoped apply
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成包含 `$openspec-apply-change <change-name>` 的 agent payload
- **AND** payload SHALL 明确要求只执行该 task group 内所有未完成 task item

#### Scenario: RavenSpec task item apply payload
- **WHEN** 用户从 RavenSpec task item 触发 scoped apply
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成包含 `$sdd-apply-change <change-name>` 的 agent payload
- **AND** payload SHALL 明确要求只执行选中的 task item

#### Scenario: RavenSpec task group apply payload
- **WHEN** 用户从 RavenSpec task group 触发 scoped apply
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成包含 `$sdd-apply-change <change-name>` 的 agent payload
- **AND** payload SHALL 明确要求只执行该 task group 内所有未完成 task item

#### Scenario: Scoped apply 必须确认
- **WHEN** 系统生成 scoped apply payload
- **THEN** 系统 SHALL 将该操作视为高风险 apply action
- **AND** 系统 SHALL 展示可编辑的确认 payload
- **AND** 系统 SHALL NOT 在用户确认前向 terminal session 写入内容

#### Scenario: 当前无活跃 terminal 时保留 scoped apply payload
- **WHEN** 用户确认发送 scoped apply payload
- **AND** 当前不存在活跃 terminal session
- **THEN** 系统 SHALL 展示无法发送的明确反馈
- **AND** 系统 SHALL 保留 payload 草稿
