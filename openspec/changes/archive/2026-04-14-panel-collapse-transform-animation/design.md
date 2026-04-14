## Context

`SplitLayout` 组件通过向左栏 `div` 施加 `width: 0` + `transition: 'width 0.18s ease'` 实现收起动画。`width` 属于 layout 属性，每帧都会触发浏览器 reflow，同时导致其内部两个 `ResizeObserver`（`SplitLayout` 内嵌套的内层 `SplitLayout` 和 `FileTree` 的 scroll container）级联触发 `setState`，在 180ms 动画窗口内造成约 10 次 React 重渲染，渲染链路如下：

```
width transition (每帧 reflow)
  → 内层 SplitLayout ResizeObserver
      → setContainerWidth() + updateLeftSize()
  → FileTree scroll container ResizeObserver
      → setViewportHeight()
  → React re-render × ~10
      → buildVisibleRows() / virtualRows 重算
```

## Goals / Non-Goals

**Goals:**

- 将收起/展开动画从 `width` transition 改为 `transform: translateX`，消除 layout reflow
- 动画期间 ResizeObserver 不再触发，从根本上杜绝级联重渲染
- 动画结束后右侧面板正常扩展，视觉效果与当前一致
- `SplitLayout` 对外 props 接口完全不变

**Non-Goals:**

- 修改 `FilePreviewPanel`、`FileTree`、`App.tsx` 等其他文件
- 改变 `visible` prop 的数据逻辑（`panelVisible` 依然在点击瞬间切换）
- 优化拖拽分隔条的性能（现有 `isDraggingState ? 'none' :` 逻辑不变）

## Decisions

### 决策 1：双层 div 结构实现 transform + 延迟宽度归零

**选择**：外层 wrapper 控制占位宽度（`transition-delay` 延迟归零），内层 content div 负责 `transform: translateX` 动画。

**结构草图**：

```
<div  /* outer wrapper */
  style={{
    width: leftCollapsed ? 0 : leftWidth,   // 归零延迟至动画结束
    overflow: 'hidden',
    flexShrink: 0,
    transition: leftCollapsed
      ? `width 0s ${TRANSITION_DURATION}ms`  // 收起：先动画再归零
      : 'width 0s',                          // 展开：立即给宽度
  }}
>
  <div  /* inner content */
    style={{
      width: /* 内层固定为外层对应的真实宽度，避免 100% 在归零前收缩 */,
      height: '100%',
      transform: leftCollapsed ? 'translateX(-100%)' : 'translateX(0)',
      transition: isDraggingState ? 'none'
        : `transform ${TRANSITION_DURATION}ms ease`,
    }}
  >
    {left}
  </div>
</div>
```

**收起时序**：
```
t=0ms    panelVisible=false → leftCollapsed=true
         inner: translateX 开始 0→-100%（180ms）
         outer: width 不变（等待 delay）
         ResizeObserver 不触发（outer width 未变）

t=180ms  inner: 动画结束，translateX(-100%)
         outer: transition-delay 到期，width 瞬间 0
         ResizeObserver 触发 1 次（width 0→实际值的单次变化）
         右侧面板扩展
```

**展开时序**：
```
t=0ms    panelVisible=true → leftCollapsed=false
         outer: width 立即恢复 leftWidth（0s transition）
         inner: translateX 开始 -100%→0（180ms）
         右侧面板立即收缩（outer width 已生效）
```

**内层宽度处理**：内层须使用计算后的绝对像素宽度（而非 `100%`），避免 outer width 在 `transition-delay` 期间为非零时，内层在归零瞬间被压缩产生闪烁。可用已有的 `renderedLeftSize` + `containerWidth` 计算得到。

**备选方案**：
- 单层 `opacity + pointerEvents: none`：视觉淡出，不能释放空间，体验与现有不一致，排除。
- 单层 `clip-path` transition：部分浏览器不保证 compositor-only，且右侧面板无法联动扩展，排除。
- 直接去掉动画（`transition: none`）：最简但损失交互品质，排除。

### 决策 2：TRANSITION_DURATION 提取为常量

将 `180`（ms）提取为模块级常量 `COLLAPSE_TRANSITION_MS`，供 outer wrapper 的 `transition-delay` 和 inner content 的 `transition-duration` 共用，避免数值不一致导致闪烁。

## Risks / Trade-offs

- **展开时右侧面板抢先扩展**：展开时 outer width 立即生效，右侧面板与内层滑入同时发生，视觉上左侧"先出现空间再有内容"。这与当前行为（两者同步）有细微差异，但对实际使用影响极小。
  → 可接受，若需精确同步可为展开方向也加 delay，但会增加响应迟滞感。

- **outer width 归零瞬间的单次 ResizeObserver**：方案 A 将原先的 ~10 次 ResizeObserver 减少为 1 次，已大幅改善，剩余这 1 次触发在动画结束后，不影响动画流畅性。

- **内层宽度值获取**：需要在 `leftCollapsed=true` 时仍维持内层的非零宽度（用于 transform 动画起点），需使用 `leftSizeRef.current` 而非 `leftSize` state，避免 React 渲染滞后导致宽度闪变为 0。
