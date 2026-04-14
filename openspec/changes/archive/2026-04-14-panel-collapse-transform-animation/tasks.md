## 1. 提取常量与准备

- [x] 1.1 在 `SplitLayout.tsx` 顶部提取 `COLLAPSE_TRANSITION_MS = 180` 常量，替换现有硬编码的 `0.18s`

## 2. 重构左栏 DOM 结构

- [x] 2.1 将左栏单层 `div` 改为双层结构：外层 wrapper 控制占位宽度，内层 content div 负责 transform 动画
- [x] 2.2 外层 wrapper 宽度逻辑：展开时立即生效（`transition: 'width 0s'`），收起时延迟归零（`transition: 'width 0s ${COLLAPSE_TRANSITION_MS}ms'`）
- [x] 2.3 内层 content div 使用 `transform: translateX(leftCollapsed ? '-100%' : '0')`，transition 仅在非拖拽时生效
- [x] 2.4 内层 content div 宽度使用计算后的绝对像素值（`renderedLeftSize` + `containerWidth` 推算，或直接使用 `leftWidth` 对应的像素值），避免 `100%` 在 outer 归零瞬间产生闪烁
- [x] 2.5 保留原有 `boxShadow`、`backgroundColor` 等样式，确保视觉与当前一致

## 3. 验证

- [x] 3.1 验证收起动画流畅，DevTools Performance 中无 layout reflow 长帧
- [x] 3.2 验证展开动画正常，右侧面板立即扩展
- [x] 3.3 验证拖拽分隔条时动画禁用（`isDraggingState ? 'none'`）逻辑不受影响
- [x] 3.4 验证收起后切换终端 tab 不触发文件树刷新（`visible=false` 门控依然有效）
- [x] 3.5 验证 `leftCollapsed` prop 为 `false` 的默认行为与改动前完全一致（无视觉差异）
