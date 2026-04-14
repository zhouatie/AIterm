## Context

当前 terminal 侧边 tab 栏的收起/展开动画通过 CSS `transition: width 0.18s ease` 实现（`TerminalPanel.tsx:946`）。`width` 属于 layout 属性，每帧变化都会触发浏览器 layout reflow，导致所有子元素重新排布——当侧边栏包含多个 workspace 和 session 节点时表现为明显卡顿。

文件预览面板的左侧面板已通过 `SplitLayout.tsx:183–217` 解决了同一问题。方案核心：

1. **外层容器**：`width` 变化使用 `transition: width 0s ${delay}ms`，在 transform 动画结束后瞬间切换，动画期间保持原始宽度不变。
2. **内层内容**：使用 `transform: translateX(-100%)` 驱动滑出动画，`transform` 是 compositor-only 属性，不触发 layout 或 paint。

## Goals / Non-Goals

**Goals:**

- Terminal 侧边栏收起/展开动画帧率与文件预览面板一致（60fps，无感知卡顿）
- 动画期间不触发 layout reflow，不引发子组件 ResizeObserver 级联或 React 重渲染
- 保持现有 180ms 动画时长和 ease 缓动一致性

**Non-Goals:**

- 不改变侧边栏的功能行为（workspace 展开/收起、session 切换等）
- 不引入新的布局组件或抽象层（不将 terminal 侧边栏迁移到 SplitLayout）
- 不在本次优化 workspace 内 session 列表的渲染性能（虚拟滚动等留作后续）

## Decisions

### Decision 1: 在 TerminalPanel 内部复用 SplitLayout 的动画模式，而非将侧边栏迁移到 SplitLayout 组件

**选择**：在 TerminalPanel 侧边栏的内联样式中直接应用双层 div 动画模式。

**理由**：
- Terminal 侧边栏与 SplitLayout 的职责差异大：无拖拽调宽、无 divider、宽度固定为 240px 或 0，迁移到 SplitLayout 需要为 SplitLayout 增加"无拖拽模式"，引入不必要的复杂度。
- 直接在 TerminalPanel 中应用动画模式仅修改一个文件的约 15 行样式代码，变更面最小。

**替代方案**：将侧边栏改为 SplitLayout 的 `left` slot——但需要 SplitLayout 支持固定宽度、无 divider 等变体，改动面大且偏离 SplitLayout 的设计意图。

### Decision 2: 外层容器收起时延迟 width 归零，展开时立即恢复 width

**选择**：

```
// 收起：动画结束后瞬间 width→0
transition: width 0s 180ms

// 展开：立即恢复 width，内容从 translateX(-100%) 滑入
transition: width 0s
```

**理由**：与 SplitLayout 的验证过方案完全一致。收起时 width 延迟保证动画期间右侧终端区域不发生宽度变化（无 reflow）。展开时 width 立即恢复保证右侧终端区域立刻收缩，与内容滑入同步。

### Decision 3: 内层内容使用 translateX 驱动滑出/滑入

**选择**：

```
transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)'
transition: transform 180ms ease
```

**理由**：`transform` 是 compositor-only 属性，完全由 GPU 合成线程处理，不触发 layout 或 paint。180ms + ease 与现有 `width` 过渡参数一致，用户感知无变化。

## Risks / Trade-offs

- **[风险] 收起动画期间侧边栏 borderRight 仍然可见** → 缓解：收起时将 borderRight 在动画结束后移除（与 width→0 同步），可通过 transitionend 事件或延迟 style 切换处理。当前实现已有 `sidebarCollapsed ? 'none' : '1px solid ...'` 判断，在 width 延迟归零后 borderRight 自然消失。
- **[风险] 浮动展开按钮的定位受 width 延迟影响** → 缓解：浮动按钮使用 `position: absolute` 定位于收起态，不依赖侧边栏 width，无影响。
- **[权衡] 动画期间侧边栏内容虽然不可见但 DOM 仍在** → 这是刻意取舍：避免动画期间 mount/unmount 引起的布局抖动，与当前行为（`overflow: hidden` 裁切内容）一致。
