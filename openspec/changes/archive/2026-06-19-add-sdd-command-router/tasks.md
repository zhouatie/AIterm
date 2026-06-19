## 1. 决策确认

- [x] 1.1 已确认 SDD 命令入口首版放在 OpenSpec Dashboard 顶部
- [x] 1.2 已确认 RavenSpec 首版不实现，仅对相关输入展示暂不支持反馈
- [x] 1.3 已确认高风险 action 范围为 `apply`、`archive`；首版不实现 `sync` / `sync-specs`

## 2. Router 与 payload 工具

- [x] 2.1 新增 SDD command intent 类型，覆盖 workflow、action、changeName、artifact、originalText、normalizedText、confidence 和 risk
- [x] 2.2 新增 action / workflow / artifact 归一规则，覆盖中文短口令、英文 action 和常见语音误识别词
- [x] 2.3 实现当前 change 解析逻辑，支持显式 change、当前 change、候选 change 待选择和 change 不存在清除
- [x] 2.4 实现 OpenSpec provider，生成 `$openspec-*` skill 触发文本或等效 agent payload
- [x] 2.5 实现 RavenSpec 输入暂不支持反馈，不生成 provider payload
- [x] 2.6 实现 sync / sync-specs 输入暂不支持反馈，不向 terminal 写入内容
- [x] 2.7 复用或抽取 bracketed paste 包裹逻辑，保证多行 payload 写入 terminal 时稳定

## 3. 命令入口与确认界面

- [x] 3.1 新增 SDD 命令入口组件，支持输入短口令或自然语言需求
- [x] 3.2 新增解析结果确认界面，展示 workflow、action、changeName、artifact、原始输入、归一结果和 payload 预览
- [x] 3.3 支持用户在确认界面编辑 payload 草稿，并在取消时不写入 terminal
- [x] 3.4 接入当前 active terminal session，用户确认后调用 `window.terminalApi.input`
- [x] 3.5 处理当前无 active terminal 的错误状态，保留 payload 草稿
- [x] 3.6 对高风险 action 禁止跳过确认

## 4. OpenSpec Dashboard 集成

- [x] 4.1 为 Dashboard change 条目增加“设为当前”能力，并将当前 SDD change 绑定到 rootPath
- [x] 4.2 为 Dashboard 推荐动作增加显式触发入口，触发后交给 SDD Command Router 而不是直接写 terminal
- [x] 4.3 支持用户输入“下一步”时使用当前 change 的 Dashboard 推荐 action 作为候选 action
- [x] 4.4 Dashboard 刷新后校验当前 change 是否仍存在，不存在时清除当前 change
- [x] 4.5 保持 artifact pill 打开文件的现有行为不变

## 5. 验证

- [x] 5.1 手动验证短口令：`继续当前`、`执行当前`、`验证当前`、`归档当前`
- [x] 5.2 手动验证误识别归一：`achieve change` 被归一为 `archive`
- [x] 5.3 手动验证多个 active changes 且未设置当前 change 时，系统要求用户选择目标 change
- [x] 5.4 手动验证高风险 action 取消确认时，不向 terminal 写入内容
- [x] 5.5 手动验证无 active terminal 时，系统展示错误并保留草稿
- [x] 5.6 手动验证 Dashboard 推荐动作只打开确认界面，不自动执行 agent 或 CLI
