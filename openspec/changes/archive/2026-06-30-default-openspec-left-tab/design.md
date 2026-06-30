## Context

左侧工作区已有 `Files / OpenSpec` 模式切换能力，用于在文件树预览和 OpenSpec Change Dashboard 之间切换。当前用户期望 OpenSpec 工作流成为左侧默认入口，并将切换入口顺序调整为 `OpenSpec / Files`，让 change 状态和下一步操作在应用打开后优先可见。

现有规格中 `sdd-workflow-panels` 负责左侧 SDD/OpenSpec 面板入口语义，`panel-layout` 负责应用启动后的主分栏默认内容。两者都需要同步更新，避免一个规格要求默认 OpenSpec，另一个规格仍要求默认文件预览。

## Goals / Non-Goals

**Goals:**

- 左侧模式切换入口按照 `OpenSpec / Files` 顺序展示。
- 应用启动或左侧工作区首次渲染时默认进入 `OpenSpec` 模式。
- 保留用户切换到 `Files` 模式后的文件树和文件预览能力。
- 不影响右侧 terminal session、当前活跃 terminal tab 和主分栏比例逻辑。

**Non-Goals:**

- 不新增新的左侧工作区模式。
- 不重做 OpenSpec Dashboard 的数据加载、卡片内容或推荐下一步逻辑。
- 不新增兼容旧 tab 顺序或旧默认模式的分支。
- 不修改快捷键、主题 token 或文件预览本身的行为。

## Decisions

1. 左侧模式列表以 `OpenSpec` 作为第一项，`Files` 作为第二项。
   - 理由：用户要求调换顺序，且 OpenSpec 是新的默认工作流入口。
   - 备选方案：仅改变默认选中项但保留 `Files / OpenSpec` 顺序。该方案会造成视觉顺序与默认优先级不一致，因此不采用。

2. 初始 active mode 设为 `OpenSpec`。
   - 理由：默认 OpenSpec 应在首次渲染时直接展示 Dashboard，而不是先显示文件树后等待用户切换。
   - 备选方案：通过延迟切换在挂载后自动切到 OpenSpec。该方案会产生不必要的 UI 闪动，因此不采用。

3. 仅调整左侧模式状态初始化和 tab 配置，不改变 Dashboard 数据来源。
   - 理由：本次需求只涉及入口顺序和默认态，OpenSpec/RavenSpec 数据扫描、artifact 状态、任务进度和推荐下一步已有独立规格约束。
   - 备选方案：同时改造 Dashboard 加载策略。该方案超出需求范围，因此不采用。

## Risks / Trade-offs

- [Risk] 既有测试可能断言左侧默认显示文件树。→ 更新测试预期为默认 OpenSpec，并保留切换到 Files 后文件树可用的覆盖。
- [Risk] 左侧模式状态如果分散在多个组件常量中，可能只改到默认值但漏改展示顺序。→ 实现时优先定位单一 tab/segment 配置源，并同步 active mode 初始化。
- [Risk] 默认进入 OpenSpec 后，Dashboard 数据加载会在启动时更早发生。→ 保持现有加载策略与空状态处理，不引入额外轮询或后台命令执行。
