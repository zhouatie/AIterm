## Context

当前 `TerminalTabBar.tsx` 的 `tabList` 容器采用 `overflow: hidden` + `flex: 1` 布局。Tab 数量较少时工作正常，但当 Tab 数量增多超出容器宽度后，右侧 Tab 被裁切，用户完全无法访问这些 Tab。这是一个基本可用性缺陷。

现有代码结构：
- `tabBar`（外层 flex 容器，高 40px）→ `tabList`（flex:1, overflow:hidden）+ `newBtn`（flexShrink:0）
- 每个 Tab 是 `whiteSpace: nowrap` 的 flex 子项，无最大/最小宽度约束
- `TerminalTabBar` 已通过 props 接收 `tabs`、`activeTabId`、`onSelect`、`onClose`、`onNew`
- 组件内已使用 `useRef` 和 `useCallback`

## Goals / Non-Goals

**Goals:**
- Tab 数量超出可视宽度时，用户能通过鼠标滚轮横向滚动浏览所有 Tab
- 新建 Tab 后自动滚动到最新 Tab，确保可见
- 切换 Tab 时目标 Tab 自动滚动到可视区域
- 视觉上无可见滚动条，保持 Tab 栏简洁

**Non-Goals:**
- 不添加左右箭头按钮导航（保持简洁，滚轮已足够）
- 不实现 Tab 拖拽排序
- 不实现 Tab 宽度压缩/省略
- 不添加"更多 Tab"下拉菜单

## Decisions

### 决策 1：使用原生 CSS `overflow-x: auto` + 隐藏滚动条

**选择**：将 `tabList` 的 `overflow` 从 `hidden` 改为 `overflow-x: auto`，并通过 CSS 隐藏滚动条轨道。

**备选方案**：
- A) 纯 JS 实现虚拟滚动 —— 过于复杂，Tab 数量不会达到需要虚拟化的量级
- B) 添加左右箭头按钮 —— 增加 UI 复杂度，滚轮方案更直觉
- C) 保持 hidden，加 Tab 压缩 —— 压缩后 Tab 名不可读，治标不治本

**理由**：原生 `overflow-x: auto` 是最轻量方案，配合 `scrollbar-width: none`（Firefox）和 `::-webkit-scrollbar { display: none }`（Chromium/Electron）可完全隐藏滚动条。

### 决策 2：wheel 事件拦截实现横向滚动

**选择**：在 `tabList` 上监听 `onWheel` 事件，将 `deltaY` 映射为 `scrollLeft` 增量，使纵向滚轮可横向滚动 Tab 栏。

**理由**：大多数用户的鼠标只有纵向滚轮，不拦截 wheel 事件的话无法横向滚动。这是 VS Code、Chrome tab 栏等成熟产品的标准做法。需要调用 `e.preventDefault()` 阻止页面纵向滚动。

### 决策 3：通过 ref + scrollIntoView 实现自动滚动

**选择**：
- `TerminalTabBar` 暴露 `tabListRef`（指向 `tabList` 容器 DOM）
- 新建 Tab 时：在 `onNew` 回调后，通过 `scrollLeft = scrollWidth` 滚动到最右
- 切换 Tab 时：在 `onSelect` 后，对目标 Tab 元素调用 `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })`

**理由**：`scrollIntoView` 是浏览器原生 API，无需手动计算偏移量，`inline: 'nearest'` 确保只在 Tab 不可见时才滚动，避免不必要的抖动。

### 决策 4：样式实现方式

**选择**：滚动条隐藏通过在 `index.css` 中添加针对 `tabList` 的全局样式规则，其余改动保持在组件内联样式中。

**理由**：`scrollbar-width: none` 可以通过内联样式设置，但 `::-webkit-scrollbar` 伪元素只能在 CSS 样式表中定义。统一放在 `index.css` 中管理更干净。

## Risks / Trade-offs

- **[风险] 触控板用户双向滚动冲突** → 缓解：仅拦截 `deltaY` 映射到横向，触控板原生横向滚动由 `overflow-x: auto` 自然支持，无冲突
- **[风险] 滚动动画性能** → 缓解：Tab 数量通常在几十个以内，DOM 元素极少，无性能问题
- **[取舍] 隐藏滚动条降低可发现性** → 可接受：Tab 栏溢出在桌面应用中是常见模式，用户习惯使用滚轮；且产品定位���开发者工具，目标用户对此交互模式熟悉
