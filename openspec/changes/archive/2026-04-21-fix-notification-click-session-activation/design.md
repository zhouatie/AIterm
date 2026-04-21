## Context

当前通知点击链路分成两段：主进程在系统通知点击后负责拉起窗口并发送 `terminal:activateSession`，渲染进程收到事件后再切换 terminal session。现状中主进程行为正常，但渲染进程只更新了 `activeSessionId` 和侧边栏收起状态，没有把“让目标 terminal 内容真正显示出来”作为通知激活的一部分统一处理。

这次问题的核心不是 PTY 或通知入口失效，而是 UI 恢复语义过弱：`handleSelectSession` 更接近“普通 session 切换”，不足以覆盖“从任意界面状态回到目标 terminal 上下文”这一通知点击场景。

## Goals / Non-Goals

**Goals:**

- 点击系统通知后，目标 terminal session 对应内容必须在 terminal 面板中可见。
- 复用现有 session 激活能力，避免新增兼容分支或重复状态源。
- 保持缺失 session 时静默忽略，不引入新的异常路径。

**Non-Goals:**

- 不调整系统通知的展示样式、触发时机或文案。
- 不改变普通鼠标点击 tab、快捷键切换 tab 的既有行为。
- 不引入兼容性兜底逻辑或新的持久化状态。

## Decisions

### 决策 1：将“通知点击激活”视为独立的 UI 恢复语义

**选择**：保留 `handleSelectSession` 作为通用 session 选择逻辑，但为 `terminal:activateSession` 增加一层通知专用恢复流程，除选择目标 session 外，还要显式保证 terminal 面板处于可见状态，并同步展开 terminal 侧边栏。

**原因**：

- 普通 session 切换与通知点击恢复语义不同，前者只需要切换 active session，后者需要从任意 UI 状态回到目标 terminal 上下文。
- 让通知语义独立，能避免继续把“显示目标 terminal 内容”的责任隐式寄托给其它局部状态联动。

**替代方案**：

- 直接继续复用 `handleSelectSession`，期待外层状态自行联动恢复 UI。这个方案已经证明不可靠，容易遗漏 panel 可见性等前置条件。

### 决策 2：通知点击时显式激活 terminal 面板

**选择**：通知点击恢复流程中显式切回 terminal 面板，再切换目标 session。

**原因**：

- 当前问题最可疑的缺口就是用户可能停留在非 terminal 面板，导致 session 虽然被标记为 active，但对应 terminal 内容没有显示出来。
- terminal 面板 ID 已经固定存在，显式激活是最直接且语义清晰的做法。

**替代方案**：

- 不切 panel，仅依赖 session 切换和组件内部 focus。这样对当前面板状态过于乐观，无法保证“内容真正可见”。

### 决策 3：workspace 展开保持最小必要保证

**选择**：本次以“terminal 内容可见”为最终目标，不强制把 workspace 展开作为必须行为；但若当前逻辑需要展开侧边栏，仍保持现有“点击通知后展开 terminal 侧边栏”的要求。

**原因**：

- 用户已确认“展不展开都可以”，因此不把 workspace 展开提升为本次修复目标。
- 真正需要保证的是目标 terminal 内容显示，而不是左侧树形导航一定暴露出该节点。

**替代方案**：

- 强制展开目标 workspace。这个做法也能修，但会把回归修复扩展成导航展示策略调整，不是当前最小闭环。

## Risks / Trade-offs

- **[风险] terminal 面板激活逻辑分散在多个组件中** → 通过单一通知恢复入口集中处理，减少后续漏同步。
- **[风险] session 已被关闭但通知仍可点击** → 保持现有静默忽略策略，在恢复入口先检查目标 session 是否仍存在。
- **[权衡] 不强制展开目标 workspace** → 左侧导航中目标 tab 可能暂时不可见，但用户能直接看到目标 terminal 内容，满足本次修复目标。
