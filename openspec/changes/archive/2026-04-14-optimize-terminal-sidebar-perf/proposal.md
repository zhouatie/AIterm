## Why

Terminal 侧边 tab 栏的收起/展开动画使用 CSS `width` 过渡，每帧都触发浏览器 layout reflow，导致动画卡顿。文件预览面板已通过 compositor-only `translateX` 动画优化了相同场景，terminal 侧边栏应采用相同策略消除卡顿。

## What Changes

- **重构 terminal 侧边栏收起/展开动画**：将当前基于 `width` 过渡的动画替换为 `translateX` compositor-only 动画，与 `SplitLayout` 中文件树面板采用的方案一致。具体做法：外层容器延迟 width 变化至动画结束后，内层内容用 `translateX(-100%)` 驱动滑出动画，避免动画期间触发 layout reflow。
- **消除动画期间的不必要重渲染**：确保 `sidebarCollapsed` 状态切换时，动画进行期间不触发子组件的 ResizeObserver 回调或 React 级联重渲染。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `terminal-tabs`：新增侧边栏收起/展开动画的性能要求——动画期间 SHALL 使用 compositor-only CSS 属性驱动，不得触发 layout reflow，与 `panel-layout` 中文件树面板的同类约束对齐。

## Impact

- **受影响代码**：`src/components/TerminalPanel.tsx`（侧边栏容器样式，约 934–947 行）
- **参考实现**：`src/components/SplitLayout.tsx`（183–217 行，compositor-only 动画模式）
- **无 API 变更**：不涉及 IPC、快捷键或外部接口改动
- **无依赖变更**：不引入新依赖
