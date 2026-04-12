## 1. CSS 变量扩展

- [x] 1.1 在 `src/index.css` 的 `:root`（亮色）中新增 `--color-bg-pill-active: #ffffff` 和 `--color-bg-pill-hover: rgba(0,0,0,0.05)`
- [x] 1.2 在 `src/index.css` 的 `[data-theme="dark"]`（暗色）中新增 `--color-bg-pill-active: #2d2d2d` 和 `--color-bg-pill-hover: rgba(255,255,255,0.06)`

## 2. Tab 栏容器样式改造

- [x] 2.1 将 `styles.tabBar` 高度从 36px 改为 40px，去掉 `borderBottom`
- [x] 2.2 调整 `styles.tabList` 增加 `gap: 6px` 实现药丸间距，添加 `alignItems: 'center'`

## 3. Tab 药丸造型实现

- [x] 3.1 重写 `styles.tab`：去掉 `borderRight`，设置 `borderRadius: 8px`、`height: 28px`、`padding: '4px 12px'`、背景透明、文字色 `--color-text-muted`
- [x] 3.2 重写 `styles.tabActive`：去掉 `borderBottom`，改为 `backgroundColor: 'var(--color-bg-pill-active)'`、`boxShadow: '0 1px 3px var(--color-shadow)'`、文字色 `--color-text-primary`
- [x] 3.3 为 `styles.tab` 添加 `transition: 'all 0.2s ease'` 覆盖背景、阴影、颜色变化

## 4. 关闭按钮条件可见性

- [x] 4.1 修改 `styles.closeBtn`：`borderRadius` 改为 `'50%'`，增加 `opacity: 0`、`pointerEvents: 'none'`、`transition: 'opacity 120ms ease'` 作为默认隐藏态
- [x] 4.2 新增 `styles.closeBtnVisible` 样式对象：`opacity: 1`、`pointerEvents: 'auto'`，用于激活态和 hover 态
- [x] 4.3 在 Tab 渲染逻辑中：激活 Tab 的关闭按钮始终合并 `closeBtnVisible`；非激活 Tab 的关闭按钮仅在 Tab hover 时合并

## 5. Tab hover 与按压交互

- [x] 5.1 为每个 Tab `div` 添加 `onMouseEnter` / `onMouseLeave`：hover 时设置背景色为 `--color-bg-pill-hover`，文字色变为 `--color-text-tertiary`，同时控制关闭按钮 opacity
- [x] 5.2 为每个 Tab `div` 添加 `onMouseDown` / `onMouseUp`：按下时 `transform: 'scale(0.97)'`，释放时恢复 `transform: 'scale(1)'`

## 6. 图标替换

- [x] 6.1 导入 `lucide-react` 的 `Plus` 和 `X` 组件
- [x] 6.2 将关闭按钮内的 `×` 字符替换为 `<X size={14} strokeWidth={2} />`
- [x] 6.3 将新建按钮内的 `+` 字符替换为 `<Plus size={16} strokeWidth={2} />`，保持 `styles.newBtn` 圆角为 8px

## 7. 验证

- [x] 7.1 验证亮色/暗色主题下药丸 Tab 的视觉效果（背景、阴影、文字色）
- [x] 7.2 验证 hover 态：非激活 Tab hover 时背景淡入、关闭按钮淡入、文字变亮
- [x] 7.3 验证点击按压反馈：Tab 按下缩放、释放恢复
- [x] 7.4 验证关闭按钮：激活 Tab 始终可见，非激活 Tab 仅 hover 可见，点击关闭功能正常
- [x] 7.5 验证 Tab bar 与终端内容区无分隔线，视觉融合自然
