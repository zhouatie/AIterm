## Why

当前 SDD Dashboard 的 RavenSpec 卡片只按完整 SDD artifact 形态展示，遇到 `ravenspec/changes/<change>/CHANGE.md` 的 fast-change 目录时会误判为缺少 `PRD.md`、`DESIGN.md`、`TASK.md`。参考 `rn-community-collect-cards` 工程，fast-change 是真实存在的单文件变更模式，需要在卡片中被识别为有效 change。

## What Changes

- RavenSpec active change 扫描增加 fast-change 模式识别：当 change 目录存在 `CHANGE.md` 且不存在完整 SDD artifact 时，将其展示为 fast-change。
- fast-change 卡片展示 `CHANGE.md` artifact 状态，不再显示 `PRD`、`DESIGN`、`TASK` 缺失。
- fast-change 可保留 `specs/**/*.md` 摘要；没有 specs 时不将其视为不完整，因为 fast-change 允许 `Specs Changed` 为 `_无_`。
- fast-change 任务进度展示改为基于 `CHANGE.md` 中的 verification checkbox 或显示无可统计验证项，不再使用 `TASK.md` 缺失文案。
- Dashboard 打开 artifact、当前 change 选择、排序与刷新行为继续复用现有 SDD change 卡片交互。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `sdd-workflow-panels`: RavenSpec change 卡片需要识别并正确展示 `CHANGE.md` fast-change 模式。

## Impact

- 影响主进程 SDD workflow 扫描与 `OpenSpecChangeSummary` 数据模型，需表达 RavenSpec 完整 SDD 与 fast-change 两种 artifact 集合。
- 影响 `OpenSpecDashboard` 卡片 artifact 标签、任务/验证进度文案和点击打开逻辑。
- 可能影响 `sdd-command-router` 中与 artifact 目标、推荐下一步相关的类型和文案；不新增远程 API、不自动执行 Raven CLI、不改变 OpenSpec 现有展示语义。
