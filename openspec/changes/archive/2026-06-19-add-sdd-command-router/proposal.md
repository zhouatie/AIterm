## Why

用户在 AIterm 右侧 terminal 中使用语音输入进行 SDD 开发时，需要频繁输入 `$openspec-explore`、`$openspec-propose`、`$openspec-apply-change`、`$openspec-archive-change` 等长命令，语音识别容易把英文 skill 名、change slug 或 action 名识别错误。

AIterm 已经具备 OpenSpec Dashboard、artifact 状态、推荐下一步和 Markdown 评论发送能力，现在需要在这些状态视图之上增加一个语音友好的 SDD 命令入口，让用户用短口令或自然语言驱动 OpenSpec 工作流，同时在高风险动作前保持明确确认。

## What Changes

- 新增 SDD Command Router：将用户输入的短口令、中文自然语言和常见语音误识别词归一为结构化 SDD action。
- 新增当前 SDD change 语义：用户可以设置或复用当前 change，避免反复语音输入长 slug。
- 新增确认式命令生成：系统展示解析出的 workflow、action、change 和将发送给 agent 的 payload，用户确认后才写入当前 terminal session。
- 新增 Update Change 旁路动作：用户显式要求“更新/收敛当前 change”时，系统生成 `$openspec-update-change` payload，用于先收敛 proposal / design / specs / tasks，再回到 apply。
- 首版支持 OpenSpec workflow 的识别与路由；RavenSpec 首版不实现，相关输入只给出不支持反馈。
- 扩展 OpenSpec Dashboard：用户显式点击推荐动作或说“下一步”时，Dashboard 将当前 change 和推荐 action 交给 SDD Command Router，而不是直接执行命令。
- 保持现有安全边界：不会自动提交 commit，不会自动执行归档 / apply 等高风险动作，不会在推荐状态刷新时自动调用 agent；首版不实现 sync / sync-specs。

## Capabilities

### New Capabilities
- `sdd-command-router`: 定义语音友好的 SDD 命令解析、当前 change 选择、确认式 payload 生成、OpenSpec workflow 路由和 terminal 写入行为。

### Modified Capabilities
- `sdd-workflow-panels`: 扩展 OpenSpec Dashboard 的推荐动作交互，使其在用户显式触发时可以把当前 change 和 action 交给 SDD Command Router，同时继续禁止自动执行。

## Impact

- 影响渲染层左侧 OpenSpec Dashboard：首版 SDD 命令入口放在 Dashboard 顶部。
- 可能新增 SDD command 解析模块、OpenSpec provider 配置、当前 change 状态存储和 terminal payload 生成逻辑。
- 复用现有 terminal session 写入能力、OpenSpec change 扫描数据、Markdown artifact 打开能力和 Agent Inbox / agent status 语义。
- 不引入远程 AI API，不要求新增外部依赖，不改变 OpenSpec CLI 的底层实现；RavenSpec 首版不纳入实现范围。
