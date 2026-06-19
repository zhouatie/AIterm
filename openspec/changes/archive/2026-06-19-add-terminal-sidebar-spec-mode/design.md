## Context

当前 Terminal 面板左侧是 workspace / terminal session 双层导航，所有 session 状态、cwd、gitRoot、切换和聚焦逻辑都集中在 `TerminalPanel`。左侧文件预览区已经有 `Files / OpenSpec` 模式切换，`OpenSpecDashboard` 通过 `openspecWorkflowApi.read(rootPath)` 读取 `openspec/changes` 与 `ravenspec/changes` active change，并展示 artifact 状态、任务进度和推荐下一步。

这次需求不是替换左侧文件预览区的 OpenSpec Dashboard，而是在 Terminal 侧边栏提供一个更贴近 terminal tab 的 SDD 导航视图：用户可以从已打开项目的 Spec/change 卡片快速跳回承载该项目的 terminal tab。

## Goals / Non-Goals

**Goals:**

- Terminal 侧边栏支持 `Terminal / Spec` 两种模式。
- `Terminal` 模式保持现有 workspace/session 导航、右键菜单、拖拽、重命名、关闭和快捷键行为。
- `Spec` 模式按已打开 terminal session 的项目根目录聚合展示 OpenSpec/RavenSpec active change。
- change 卡片点击后切回 `Terminal` 模式，选中并定位到对应 terminal tab，右侧显示该 terminal。
- change 卡片提供“下一步”入口，先让用户在弹窗中选择当前阶段及之后的 OpenSpec/RavenSpec Skill，再触发对应 payload。
- artifact 入口复用现有文件预览打开能力，缺失 artifact 不可打开。
- 不因切换侧边栏模式销毁、重建或暂停任何 PTY/session。

**Non-Goals:**

- 不在 Terminal 侧边栏实现完整文件树或所有 `spec.md` 文件浏览器。
- 不改变左侧文件预览区现有 `Files / OpenSpec` Dashboard 行为。
- 不新增 RavenSpec/OpenSpec CLI 协议或新的外部依赖。

## Decisions

### 1. Spec 模式展示 active change 卡片，而不是完整 spec 文件树

选择：Terminal 侧边栏 Spec 模式以 OpenSpec/RavenSpec active change 为主对象，展示 workflow、change 名称、artifact 完整度、任务进度和推荐下一步摘要。

理由：Terminal 侧边栏宽度有限，用户在这里最需要的是“哪个 change 对应哪个 terminal、下一步该去哪”，而不是浏览完整目录树。完整文件树能力已经存在于文件预览面板的 spec 模式中，重复实现会增加交互和状态复杂度。

替代方案：直接复用 `FileTree` 的 spec-only 模式。放弃原因是它只能解决文件浏览，不能天然表达 change 状态、任务进度和 terminal tab 定位关系。

### 2. 以 session 的项目根目录聚合 Spec 数据

选择：为每个 terminal session 计算项目根目录，优先使用 `session.gitRoot`，没有 gitRoot 时使用 `session.cwd`。相同根目录只读取一次 workflow summary，并记录该根目录下可跳转的代表 session。

理由：多个 terminal tab 经常位于同一个 repo 的不同子目录，按 cwd 逐个展示会重复；按 gitRoot 聚合更符合“开的项目目录”语义。非 git 目录仍可用 cwd 作为根目录。

替代方案：只读取当前 active session 的 cwd。放弃原因是用户明确希望 Terminal tab 这里能看到已打开目录下的 Spec，而不是仅当前 tab。

### 3. 复用现有 workflow summary 数据结构

选择：Spec 模式复用 `OpenSpecWorkflowSummary` / `OpenSpecChangeSummary` 数据结构和 `openspecWorkflowApi.read(rootPath)` 读取路径。若需要避免多项目并发读取造成 UI 抖动，在 `TerminalPanel` 内部做按 rootPath 的本地状态聚合。

理由：现有数据读取已经支持 OpenSpec 与 RavenSpec，并包含 artifact 状态、任务进度、推荐下一步和更新时间。复用它能减少重复扫描逻辑。

替代方案：新增专用 IPC 一次性读取所有 session 根目录。第一版不采用，除非后续发现多 session 并发读取有明显性能问题。

### 4. 点击 change 卡片只负责定位 terminal，artifact 入口负责打开预览

选择：change 卡片主点击区域切回 `Terminal` 模式并调用既有 session 选择路径；artifact pill 或按钮单独打开对应 Markdown artifact 到文件预览区；“下一步”使用独立按钮触发。

理由：主行为保持轻量且可预测，避免点击卡片时同时切 terminal、切左侧文件面板、打开文件，造成上下文变化过多。用户需要看 artifact 时可以显式点 artifact。

替代方案：点击卡片同时打开第一个 artifact。放弃原因是容易打断用户当前文件预览上下文。

### 5. 下一步 Skill 选择复用 SDD Command Router

选择：Spec change 卡片不再把按钮点击直接等价为执行推荐下一步，而是将按钮文案展示为“下一步”。点击后展示 Skill 选择弹窗，候选 Skill 基于当前 change 的推荐下一步计算，只保留当前阶段及之后的流程项。例如当前推荐阶段已经到 Apply 时，候选项不再包含 Explore、Propose 等前置流程。用户选择具体 Skill 后，再复用现有 SDD Command Router 生成 payload。低风险 action 可直接写入目标 terminal session 并执行；高风险 action、需要确认的 action 或显式跳过门禁的 action 先展示确认界面，用户确认后再写入目标 terminal session。

理由：语音驱动场景下，推荐下一步可以减少输入，但用户仍需要在 Apply、Update Change、Verify、Review、Archive 等后续 Skill 中切换。先选择 Skill 再执行，能避免误触直接发送命令，也能避免把已经过去的流程展示为无效选项。OpenSpec/RavenSpec 的 skill 命令、Raven DDD Update Change 等映射已经集中在 SDD Command Router 中。复用该路径可以避免 Terminal Spec 卡片和 OpenSpec Dashboard 维护两套 CLI 映射，也能保持高风险 action 的确认语义一致。

替代方案：在 TerminalPanel 内部为每种 workflow/action 直接拼接命令。放弃原因是后续新增 RavenSpec skill 或 OpenSpec skill 时容易漏改一处。

### 6. 下一步 Skill 使用 change 所属项目的目标 terminal

选择：下一步 Skill 的 payload 写入该 change 所属项目关联的目标 terminal session，而不是当前全局 active terminal session。目标 session 选择规则与卡片定位规则一致：优先当前活跃或最近活跃的同项目 session，否则选择同项目第一个可用 session。

理由：用户在 Spec 模式中看到的是多项目聚合列表。若下一步 Skill 写入当前 active terminal，可能把某个项目的 change 命令发送到另一个项目的 terminal，风险高且不符合卡片语义。

替代方案：执行下一步 Skill 前强制切回对应 terminal 再执行。第一版不采用，因为低风险操作可以直接发往正确 session；高风险操作已有确认步骤。

### 7. Spec 模式状态不进入已有 tab 持久化结构

选择：第一版只持久化当前侧边栏收起状态等现有 tab 布局，不把 Spec 模式选择和 Spec 展开状态写入 `PersistedTabState`。

理由：Spec 模式是导航视图，不影响 terminal session 生命周期。减少持久化模型变更，也避免窗口恢复时因缺少 session live info 提前读取过期 Spec 数据。

替代方案：持久化侧边栏模式。可作为后续增强，但不是本轮核心。

## Risks / Trade-offs

- [Risk] 多个 session 对应同一项目时，卡片点击跳转到哪个 terminal 可能不明显 → Mitigation：优先跳转当前已活跃或最近活跃的同项目 session；卡片显示目标 workspace/session 标签。
- [Risk] 多项目同时读取 workflow summary 可能造成短暂 loading → Mitigation：按 rootPath 去重并并发读取，失败项目显示轻量错误，不阻塞其他项目。
- [Risk] session cwd 频繁变化导致 Spec 模式反复刷新 → Mitigation：基于 rootPath 去重，仅当 session 的 `gitRoot || cwd` 变化时刷新对应项目。
- [Risk] artifact 打开行为跨面板联动，用户可能不知道文件预览区变化 → Mitigation：复用现有文件预览打开通道，并在 artifact 入口上使用明确的 hover/active 反馈。
- [Risk] 下一步 Skill 可能把命令发到错误项目的 terminal → Mitigation：Skill 执行必须绑定 change 所属项目的目标 session，并在选择/确认界面展示目标 workflow、change 和 terminal。
- [Risk] 高风险 action 被误触发 → Mitigation：先通过 Skill 选择弹窗确定目标 Skill，再复用 SDD Command Router 的高风险判定，高风险、需确认或跳过门禁的 action 在用户确认前不得写入 terminal。
