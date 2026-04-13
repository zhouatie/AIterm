## Context

当前 `TerminalPanel.tsx` 将 terminal 侧边栏的收起 / 展开按钮渲染在根容器上，并通过绝对定位把按钮放在 `left: sidebarWidth + 8` 的位置。这样在展开态下，按钮会越过 sidebar 右边界，悬浮到 terminal 内容区左下角，直接覆盖终端文本与 TUI 画面。

这次变更只修正导航控件的布局归属，不改变 workspace 树、终端实例生命周期、快捷键动作或 PTY / IPC 行为。用户已经明确要求展开后的 icon 必须回到 tab 面板内侧，不能继续放在外层。

## Goals / Non-Goals

**Goals:**
- 让 terminal 侧边栏在展开态下把切换控件收纳到 sidebar 自身内部
- 保持收起态仍有稳定可点击的展开入口
- 避免 toggle 控件覆盖 terminal 内容区
- 尽量将实现限制在 `TerminalPanel.tsx` 的布局层，不触碰终端数据模型

**Non-Goals:**
- 不改 terminal sidebar 的交互语义、快捷键或状态持久化
- 不调整 workspace / session 的创建、切换、关闭逻辑
- 不新增兼容性分支或额外主题系统能力

## Decisions

### 决策 1：展开态与收起态使用不同的控件承载位置

**选择**：展开态下，将 toggle 按钮放进 sidebar 容器内部，作为 sidebar 底部的固定 footer 操作；收起态下，保留一个独立的展开入口贴近左边界，方便用户重新打开导航。

**理由**：用户当前的不满只发生在展开态，因为按钮越界覆盖到了 terminal 内容。把展开态按钮收进 sidebar 内部，可以直接切断遮挡问题；而收起态没有 sidebar 实体可承载按钮，保留一个独立入口仍是最直接的交互。

**替代方案**：始终使用一个浮层按钮，通过调整 `left` 或 `z-index` 避免遮挡。这样仍然依赖“悬浮在内容区之上”的布局模型，问题容易在宽度、阴影或后续样式调整时再次出现。

### 决策 2：展开态在 sidebar 内引入明确的 footer 区域

**选择**：在 sidebar 现有“header + list”结构下增加一个底部 footer 区域，用于承载收起按钮，并让列表区域继续独立滚动。

**理由**：footer 可以给按钮一个稳定的视觉归属，避免按钮与 workspace 列表项目混在一起；同时列表继续滚动，不会因为按钮位置变化影响节点滚动行为。

**替代方案**：把按钮塞进 header。这样虽然也能内嵌，但 header 已承担标题和新建 workspace 操作，继续塞入收起按钮会让顶部工具区过挤，且与“把入口留在内容底部边缘”的当前使用习惯不一致。

### 决策 3：终端内容区只响应 sidebar 宽度变化

**选择**：terminal 内容区的尺寸变化仍然只由 sidebar 宽度变化驱动，不为 toggle 控件额外预留覆盖层空间。

**理由**：这次变更的目标就是移除覆盖层。只要按钮回到 sidebar 内部或独立于主要内容可视区之外，terminal 的宽高适配逻辑就不需要新增额外分支。

**替代方案**：保留浮层按钮，并为 terminal 内容区额外增加安全边距。这样会把布局问题转嫁成内容区缩水，既违背“按钮不该盖住终端内容”的目标，也会引入新的宽度浪费。

## Risks / Trade-offs

- [sidebar footer 占用少量垂直空间] → 使用紧凑的固定高度 footer，让 workspace 列表继续在剩余区域滚动
- [展开态与收起态存在两种按钮位置] → 复用同一套图标、hover 与 title 语义，保持交互一致，只改变承载位置
- [布局调整可能影响终端 resize 时机] → 保持 sidebar 宽度切换逻辑不变，仅调整按钮容器，避免触发额外的终端尺寸计算路径

## Migration Plan

1. 在 `TerminalPanel.tsx` 中把当前根级绝对定位按钮拆分为“展开态 sidebar footer 按钮”和“收起态独立入口”
2. 调整 sidebar 容器结构与样式，确保 workspace 列表滚动区和 footer 区职责清晰
3. 手动验证展开态下按钮不再覆盖 terminal 内容，收起/展开后 workspace 与活跃 session 状态保持不变

## Open Questions

- 无
