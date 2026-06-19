## ADDED Requirements

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
系统 SHALL 将常见中文动作、英文动作和语音误识别词归一为结构化 SDD action。解析结果 SHALL 至少包含 workflow、action、changeName、artifact、originalText 和 normalizedText 字段；无法确定的字段 SHALL 标记为待确认，而不是臆造。

#### Scenario: 归一 OpenSpec 动作
- **WHEN** 用户输入 `open spec apply 当前`
- **THEN** 系统 SHALL 将 workflow 归一为 `openspec`
- **AND** 系统 SHALL 将 action 归一为 `apply`

#### Scenario: 归一归档误识别
- **WHEN** 用户输入包含 `achieve change`
- **THEN** 系统 SHALL 将 action 归一为 `archive`
- **AND** 系统 SHALL 在确认界面展示原始词和归一后的 action

#### Scenario: 归一 Update Change 动作
- **WHEN** 用户输入 `更新当前 change：RavenSpec 先不实现`
- **THEN** 系统 SHALL 将 action 归一为 `update-change`
- **AND** 系统 SHALL 将 `RavenSpec 先不实现` 作为本轮待收敛事项保留在确认 payload 中

#### Scenario: RavenSpec 输入不支持
- **WHEN** 用户输入包含 `raven spec 验证当前`
- **THEN** 系统 SHALL 展示 RavenSpec 首版不支持的反馈
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: 解析不确定
- **WHEN** 用户输入无法唯一映射到一个 SDD action
- **THEN** 系统 SHALL 展示待确认状态
- **AND** 系统 SHALL 要求用户补充或选择 action
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

### Requirement: 当前 SDD change
系统 SHALL 支持为当前工作区或当前 terminal session 维护一个当前 OpenSpec change。当前 change SHALL 只作为命令解析默认值使用，不 SHALL 修改 OpenSpec artifact 文件。

#### Scenario: 设置当前 change
- **WHEN** 用户从 active change 列表选择一个 change 并设为当前 change
- **THEN** 系统 SHALL 记录该 change 的 workflow 和 changeName
- **AND** 后续未显式指定 change 的 SDD 命令 SHALL 默认使用该 change

#### Scenario: 使用当前 change
- **WHEN** 当前 SDD change 已设置为 `add-sdd-command-router`
- **AND** 用户输入 `验证当前`
- **THEN** 系统 SHALL 将 changeName 解析为 `add-sdd-command-router`
- **AND** 系统 SHALL 将 action 解析为 `verify`

#### Scenario: 多个候选 change
- **WHEN** 当前工作目录存在多个 active SDD changes
- **AND** 用户输入未指定 change 且当前 change 未设置
- **THEN** 系统 SHALL 展示候选 change 列表
- **AND** 系统 SHALL 允许用户通过序号或点击选择目标 change
- **AND** 系统 SHALL NOT 自动选择第一个候选项

#### Scenario: 当前 change 不存在
- **WHEN** 已记录的当前 SDD change 在磁盘上已不存在
- **THEN** 系统 SHALL 清除该当前 change
- **AND** 系统 SHALL 要求用户重新选择目标 change

### Requirement: Workflow 路由
系统 SHALL 基于解析结果将 SDD action 路由到 OpenSpec provider。provider SHALL 只负责生成对应工作流的 agent payload 或 skill 触发文本，不 SHALL 直接修改 artifact 文件或直接执行 OpenSpec CLI。RavenSpec 首版不实现，相关输入 SHALL 被明确拒绝或提示暂不支持。

#### Scenario: 路由到 OpenSpec provider
- **WHEN** 解析结果的 workflow 为 `openspec`
- **THEN** 系统 SHALL 使用 OpenSpec provider 生成对应 action 的 agent payload
- **AND** payload SHALL 包含目标 changeName 和 action

#### Scenario: RavenSpec workflow 暂不支持
- **WHEN** 解析结果的 workflow 为 `raven`
- **THEN** 系统 SHALL 展示 RavenSpec 首版暂不支持的反馈
- **AND** 系统 SHALL NOT 生成 RavenSpec agent payload
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: workflow 未知
- **WHEN** 解析结果无法确定 workflow
- **THEN** 系统 SHALL 要求用户补充 OpenSpec workflow 或明确 action
- **AND** 系统 SHALL NOT 默认猜测 workflow

#### Scenario: provider 不支持 action
- **WHEN** 目标 workflow provider 不支持解析出的 action
- **THEN** 系统 SHALL 展示该 action 不可用的反馈
- **AND** 系统 SHALL NOT 向 terminal session 写入内容

#### Scenario: 生成 Update Change payload
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
- **AND** payload SHALL 只包含 `$openspec-update-change <change-name>` 命令
- **AND** payload SHALL NOT 自动预填 `本轮待收敛事项` 或补充说明占位文本
- **AND** 系统 SHALL NOT 在确认前向 terminal session 写入内容

### Requirement: 确认式 terminal 写入
系统 SHALL 在向 terminal session 写入 SDD 命令 payload 前展示确认界面。确认界面 SHALL 展示 workflow、action、changeName、目标 artifact、原始输入、归一结果和即将写入 terminal 的 payload。

#### Scenario: 用户确认后写入
- **WHEN** SDD 命令解析成功
- **AND** 当前存在活跃 terminal session
- **AND** 用户确认发送
- **THEN** 系统 SHALL 将生成的 payload 写入当前活跃 terminal session
- **AND** 系统 SHALL 保持 terminal session 处于可继续输入状态

#### Scenario: 用户取消发送
- **WHEN** SDD 命令确认界面已展示
- **AND** 用户取消发送
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
- **AND** 系统 SHALL NOT 支持跳过确认直接发送

#### Scenario: sync-specs 首版不支持
- **WHEN** 用户输入 `sync`、`sync specs` 或 `同步 specs`
- **THEN** 系统 SHALL 展示 sync-specs 首版暂不支持的反馈
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
