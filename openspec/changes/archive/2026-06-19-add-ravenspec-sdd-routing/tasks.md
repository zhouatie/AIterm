## 1. 数据模型与 workflow provider

- [x] 1.1 将当前 OpenSpec workflow summary 类型扩展为通用 SDD workflow summary，支持 `workflow: openspec | raven`
- [x] 1.2 为 OpenSpec 与 RavenSpec 定义 provider 配置，包含 changes 目录、artifact 文件名、任务 artifact、skill action 映射和推荐下一步策略
- [x] 1.3 将当前 change 状态从仅 OpenSpec 扩展为 workflow + changeName + rootPath，处理同名 change 冲突

## 2. Dashboard 数据加载与展示

- [x] 2.1 扩展主进程扫描逻辑，同时读取 `openspec/changes` 与 `ravenspec/changes`
- [x] 2.2 为 RavenSpec change 解析 `PRD.md`、`DESIGN.md`、`TASK.md` 与 `specs/**/*.md`
- [x] 2.3 扩展任务进度解析，OpenSpec 使用 `tasks.md`，RavenSpec 使用 `TASK.md`
- [x] 2.4 Dashboard change 条目展示 workflow 来源，并在候选选择、当前 change 提示和确认标题中带上 workflow
- [x] 2.5 Dashboard 刷新时按 workflow + changeName 校验当前 change 是否仍存在

## 3. RavenSpec 命令路由

- [x] 3.1 扩展 SDD 命令解析，支持 RavenSpec / ravenspec / raven spec / 瑞文 等 workflow 口令
- [x] 3.2 新增 RavenSpec provider payload 映射：`explore`、`continue`、`apply`、`verify`、`archive`、`sync-specs`
- [x] 3.3 将 RavenSpec `update-change` 映射为 `$ddd-update-change <change-name>`
- [x] 3.4 保持 OpenSpec provider 现有 payload 行为不回退
- [x] 3.5 处理 provider 不支持 action 的错误状态，不向 terminal 写入内容

## 4. 显式跳过门禁

- [x] 4.1 新增跳过门禁解析，识别 `跳过 plan review 直接 apply`、`不用 verify 直接归档` 等表达
- [x] 4.2 在 intent 中记录被显式跳过的门禁，并在确认界面展示
- [x] 4.3 确认发送时只执行目标 action payload，不自动执行被跳过的门禁
- [x] 4.4 保持 `apply`、`archive` 高风险确认要求，禁止跳过确认直接发送

## 4b. 面板动作直接执行

- [x] 4b.1 新增 terminal 执行写入 helper，将 payload 通过 bracketed paste 写入后追加回车
- [x] 4b.2 Dashboard 低风险 action 解析成功后直接执行，不只预填 terminal 输入框
- [x] 4b.3 Dashboard 高风险 action 或包含 skip metadata 的 action 保留确认界面，确认按钮执行 payload
- [x] 4b.4 当前无 active terminal 时保留 payload 草稿并展示无法执行反馈
- [x] 4b.5 将确认按钮文案从“发送到 terminal”调整为“执行”

## 4c. Update Change 文案

- [x] 4c.1 将 change 卡片 Update Change 操作按钮文案从“更新”改为“更新change”

## 5. Dashboard 操作布局

- [x] 5.1 调整 change 卡片操作区结构，使按钮每行最多两个
- [x] 5.2 在窄面板下让操作按钮自动单列显示，避免文本重叠或挤压
- [x] 5.3 确保按钮布局调整不改变推荐下一步、Update Change、设为当前等 action 语义

## 6. 验证

- [x] 6.1 验证 OpenSpec change 仍可展示、设为当前、下一步、Update Change、Apply、Verify、Archive
- [x] 6.2 使用本地临时 `ravenspec/changes` fixture 验证 RavenSpec change 展示、artifact 状态和 `TASK.md` 进度
- [x] 6.3 验证 RavenSpec payload 映射：`$sdd-apply-change`、`$sdd-verify-change`、`$sdd-archive-change`、`$sdd-sync-specs`、`$ddd-update-change`
- [x] 6.4 验证跳过 Plan Review / Verify 的确认界面展示跳过提示，且不自动发送被跳过 action
- [x] 6.5 验证 change 卡片三个及以上操作按钮不会在同一行展示
