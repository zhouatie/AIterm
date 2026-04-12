## Context

当前 `TerminalTabBar.tsx` 使用内联样式对象（plain JS style objects）+ CSS 自定义变量实现 Tab 栏样式。Tab 采用扁平方块造型，用右边框分隔，激活态用底部 2px 蓝线标识。关闭按钮始终可见，无 hover 反馈，无点击动效，无新建/关闭动画。

项目已安装 `lucide-react` 图标库，主题系统通过 `index.css` 的 CSS 变量支撑明暗两套配色。现有样式全部为内联 JS 对象，无 CSS-in-JS 库。

## Goals / Non-Goals

**Goals:**
- 将 Tab 形态从方块改为胶囊药丸，提升视觉精致度
- 增加 hover、点击、关闭按钮淡入等微交互，提升操作反馈
- 去掉 Tab bar 底部分隔线，让 Tab 区与终端内容区视觉融合
- 保持现有内联样式方案，不引入新的样式库

**Non-Goals:**
- 不做 Tab 拖拽排序
- 不做 Tab 溢出滚动处理（后续迭代）
- 不做 Tab 内容丰富化（显示 cwd、进程名等）
- 不做键盘快捷键
- 不做新建/关闭 Tab 的展开收缩动画（后续迭代，需配合 Tab 宽度计算逻辑）

## Decisions

### 1. 药丸造型实现方案

**决定**：通过修改现有内联样式对象实现药丸造型，不引入 CSS 类名或样式库。

**理由**：项目已全面使用内联样式，保持一致性。药丸造型仅需调整 `borderRadius`、`padding`、`backgroundColor`、`boxShadow` 等属性，内联样式完全胜任。

**替代方案**：引入 CSS Modules 或 styled-components —— 为单个组件样式变更引入新依赖过重。

### 2. 关闭按钮条件可见性

**决定**：使用 `opacity` + `transition` 实现关闭按钮的淡入淡出，非激活 Tab 默认 `opacity: 0`，hover Tab 或激活态时 `opacity: 1`。同时设置 `pointer-events: none` 防止不可见时被误点。

**理由**：比 `display: none` / `visibility: hidden` 切换更平滑，且不影响 Tab 宽度（不触发回流）。

**替代方案**：`display: none` —— 关闭按钮显隐会导致 Tab 宽度跳变，不够丝滑。

### 3. 点击按压反馈

**决定**：通过 `onMouseDown` / `onMouseUp` 设置 `transform: scale(0.97)`，配合 `transition: transform 0.15s ease`。

**理由**：纯 CSS transform 不触发回流，性能好。0.97 的缩放幅度微妙但可感知。

**替代方案**：CSS `:active` 伪类 —— 内联样式无法使用伪类，需要额外 CSS，与现有方案不一致。

### 4. Tab hover 状态管理

**决定**：每个 Tab 使用 `onMouseEnter` / `onMouseLeave` 事件控制 hover 态，通过直接操作 `style` 属性实现（与现有模式一致）。hover 时设置半透明背景色，同时控制关闭按钮 opacity。

**理由**：沿用现有 `TerminalTabBar.tsx` 中已有的命令式 hover 模式（close button 和 new button 已经这样做了），保持一致。

### 5. 图标替代纯文字

**决定**：新建按钮的 `+` 替换为 `lucide-react` 的 `<Plus />` 组件，关闭按钮的 `×` 替换为 `<X />` 组件。

**理由**：`lucide-react` 已在项目依赖中，图标组件有标准化的 `size`、`strokeWidth` 属性，视觉更精致，与药丸造型更搭配。

### 6. 新增 CSS 变量

**决定**：在 `index.css` 中为明暗主题各新增一个变量：
- `--color-bg-pill-active`：激活药丸背景色（亮色: `#ffffff`，暗色: `#2d2d2d`）
- `--color-bg-pill-hover`：hover 药丸背景色，半透明（亮色: `rgba(0,0,0,0.05)`，暗色: `rgba(255,255,255,0.06)`）

**理由**：现有变量没有半透明背景色，新增变量可以让主题切换自然覆盖药丸效果。

## Risks / Trade-offs

- **[命令式 hover 管理复杂度]** → Tab 级别 hover 需同时控制背景色和子元素（关闭按钮）的 opacity，嵌套 onMouseEnter/Leave 事件需注意事件冒泡。可通过在 Tab 元素上统一管理 hover 态来规避。
- **[内联样式限制]** → 无法使用 `:active` 伪类实现按压效果，需 `onMouseDown`/`onMouseUp` 手动管理。代码略显冗长但功能等价。
- **[Tab 宽度一致性]** → 关闭按钮用 opacity 隐藏（而非移除），所有 Tab 保持相同宽度，不会因 hover 导致布局跳动。这是有意为之的 trade-off：牺牲少量非激活 Tab 空间换取视觉稳定性。
