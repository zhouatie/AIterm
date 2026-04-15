## 1. 历史记录工具函数

- [x] 1.1 在 `BrowserPanel.tsx` 中定义 `HistoryEntry` 类型 `{ url: string; title: string; visitedAt: number }`
- [x] 1.2 实现 `loadHistory(): HistoryEntry[]`，从 localStorage 读取历史，失败时返回空数组
- [x] 1.3 实现 `saveHistory(entries: HistoryEntry[]): void`，将历史写入 localStorage，超过 1000 条时自动裁剪最旧记录
- [x] 1.4 实现 `addToHistory(entries: HistoryEntry[], url: string, title: string): HistoryEntry[]`，去重（同 URL 更新时间戳）后返回新数组

## 2. 历史记录状态与写入

- [x] 2.1 在 `BrowserPanel` 组件中添加 `history` state，初始化时从 localStorage 加载
- [x] 2.2 在 `onDidNavigate` 事件处理中调用 `addToHistory` 并 `saveHistory`，同步更新 `history` state
- [x] 2.3 在 `onTitleUpdated` 事件处理中同步更新对应历史条目的 `title` 字段

## 3. 搜索建议工具函数

- [x] 3.1 实现 `fetchSuggestions(query: string, signal: AbortSignal): Promise<string[]>`，调用 DuckDuckGo API（`https://duckduckgo.com/ac/?q=<query>&type=list`），失败或 abort 时返回空数组
- [x] 3.2 实现 `useDebounce<T>(value: T, delay: number): T` hook（或内联 debounce 逻辑），用于防抖 300ms

## 4. 下拉补全面板 UI

- [x] 4.1 在地址栏 `<input>` 外层添加 `position: relative` 的包裹 `<div>`
- [x] 4.2 创建下拉面板组件（内联 JSX），`position: absolute; top: 100%; left: 0; right: 0`，使用主题变量适配明暗主题
- [x] 4.3 历史候选项区域：每条展示时钟图标 + URL，最多 4 条
- [x] 4.4 历史与建议之间添加视觉分隔线（仅在两者均有内容时显示）
- [x] 4.5 搜索建议区域：每条展示搜索图标 + 建议词，最多 4 条
- [x] 4.6 候选项 hover 和键盘高亮状态样式（使用 `var(--color-bg-hover)`）

## 5. 补全逻辑与状态管理

- [x] 5.1 添加 `suggestions` state（搜索建议数组）和 `showDropdown` state（布尔值）
- [x] 5.2 添加 `activeIndex` state（当前键盘高亮索引，-1 表示无高亮）和 `originalInput` state（记录用户原始输入，供 ↑ 回退时恢复）
- [x] 5.3 在 `onChange` 中：同步过滤历史记录，触发防抖搜索建议请求，重置 `activeIndex` 为 -1
- [x] 5.4 实现 `useEffect` 监听防抖后的输入值，创建 `AbortController` 发起建议请求，在 cleanup 中 abort
- [x] 5.5 在 `onFocus` 中：若 `addressValue` 非空则设 `showDropdown = true`
- [x] 5.6 在 `onBlur` 中：延迟 150ms 后设 `showDropdown = false`（防止点击候选项前消失）

## 6. 键盘导航

- [x] 6.1 在 `handleAddressKeyDown` 中处理 `ArrowDown`：`activeIndex` 向下移动，超出候选项总数时循环到顶，同步更新 `addressValue`
- [x] 6.2 在 `handleAddressKeyDown` 中处理 `ArrowUp`：`activeIndex` 向上移动，回到 -1 时恢复 `originalInput`
- [x] 6.3 在 `handleAddressKeyDown` 中处理 `Escape`：关闭下拉面板，保持 `addressValue` 不变
- [x] 6.4 在 `handleAddressKeyDown` 中处理 `Enter`：若有高亮候选项则以该候选项导航，否则保留原有逻辑（`navigateTo(addressValue)`）

## 7. 点击候选项

- [x] 7.1 候选项 `onMouseDown` 使用 `preventDefault()` 阻止 input 触发 `onBlur`
- [x] 7.2 候选项 `onClick` 调用 `navigateTo(item)` 并设 `showDropdown = false`

## 8. 验证

- [x] 8.1 验证导航后历史正确写入 localStorage，刷新应用后历史持久保留
- [x] 8.2 验证输入时历史候选项正确过滤展示
- [x] 8.3 验证搜索建议在 300ms 停顿后展示，快速输入时不出现多余请求
- [x] 8.4 验证键盘 ↑↓ 导航、Enter 确认、Esc 关闭均符合预期
- [x] 8.5 验证断网时搜索建议静默失败，不影响历史候选项展示
- [x] 8.6 验证主题切换时下拉面板样式正确适配
