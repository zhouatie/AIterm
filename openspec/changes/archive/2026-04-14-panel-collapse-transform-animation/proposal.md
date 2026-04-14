## Why

点击左上角展开/收起按钮时，左侧文件树面板的动画存在明显卡顿——当前实现对左栏 `width` 属性做 CSS transition，每一帧都触发浏览器 layout reflow，同时导致内部两层 `ResizeObserver` 级联触发 React `setState`，在 0.18s 动画窗口内造成约 10 次无效重渲染。

## What Changes

- 将 `SplitLayout` 左栏收起动画从 `width` transition 改为基于 `transform: translateX` 的双层结构
  - 外层 wrapper：维持真实布局宽度，仅在动画结束后通过 `transition-delay` 瞬间归零
  - 内层 content div：使用 `transform: translateX(-100%)` 做 compositor-only 动画
- 动画期间 `visible` prop 保持同步立即更新（`panelVisible` state 在点击时立即切换），不影响已有的数据联动门控逻辑
- 展开时：外层宽度立即生效，内层从 `translateX(-100%)` 滑入
- 收起时：内层滑出动画结束后，外层宽度延迟归零，右侧面板再扩展

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `panel-layout`：为文件树模块的展开/收起动画补充性能要求——动画不得触发 layout reflow，须使用 compositor-only CSS 属性驱动。

## Impact

- **修改文件**：`src/components/SplitLayout.tsx`
- **不影响**：`FilePreviewPanel.tsx`、`FileTree.tsx`、`App.tsx`（所有 props 接口、状态逻辑、持久化行为均不变）
- **无 breaking change**：`SplitLayout` 对外 API（props 类型）完全不变
