## Context

当前实现已经有 SDD 命令入口、当前 change、确认式 terminal 写入和 OpenSpec Dashboard。核心限制是 workflow 被写死为 OpenSpec：

- Dashboard 只扫描 `openspec/changes`。
- artifact 类型只覆盖 `proposal.md`、`design.md`、`tasks.md`、`specs/**/*.md`。
- SDD Command Router 识别到 RavenSpec 时直接返回暂不支持。
- 当前 change 类型只允许 `workflow: 'openspec'`。
- change 卡片操作按钮随按钮数量横向排列，窄面板下容易拥挤。

RavenSpec 与 OpenSpec 的抽象相似，但具体约定不同：

- CLI 使用 `raven spec ...` / `ravenspec ...`。
- 主目录是 `ravenspec/changes`。
- 完整 SDD schema 的 artifacts 是 `PRD.md`、`DESIGN.md`、`TASK.md`、`specs/**/*.md`。
- Agent skill 入口是 `$sdd-*`，Update Change 对应 `$ddd-update-change`。
- Plan Review 与 Verify 是推荐质量门禁，但用户希望可显式跳过。

## Goals / Non-Goals

**Goals:**

- 支持 RavenSpec active changes 出现在 SDD Dashboard 中。
- 允许当前 change 记录 OpenSpec 或 RavenSpec workflow。
- 支持 RavenSpec 语音口令生成 `$sdd-*` / `$ddd-update-change` payload。
- 支持“跳过 plan review 直接 apply”“跳过 verify 直接 archive”等显式 override。
- 支持左侧低风险动作一键发送并执行，高风险动作确认后发送并执行。
- 调整 change 卡片操作区布局，使每行最多两个按钮。

**Non-Goals:**

- 不在前端直接执行 `raven spec` CLI 或远程 Raven API。
- 不自动判断某个门禁是否应该跳过。
- 不改变 OpenSpec 现有 payload 映射，除必要的通用化字段命名外不重写 OpenSpec 行为。
- 不实现 Raven workflow 配置远端拉取；本轮只基于本地目录结构与固定 skill 映射。

## Decisions

### 1. 引入 SDD workflow provider 配置

将现有 OpenSpec 专用数据结构通用化为 SDD workflow summary，但保留 OpenSpec 兼容命名的迁移边界：

- `workflow: 'openspec' | 'raven'`
- `changesPath`
- `artifactSet`
- `skillMap`
- `nextActionPolicy`

OpenSpec provider：

- changes path：`openspec/changes`
- artifacts：`proposal`、`design`、`specs`、`tasks`
- skills：`$openspec-*`

Raven provider：

- changes path：`ravenspec/changes`
- artifacts：`prd`、`design`、`specs`、`task`
- skills：
  - `explore` -> `$sdd-explore`
  - `new/propose` -> `$sdd-new-change` 或 `$sdd-ff-change`，由 action 决定
  - `continue` -> `$sdd-continue-change <change>`
  - `apply` -> `$sdd-apply-change <change>`
  - `verify` -> `$sdd-verify-change <change>`
  - `archive` -> `$sdd-archive-change <change>`
  - `sync-specs` -> `$sdd-sync-specs <change>`
  - `update-change` -> `$ddd-update-change <change>`

选择 provider 配置而不是复制一份 Dashboard，是为了让语音入口、确认面板、当前 change、候选选择和按钮布局复用同一套交互。

### 2. Dashboard 同时读取 OpenSpec 与 RavenSpec 本地目录

Dashboard 数据加载继续走主进程文件扫描，不在 UI 中直接调用 CLI：

```
root
├── openspec/changes/<change>
└── ravenspec/changes/<change>
```

扫描规则：

- 两个目录都存在时合并展示。
- 每个 change 带 workflow 标签。
- `archive` 目录继续排除。
- 当前 change 查找必须同时匹配 workflow 与 changeName，避免同名冲突。

Raven artifacts 以文件存在为主：

- `PRD.md` -> `prd`
- `DESIGN.md` -> `design`
- `TASK.md` -> `task`
- `specs/**/*.md` -> `specs`

任务进度解析同时支持 `TASK.md` 和 `tasks.md`，但 Raven provider 默认使用 `TASK.md`。

### 3. 显式跳过门禁是 payload override，不是状态机自动判断

Plan Review 与 Verify 的跳过只在用户明确表达时生效，例如：

- `跳过 plan review 直接 apply`
- `不用 verify 直接归档`
- `跳过验证归档当前`

解析后 intent 需要带上 skip metadata：

- `skippedActions: ['plan-review']`
- `skippedActions: ['verify']`
- `source: 'manual'`

payload 仍然只发送目标 skill，例如 `$sdd-apply-change <change>` 或 `$sdd-archive-change <change>`。确认界面负责展示“将跳过 ...”的提示，避免把跳过语义隐藏在 terminal payload 之外。

跳过不适用于高风险确认：`apply`、`archive` 仍然必须展示确认界面。

### 4. 推荐下一步与直接动作分离

Dashboard 的“下一步”继续代表推荐动作；用户可通过显式按钮或语音 override 选择其它动作。

Raven provider 的推荐策略：

- 缺 `PRD.md` / `specs` / `DESIGN.md` / `TASK.md` -> `continue`
- `TASK.md` 存在且任务未完成 -> `apply`
- 任务完成 -> 推荐 `verify`，但允许用户直接 `archive`

Plan Review 不应强制作为唯一下一步。它可作为“更多动作”或语音命令触发，不能阻断用户显式 `apply`。

### 5. 卡片操作按钮布局用固定两列上限

change 卡片操作区使用两列上限的网格或 flex wrap：

- 宽度足够时最多两列。
- 窄宽度时自动单列。
- 不允许三个文字按钮在同一行。
- 按钮高度与间距稳定，避免刷新状态导致布局跳动。

### 6. 面板动作发送后执行，而不是只预填

Dashboard 产生的 terminal payload 仍然通过当前 active terminal session 发送，但发送内容需要包含回车，使 agent skill 立即开始执行。

动作分级：

- 低风险：`continue`、`update-change`、`verify`、`sync-specs` 等可由左侧按钮或命令入口直接执行。
- 高风险：`apply`、`archive`、包含 skip metadata 的动作必须先展示确认界面；用户确认后再发送并执行。
- 本地动作：`set-current-change`、`open-artifact` 不写入 terminal，保持本地立即执行。

实现上应区分“准备确认”和“直接执行”两种路径：

- `prepareCommand` 继续负责解析 intent 与构建 payload。
- 当 intent 可直接执行且存在 active terminal 时，直接写入 `payload + Enter`。
- 当 intent 高风险、包含跳过门禁、需要用户编辑 payload 或当前无 active terminal 时，展示确认界面并保留 payload 草稿。
- 确认按钮文案从“发送到 terminal”调整为“执行”，确认后写入 `payload + Enter`。

## Risks / Trade-offs

- [Risk] OpenSpec 与 RavenSpec change 同名时误选目标。→ 当前 change、候选项和 payload title 同时展示 workflow 与 changeName。
- [Risk] RavenSpec artifact schema 后续被远端 workflow 改造。→ 本轮只支持本地已确认的 `sdd` schema artifacts；未知文件不阻断基础展示。
- [Risk] 用户误以为跳过门禁会自动记录到 Raven spec-tracker。→ UI 只生成目标 skill payload，并在确认界面显示跳过说明；是否记录由后续 skill/CLI 处理。
- [Risk] 通用化重命名影响现有 OpenSpec API。→ 可以保留 `openspecWorkflowApi` 外壳，内部返回扩展后的 SDD summary，减少一次性改动面。
- [Risk] 一键执行可能误触发高风险动作。→ `apply`、`archive` 和包含 skip metadata 的动作继续强制确认，只有低风险动作可以一键执行。

## Open Questions

- 是否需要在 UI 中单独暴露 `sdd-plan-review` 按钮，还是先仅通过语音命令与更多菜单触发。
- Raven `new` 与 `ff` 在语音“propose”场景下默认映射到 `$sdd-ff-change` 还是 `$sdd-new-change`；本轮建议保守映射为 `$sdd-new-change`，用户说“快速生成/ff/一把生成”时再用 `$sdd-ff-change`。
