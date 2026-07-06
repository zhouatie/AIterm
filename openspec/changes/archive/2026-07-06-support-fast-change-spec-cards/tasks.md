## 1. 数据模型与扫描

- [x] 1.1 在 SDD workflow 类型中表达 RavenSpec change 模式，至少区分完整 SDD 与 fast-change。
- [x] 1.2 扩展 artifact 类型与标签，支持 `CHANGE.md` 对应的 `change` / `CHANGE` artifact。
- [x] 1.3 在主进程 RavenSpec change 扫描中识别存在 `CHANGE.md` 且未使用完整 SDD 核心 artifact 的 fast-change。
- [x] 1.4 为 fast-change 生成以 `CHANGE.md` 为核心、specs 可选的 artifact 状态，避免输出 PRD/DESIGN/TASK 缺失状态。

## 2. 进度与推荐状态

- [x] 2.1 复用 checkbox 解析能力读取 fast-change `CHANGE.md` 中的 verification checkbox。
- [x] 2.2 为进度数据增加任务/验证语义，确保 fast-change 展示验证进度或无可统计验证项。
- [x] 2.3 调整推荐下一步策略，使 fast-change 默认推荐检查 `CHANGE.md`，不推荐补齐完整 SDD artifact。

## 3. Dashboard 展示与交互

- [x] 3.1 更新 Dashboard artifact label、title 和 pill 渲染，正确展示并打开 fast-change `CHANGE.md`。
- [x] 3.2 更新任务进度行文案，使完整 SDD 显示任务状态，fast-change 显示验证状态。
- [x] 3.3 确认当前 change 选择、刷新、排序和打开 artifact 行为在 fast-change 卡片中复用现有交互。
- [x] 3.4 如 SDD 命令路由的 artifact 目标依赖固定枚举，补齐 `change` artifact 的 label 和打开目标处理。

## 4. 验证

- [x] 4.1 使用参考工程的 `ravenspec/changes/skip-polaroid-paid-task-fetch/CHANGE.md` 或等效本地样例验证卡片显示为 RavenSpec fast-change。
- [x] 4.2 验证 fast-change 卡片不显示 PRD、DESIGN、TASK 缺失，不因没有 specs 显示不完整警告。
- [x] 4.3 验证点击 `CHANGE` artifact 可以在左侧预览区域打开 `CHANGE.md`。
- [x] 4.4 验证完整 SDD RavenSpec change 和 OpenSpec change 的原有 artifact 状态、任务进度与推荐下一步不回退。
