# sdd-command-router Specification

## Purpose
定义语音友好的 SDD 命令入口、命令意图归一、当前 change 默认值、workflow provider 路由与确认式 terminal 写入能力，使用户可以通过短口令或自然语言稳定驱动 OpenSpec 与 RavenSpec 工作流。

## Requirements
### Requirement: SDD 命令入口
系统 SHALL 提供一个语音友好的 SDD 命令入口，使用户可以用短口令或自然语言表达 OpenSpec 工作流动作。该入口 SHALL 不替代现有 terminal 输入能力，且 SHALL 不在用户确认前向 terminal session 写入内容。

#### Scenario: 打开 SDD 命令入口
- **WHEN** 用户在主工作界面触发 SDD 命令入口
- **THEN** 系统 SHALL 展示可输入短口令或自然语言的命令输入区
- **AND** 命令输入区 SHALL 保留当前 terminal session 的上下文提示

#### Scenario: 输入短口令
- **WHEN** 用户在 SDD 命令入口输入 `继续当前`
- **THEN** 系统 SHALL 将该输入解析为 SDD action `continue`
- **AND** 系统 SHALL 在确认界面展示解析结果，而不是立即写入 terminal

#### Scenario: 输入自然语言需求
- **WHEN** 用户在 SDD 命令入口输入包含新需求描述的自然语言
- **AND** 输入未明确指定已有 change
- **THEN** 系统 SHALL 将该输入解析为可用于 `propose` 或 `explore` 的需求文本
- **AND** 系统 SHALL 在确认界面保留原始语音识别文本

### Requirement: SDD action 归一
系统 SHALL 将常见中文动作、英文动作和语音误识别词归一为结构化 SDD action。解析结果 SHALL 至少包含 workflow、action、changeName、artifact、originalText 和 normalizedText 字段；无法确定的字段 SHALL 标记为待确认，而不是臆造。系统 SHALL 能识别 OpenSpec 与 RavenSpec workflow，并 SHALL 将显式跳过门禁的表达记录在解析结果中。

#### Scenario: 归一 OpenSpec 动作
- **WHEN** 用户输入 `open spec apply 当前`
- **THEN** 系统 SHALL 将 workflow 归一为 `openspec`
- **AND** 系统 SHALL 将 action 归一为 `apply`

#### Scenario: 归一 RavenSpec 动作
- **WHEN** 用户输入 `raven spec apply 当前`
- **THEN** 系统 SHALL 将 workflow 归一为 `raven`
- **AND** 系统 SHALL 将 action 归一为 `apply`

#### Scenario: 归一归档误识别
- **WHEN** 用户输入包含 `achieve change`
- **THEN** 系统 SHALL 将 action 归一为 `archive`
- **AND** 系统 SHALL 在确认界面展示原始词和归一后的 action

#### Scenario: 归一 Update Change 动作
- **WHEN** 用户输入 `更新当前 change：RavenSpec 先不实现`
- **THEN** 系统 SHALL 将 action 归一为 `update-change`
- **AND** 系统 SHALL 将 `RavenSpec 先不实现` 作为本轮待收敛事项保留在确认 payload 中

#### Scenario: 归一 RavenSpec Update Change
- **WHEN** 用户输入 `raven update 当前 change：修正 TASK`
- **THEN** 系统 SHALL 将 workflow 归一为 `raven`
- **AND** 系统 SHALL 将 action 归一为 `update-change`
- **AND** 系统 SHALL 将 `修正 TASK` 作为本轮待收敛事项保留在确认 payload 中

#### Scenario: 归一跳过 Plan Review
- **WHEN** 用户输入 `跳过 plan review 直接 apply`
- **THEN** 系统 SHALL 将 action 归一为 `apply`
- **AND** 系统 SHALL 将 `plan-review` 记录为显式跳过的门禁
- **AND** 系统 SHALL NOT 自动执行 `plan-review`

#### Scenario: 归一跳过 Verify
- **WHEN** 用户输入 `不用 verify 直接归档`
- **THEN** 系统 SHALL 将 action 归一为 `archive`
- **AND** 系统 SHALL 将 `verify` 记录为显式跳过的门禁
- **AND** 系统 SHALL NOT 自动执行 `verify`

#### Scenario: 解析不确定
- **WHEN** 用户输入无法唯一映射到一个 SDD action
- **THEN** 系统 SHALL 展示待确认状态
- **AND** 系统 SHALL 要求用户补充或选择 action
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

### Requirement: 当前 SDD change
系统 SHALL 支持为当前工作区或当前 terminal session 维护一个当前 SDD change。当前 change SHALL 包含 workflow 与 changeName，并只作为命令解析默认值使用，不 SHALL 修改 OpenSpec 或 RavenSpec artifact 文件。

#### Scenario: 设置当前 OpenSpec change
- **WHEN** 用户从 OpenSpec active change 列表选择一个 change 并设为当前 change
- **THEN** 系统 SHALL 记录该 change 的 workflow 为 `openspec`
- **AND** 系统 SHALL 记录该 change 的 changeName
- **AND** 后续未显式指定 change 的 OpenSpec SDD 命令 SHALL 默认使用该 change

#### Scenario: 设置当前 RavenSpec change
- **WHEN** 用户从 RavenSpec active change 列表选择一个 change 并设为当前 change
- **THEN** 系统 SHALL 记录该 change 的 workflow 为 `raven`
- **AND** 系统 SHALL 记录该 change 的 changeName
- **AND** 后续未显式指定 change 的 RavenSpec SDD 命令 SHALL 默认使用该 change

#### Scenario: 使用当前 change
- **WHEN** 当前 SDD change 已设置为 workflow `raven` 且 changeName 为 `add-login-flow`
- **AND** 用户输入 `验证当前`
- **THEN** 系统 SHALL 将 workflow 解析为 `raven`
- **AND** 系统 SHALL 将 changeName 解析为 `add-login-flow`
- **AND** 系统 SHALL 将 action 解析为 `verify`

#### Scenario: 多个候选 change
- **WHEN** 当前工作目录存在多个 active SDD changes
- **AND** 用户输入未指定 change 且当前 change 未设置
- **THEN** 系统 SHALL 展示候选 change 列表
- **AND** 候选项 SHALL 展示 workflow 与 changeName
- **AND** 系统 SHALL 允许用户通过序号或点击选择目标 change
- **AND** 系统 SHALL NOT 自动选择第一个候选项

#### Scenario: 当前 change 不存在
- **WHEN** 已记录的当前 SDD change 在对应 workflow 的磁盘目录下已不存在
- **THEN** 系统 SHALL 清除该当前 change
- **AND** 系统 SHALL 要求用户重新选择目标 change

### Requirement: Workflow 路由
系统 SHALL 基于解析结果将 SDD action 路由到对应 workflow provider。provider SHALL 只负责生成对应工作流的 agent payload 或 skill 触发文本，不 SHALL 直接修改 artifact 文件或直接执行 OpenSpec / RavenSpec CLI。OpenSpec provider SHALL 生成 `$openspec-*` payload；RavenSpec provider SHALL 生成 `$sdd-*` 或 `$ddd-update-change` payload。

#### Scenario: 路由到 OpenSpec provider
- **WHEN** 解析结果的 workflow 为 `openspec`
- **THEN** 系统 SHALL 使用 OpenSpec provider 生成对应 action 的 agent payload
- **AND** payload SHALL 包含目标 changeName 和 action

#### Scenario: 路由到 RavenSpec provider
- **WHEN** 解析结果的 workflow 为 `raven`
- **THEN** 系统 SHALL 使用 RavenSpec provider 生成对应 action 的 agent payload
- **AND** payload SHALL 包含目标 changeName 和 action

#### Scenario: RavenSpec Explore payload
- **WHEN** 解析结果的 workflow 为 `raven`
- **AND** 解析结果的 action 为 `explore`
- **THEN** 系统 SHALL 生成 `$sdd-explore` 对应的 agent payload

#### Scenario: RavenSpec Apply payload
- **WHEN** 解析结果的 workflow 为 `raven`
- **AND** 解析结果的 action 为 `apply`
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成 `$sdd-apply-change <change-name>` 对应的 agent payload

#### Scenario: RavenSpec Update Change payload
- **WHEN** 解析结果的 workflow 为 `raven`
- **AND** 解析结果的 action 为 `update-change`
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成 `$ddd-update-change <change-name>` 对应的 agent payload
- **AND** 当用户输入包含本轮待收敛事项时，payload SHALL 直接包含该事项正文

#### Scenario: RavenSpec Sync Specs payload
- **WHEN** 解析结果的 workflow 为 `raven`
- **AND** 解析结果的 action 为 `sync-specs`
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成 `$sdd-sync-specs <change-name>` 对应的 agent payload

#### Scenario: workflow 未知
- **WHEN** 解析结果无法确定 workflow
- **THEN** 系统 SHALL 要求用户补充 OpenSpec 或 RavenSpec workflow
- **AND** 系统 SHALL NOT 默认猜测 workflow

#### Scenario: provider 不支持 action
- **WHEN** 目标 workflow provider 不支持解析出的 action
- **THEN** 系统 SHALL 展示该 action 不可用的反馈
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: 生成 OpenSpec Update Change payload
- **WHEN** 解析结果的 workflow 为 `openspec`
- **AND** 解析结果的 action 为 `update-change`
- **AND** 目标 change 已确定
- **THEN** 系统 SHALL 生成 `$openspec-update-change <change-name>` 对应的 agent payload
- **AND** 当用户输入包含本轮待收敛事项时，payload SHALL 直接包含该事项正文
- **AND** 系统 SHALL 在确认后才将 payload 写入 terminal session

#### Scenario: Update Change 缺少收敛说明
- **WHEN** 用户触发 `update-change`
- **AND** 输入未包含本轮待收敛事项
- **THEN** 系统 SHALL 展示可编辑的确认 payload
- **AND** payload SHALL 只包含对应 workflow 的 update change 命令
- **AND** payload SHALL NOT 自动预填 `本轮待收敛事项` 或补充说明占位文本
- **AND** 系统 SHALL NOT 在确认前向 terminal session 写入内容

### Requirement: 确认式 terminal 写入
系统 SHALL 支持将 SDD 命令 payload 写入当前活跃 terminal session 并立即执行。低风险 action MAY 在解析成功后直接执行；高风险 action、包含显式跳过门禁的 action、需要用户编辑 payload 的 action SHALL 在执行前展示确认界面。确认界面 SHALL 展示 workflow、action、changeName、目标 artifact、原始输入、归一结果、显式跳过的门禁和即将执行的 payload。

#### Scenario: 低风险 action 直接执行
- **WHEN** SDD 命令解析成功
- **AND** 解析结果为低风险 action
- **AND** 解析结果不包含显式跳过的门禁
- **AND** 当前存在活跃 terminal session
- **AND** 用户通过 Dashboard 操作触发该命令
- **THEN** 系统 SHALL 将生成的 payload 写入当前活跃 terminal session
- **AND** 系统 SHALL 追加执行所需的回车输入
- **AND** 系统 SHALL NOT 只把 payload 停留在 terminal 输入框中

#### Scenario: 用户确认后执行
- **WHEN** SDD 命令解析成功
- **AND** 当前存在活跃 terminal session
- **AND** 用户确认执行
- **THEN** 系统 SHALL 将生成的 payload 写入当前活跃 terminal session
- **AND** 系统 SHALL 追加执行所需的回车输入
- **AND** 系统 SHALL 保持 terminal session 处于可继续输入状态

#### Scenario: 用户取消执行
- **WHEN** SDD 命令确认界面已展示
- **AND** 用户取消执行
- **THEN** 系统 SHALL 关闭或保留草稿状态
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: 当前无活跃 terminal
- **WHEN** 用户确认发送 SDD 命令
- **AND** 当前不存在活跃 terminal session
- **THEN** 系统 SHALL 展示无法发送的明确反馈
- **AND** 系统 SHALL 保留解析结果和 payload 草稿

#### Scenario: 高风险 action 必须确认
- **WHEN** 解析结果的 action 为 `apply`、`archive` 或等效高风险动作
- **THEN** 系统 SHALL 要求用户显式确认
- **AND** 系统 SHALL NOT 支持跳过确认直接执行

#### Scenario: 展示跳过门禁提示
- **WHEN** 解析结果包含显式跳过的门禁
- **THEN** 确认界面 SHALL 展示将跳过的门禁名称
- **AND** 系统 SHALL NOT 自动执行被跳过的门禁 action
- **AND** 系统 SHALL 在用户确认后只执行目标 action 的 payload

#### Scenario: 当前无活跃 terminal 时保留确认
- **WHEN** SDD 命令解析成功
- **AND** 当前不存在活跃 terminal session
- **THEN** 系统 SHALL 展示无法执行的明确反馈
- **AND** 系统 SHALL 保留解析结果和 payload 草稿

#### Scenario: OpenSpec sync-specs 暂不支持
- **WHEN** 用户输入 `open spec sync`、`openspec sync specs` 或等效 OpenSpec sync 口令
- **THEN** 系统 SHALL 展示 OpenSpec sync-specs 当前暂不支持的反馈
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

### Requirement: SDD 命令草稿
系统 SHALL 支持将语音识别出的长需求文本保存在 SDD 命令草稿中，并允许用户在发送前编辑。草稿 SHALL 仅保存在当前应用会话内，除非用户显式发送或保存到 artifact。

#### Scenario: 生成提案草稿
- **WHEN** 用户输入一段需求描述并选择 `propose`
- **THEN** 系统 SHALL 生成可发送给 agent 的 proposal 请求草稿
- **AND** 草稿 SHALL 包含原始需求文本

#### Scenario: 编辑草稿后发送
- **WHEN** 用户在确认界面修改 payload 草稿
- **AND** 用户确认发送
- **THEN** 系统 SHALL 将修改后的 payload 写入当前活跃 terminal session

#### Scenario: 清空草稿
- **WHEN** 用户清空 SDD 命令草稿
- **THEN** 系统 SHALL 移除当前草稿内容
- **AND** 系统 SHALL NOT 修改任何 OpenSpec artifact 文件

### Requirement: Artifact 目标动作
系统 SHALL 支持将 SDD action 定位到当前 change 的常见 artifact，包括 proposal、design、specs 和 tasks。artifact 目标 SHALL 用于生成 payload 或打开文件，不 SHALL 隐式修改文件。

#### Scenario: 打开当前 tasks
- **WHEN** 用户输入 `打开当前任务`
- **AND** 当前 SDD change 存在 `tasks.md`
- **THEN** 系统 SHALL 打开该 change 的 `tasks.md`
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: 记录设计决定
- **WHEN** 用户输入 `把这个决定记到 design`
- **AND** 当前 SDD change 已确定
- **THEN** 系统 SHALL 将 action 解析为更新 design artifact 的 agent payload
- **AND** 系统 SHALL 在确认后才将 payload 写入 terminal session

#### Scenario: 目标 artifact 缺失
- **WHEN** 用户请求打开一个当前 change 中不存在的 artifact
- **THEN** 系统 SHALL 展示 artifact 缺失反馈
- **AND** 系统 SHALL NOT 创建空 artifact 文件
