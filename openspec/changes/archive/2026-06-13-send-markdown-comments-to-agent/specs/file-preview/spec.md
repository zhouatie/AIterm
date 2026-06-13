## ADDED Requirements

### Requirement: Markdown 评论发送到当前 Agent
系统 SHALL 允许用户将 Markdown 预览中的单条或多条评论作为结构化文本发送到当前活跃 terminal tab，使该 tab 中运行的 agent 能读取对应文件、定位被评论原文并处理评论意见。发送动作 SHALL 使用现有 terminal 输入链路写入当前活跃 PTY，不 SHALL 直接调用具体 agent 的 API。

#### Scenario: 发送单条评论到当前 terminal
- **WHEN** 用户在 Markdown 评论详情或评论列表中触发单条评论的发送给 agent 操作
- **AND** 当前存在活跃 terminal session
- **THEN** 系统 SHALL 将该评论格式化为 agent payload
- **AND** 系统 SHALL 通过当前活跃 terminal session 的输入链路写入该 payload
- **AND** payload SHALL 包含评论所在文件的 `@` 相对路径引用、评论 ID、被评论原文和评论正文

#### Scenario: 发送后不自动提交
- **WHEN** 系统将评论 payload 写入当前活跃 terminal session
- **THEN** payload SHALL NOT 追加会触发提交或执行的回车输入
- **AND** 系统 SHALL 使用粘贴语义写入多行 payload，使支持粘贴边界的 agent prompt 将内容放入输入框等待用户确认

#### Scenario: 多选评论后发送
- **WHEN** 用户在 Markdown 评论列表中选中多条评论并触发发送选中评论操作
- **AND** 当前存在活跃 terminal session
- **THEN** 系统 SHALL 将每条选中评论格式化为独立评论块
- **AND** 系统 SHALL 一次性将包含所有选中评论块的 payload 写入当前活跃 terminal session
- **AND** 每条评论块 SHALL 保留自己的 `@` 文件路径、评论 ID、被评论原文和评论正文

#### Scenario: 多选评论后删除
- **WHEN** 用户在 Markdown 评论列表中选中一条或多条评论并触发删除选中评论操作
- **THEN** 系统 SHALL 从当前文件评论列表中移除所有选中评论
- **AND** 系统 SHALL 通过现有评论保存链路保存删除后的评论列表
- **AND** 系统 SHALL 清空已删除评论的选中状态
- **AND** 若当前正在查看的评论被删除，系统 SHALL 退出该评论详情态

#### Scenario: 多条评论注入内容包含处理规则
- **WHEN** 系统生成包含多条评论的 agent payload
- **THEN** payload SHALL 包含简短规则说明，说明每个评论块是独立评论、`@` 后文件为评论所在文件、`selected_text` 为锚定原文、`comment` 为用户意见
- **AND** payload SHALL 要求当评论文件属于 OpenSpec 或 Raven change 时优先更新对应 spec/change artifacts，必要时再修改代码
- **AND** payload SHALL 要求评论意图不明确时先询问用户

#### Scenario: 单条评论注入短规则
- **WHEN** 系统生成只包含一条评论的 agent payload
- **THEN** payload SHALL 包含一行短规则说明和该评论对应的评论块
- **AND** 短规则说明 SHALL 要求按 `comment` 修改 `@` 文件，且当 workflow 是 openspec 或 raven 时先更新对应 spec/change artifacts
- **AND** payload SHALL NOT 包含多条评论使用的长规则说明

#### Scenario: 评论块以文件引用开头
- **WHEN** 系统格式化任一评论块
- **THEN** 该评论块 SHALL 包含一行以 `@` 开头的项目相对文件路径
- **AND** 该 `@` 路径 SHALL 指向评论所在 Markdown 文件
- **AND** 该评论块 SHALL 在文件路径之后包含 `selected_text` 与 `comment` 两个明确字段

#### Scenario: 推断 OpenSpec change 元信息
- **WHEN** 评论所在文件路径位于 `openspec/changes/<change-name>/` 下
- **THEN** 系统 SHALL 在该评论块元信息中标记 `workflow="openspec"`
- **AND** 系统 SHALL 将 `<change-name>` 作为该评论块的 change 名称

#### Scenario: 推断 Raven change 元信息
- **WHEN** 评论所在文件路径位于 `ravenspec/changes/<change-name>/` 下
- **THEN** 系统 SHALL 在该评论块元信息中标记 `workflow="raven"`
- **AND** 系统 SHALL 将 `<change-name>` 作为该评论块的 change 名称

#### Scenario: 普通 Markdown 文件评论
- **WHEN** 评论所在文件路径不属于已识别的 OpenSpec 或 Raven change 路径
- **THEN** 系统 SHALL 仍允许发送该评论
- **AND** 系统 SHALL 将该评论块的 workflow 标记为 unknown 或省略具体 change 名称

#### Scenario: 当前无活跃 terminal
- **WHEN** 用户触发发送给 agent 操作
- **AND** 当前不存在活跃 terminal session
- **THEN** 系统 SHALL 不丢弃评论内容
- **AND** 系统 SHALL 不修改 Markdown 源文件或评论持久化数据
- **AND** 系统 SHALL 向用户展示无法发送的明确反馈

#### Scenario: 发送动作不改变评论数据
- **WHEN** 用户将一条或多条评论发送给 agent
- **THEN** 系统 SHALL NOT 修改源 Markdown 文件
- **AND** 系统 SHALL NOT 因发送动作调用评论保存 API
- **AND** 系统 SHALL NOT 改变 `.aiterm/markdown-preview-comments.json` 中的评论数据

#### Scenario: 删除选中评论不触发发送
- **WHEN** 用户删除选中评论
- **THEN** 系统 SHALL NOT 向当前 terminal session 写入 agent payload
- **AND** 系统 SHALL NOT 修改源 Markdown 文件正文

#### Scenario: 发送后轻量反馈
- **WHEN** 系统成功将评论 payload 写入当前活跃 terminal session
- **THEN** 评论面板 SHALL 展示轻量成功反馈或等效状态
- **AND** 系统 SHALL 保持评论面板可继续查看、编辑、删除或发送其他评论
