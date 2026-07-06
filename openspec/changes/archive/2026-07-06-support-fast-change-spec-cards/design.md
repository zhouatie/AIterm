## Context

当前 Dashboard 的 SDD workflow provider 已支持 `openspec/changes` 与 `ravenspec/changes`，但 RavenSpec provider 被建模为完整 SDD schema：`PRD.md`、`DESIGN.md`、`TASK.md`、`specs/**/*.md`。参考工程 `rn-community-collect-cards` 中存在 active fast-change 目录，例如 `ravenspec/changes/skip-polaroid-paid-task-fetch/CHANGE.md`，该目录没有 PRD、DESIGN、TASK，也可以没有 specs。

这类目录不是不完整的 RavenSpec change，而是另一种轻量变更模式。Dashboard 当前把它展示成多个 artifact 缺失，会误导用户继续补齐并不属于该模式的文件。

## Goals / Non-Goals

**Goals:**

- RavenSpec Dashboard 卡片识别 `CHANGE.md` fast-change 模式。
- fast-change 卡片展示 `CHANGE.md` 与可选 specs 摘要，不显示 PRD/DESIGN/TASK 缺失。
- fast-change 的进度文案来自 `CHANGE.md` 中的验证 checkbox；没有 checkbox 时显示无可统计验证项。
- 用户可以从卡片直接打开 `CHANGE.md`。
- 保持 OpenSpec 和 RavenSpec 完整 SDD 模式现有展示语义不变。

**Non-Goals:**

- 不新增 Raven CLI 调用，不在 Dashboard 中直接执行 fast-change 工作流。
- 不把 `CHANGE.md` 自动拆分成 PRD、DESIGN、TASK 或 specs。
- 不自动修改 `CHANGE.md` 中的 verification checkbox。
- 不为缺少 `CHANGE.md` 的未知 RavenSpec 目录猜测模式。

## Decisions

### 1. RavenSpec provider 增加明确的 change 模式

在扫描 `ravenspec/changes/<change>` 时先识别模式：

- `fast-change`: 存在 `CHANGE.md`，且目录没有完整 SDD 的核心 artifact。
- `sdd`: 沿用现有 `PRD.md`、`DESIGN.md`、`TASK.md`、`specs/**/*.md` 形态。

选择显式模式字段，而不是只在 artifact 列表里临时插入 `CHANGE.md`，是为了让卡片文案、进度解析和推荐下一步可以基于模式做清晰分支，避免把 fast-change 当成完整 SDD 的部分缺失状态。

### 2. fast-change artifact 集合以 `CHANGE.md` 为核心

fast-change 卡片的 artifact 列表为：

- `change`: `CHANGE.md`
- `specs`: 可选的 `specs/**/*.md`

其中 `specs` 缺失不代表状态缺失，因为参考样例允许 `Specs Changed` 为 `_无_`。UI 可显示 specs 数量；没有 specs 时不渲染缺失 pill，或渲染为可选摘要，但不能用警告态表达不完整。

需要扩展共享类型，例如 `OpenSpecArtifactId` 增加 `change`，并让 artifact label 支持 `CHANGE`。

### 3. fast-change 进度解析读取 verification checkbox

fast-change 没有 `TASK.md`，因此任务进度不应显示 `tasks 缺失`。进度解析改为读取 `CHANGE.md` 中的 GFM checkbox：

- 有 checkbox：显示完成数和总数，文案语义为验证进度。
- 无 checkbox：显示无可统计验证项。

现有 checkbox 解析函数可以复用，但调用方需要知道当前模式下它代表 verification，而不是 task。

### 4. fast-change 推荐下一步偏向检查

fast-change 是单文件轻量变更记录，Dashboard 不应因为没有任务文件推荐创建 tasks。默认推荐状态使用 `inspect` 或等效的打开/检查 `CHANGE.md` 状态。后续用户若要执行、验证或归档，仍通过 SDD 命令入口或 terminal 中的 RavenSpec skill 明确触发。

这个选择比自动推荐 apply 更保守，因为 `CHANGE.md` 在参考工程中已经包含 Files Changed 与 Verification，Dashboard 无法仅凭文件存在判断实现是否待执行。

## Risks / Trade-offs

- [Risk] 有些 RavenSpec change 同时存在 `CHANGE.md` 和完整 SDD artifact。Mitigation: 仅当缺少完整 SDD 核心 artifact 时识别为 fast-change；完整 SDD 优先保持现有展示。
- [Risk] specs 可选后用户看不到“没有 specs”的信息。Mitigation: 卡片可显示 `0 specs` 或不显示 specs pill，但不得使用缺失警告态。
- [Risk] checkbox 进度复用导致文案仍叫 task。Mitigation: 数据模型增加进度类型或模式字段，UI 根据模式显示任务或验证文案。
- [Risk] `sdd-command-router` 的 artifact 类型未覆盖 `change`。Mitigation: 仅在本轮需要打开 CHANGE artifact 时扩展 label 和 open-artifact 目标；不改变其他 action payload。
