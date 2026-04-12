## 1. Tab 列表容器样式修改

- [x] 1.1 将 `TerminalTabBar.tsx` 中 `tabList` 样式的 `overflow: 'hidden'` 改为 `overflowX: 'auto'`，并设置 `overflowY: 'hidden'`
- [x] 1.2 在 `index.css` 中为 Tab 列表容器添加隐藏滚动条的样式规则（`::-webkit-scrollbar { display: none }` 和 `scrollbar-width: none`），使用 CSS class 标记 `tabList` 容器

## 2. 鼠标滚轮横向滚动

- [x] 2.1 在 `TerminalTabBar.tsx` 中为 `tabList` 添加 `useRef`，绑定到 `tabList` DOM 元素
- [x] 2.2 添加 `onWheel` 事件处理函数，将 `deltaY` 映射为 `scrollLeft` 增量，并调用 `e.preventDefault()` 阻止默认纵向滚动

## 3. 自动滚动到可视区域

- [x] 3.1 新建 Tab 后自动滚动 `tabList` 到最右侧（`scrollLeft = scrollWidth`），使用 `useEffect` 或回调在 tabs 数组变化后执行
- [x] 3.2 切换 Tab 时对目标 Tab 元素调用 `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })`，确保不在可视区域内的 Tab 平滑滚入

## 4. 验证

- [x] 4.1 手动测试：打开 10+ 个 Tab，确认可通过鼠标滚轮浏览所有 Tab，且滚动条不可见
- [x] 4.2 手动测试：新建 Tab 后确认自动滚动到最右侧，点击被遮挡的 Tab 后确认自动滚动到可视区域
