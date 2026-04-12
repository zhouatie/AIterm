## Why

当前终端 Tab 栏的 `tabList` 容器使用 `overflow: hidden`，当打开多个 Tab 超出可视宽度后，右侧的 Tab 被直接裁切，用户无法看到也无法点击这些 Tab，导致多 Tab 场景下完全无法操作被遮挡的终端会话。

## What Changes

- 将 `tabList` 容器的 `overflow` 从 `hidden` 改为支持横向滚动（`overflow-x: auto`），同时隐藏竖向滚动条
- 支持鼠标滚轮在 Tab 栏上横向滚动（将 wheel 事件的 deltaY 映射为横向 scrollLeft）
- 隐藏横向滚动条，保持 Tab 栏视觉简洁（使用 CSS 隐藏 scrollbar）
- 新建 Tab 后自动滚动到最右侧，确保新 Tab 可见
- 切换 Tab 时自动将目标 Tab 滚动到可视区域（scrollIntoView）

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `terminal-tabs`：Tab 栏新增溢出滚动行为要求——当 Tab 数量超出可视宽度时 SHALL 支持横向滚动浏览和操作所有 Tab

## Impact

- **代码影响**：`src/components/TerminalTabBar.tsx`（样式修改 + 滚动逻辑）、`src/components/TerminalPanel.tsx`（新建/切换 Tab 时触发滚动）
- **依赖**：无新增依赖
- **API/协议**：无变化
- **向后兼容**：完全兼容，仅增强现有 Tab 栏交互
