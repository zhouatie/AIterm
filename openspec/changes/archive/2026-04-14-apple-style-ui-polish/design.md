## Context

AItem.tabs 是 Electron 41 + React 19 的终端工作台。UI 使用 inline React styles + CSS 自定义属性，通过 `data-theme="light|dark"` 切换主题。

当前问题的根源——不是"缺一个阴影"，而是**活跃态和非活跃态之间的视觉对比不够大**：
- Terminal 活跃 tab 背景 `rgba(255,255,255,0.82)` vs 非活跃 `transparent`，在白色侧边栏上对比度极低
- 文件树所有行视觉权重相同，hover/选中无过渡，文件夹金色与主题不搭
- 侧边栏 `rgba(255,255,255,0.72)` 背景太实，毛玻璃 blur 效果被高不透明度抹杀

核心文件：
- `src/index.css`（469 行）— 全部 CSS 自定义属性
- `src/components/TerminalPanel.tsx`（1517 行）— terminal sidebar + tab 行
- `src/components/FileTree.tsx`（882 行）— 文件树 + TreeNodeItem

## Goals / Non-Goals

**Goals:**
- 活跃 terminal tab 像一张独立卡片"浮"在侧边栏上，与非活跃行之间有**显而易见**的层次差
- 文件树达到 macOS Finder 侧边栏级别的精致度和舒适度
- 侧边栏毛玻璃效果真正可见——透过去能隐约看到背后内容
- 所有变更通过 CSS 自定义属性适配 light/dark/system 三种模式
- 零新外部依赖

**Non-Goals:**
- 不引入 vscode-icons 等文件扩展名多色图标库
- 不重构 inline styles 架构（不迁移到 CSS modules 或 styled-components）
- 不改变任何交互逻辑、键盘快捷键或状态管理
- 不调整 terminal 内容区（xterm.js）的样式

## Decisions

### Decision 1：活跃 Tab "卡片化" — 从列表项升级为浮动卡片

**选择**：通过阴影 + 间距 + 高不透明度三管齐下，让活跃 tab 在视觉上脱离列表

```
  非活跃 tab:  透明背景，弱文字
  ─────────────────────────────────────────
  
  ┌───────────────────────────────────────┐╲
  │                                       │ ░  ← 三层外阴影
  │  ●  active-session            ✕      │ ░
  │                                       │ ░
  └───────────────────────────────────────┘╱
     ↑ margin-top/bottom: 4px (与相邻行拉开间距)
     ↑ padding 垂直增加 2px (行内更胖)
     ↑ background: rgba(255,255,255,0.92) (比 0.82 更"实")
     ↑ backdrop-filter: blur(12px) saturate(150%)
     ↑ inset 0 0.5px 0 rgba(255,255,255,0.9) (顶部高光)
  
  ─────────────────────────────────────────
  非活跃 tab:  透明背景，弱文字
```

**阴影值（light 模式）**：
```css
--shadow-tab-active:
  0 1px 2px rgba(0, 20, 60, 0.08),    /* 接触阴影 — 紧贴底边 */
  0 4px 12px rgba(0, 20, 60, 0.06),   /* 中距扩散 — 柔和光晕 */
  0 12px 32px rgba(0, 20, 60, 0.05);  /* 远距弥漫 — 空间深度 */
```

**阴影值（dark 模式 — 不透明度 4x）**：
```css
--shadow-tab-active:
  0 1px 3px rgba(0, 0, 0, 0.32),
  0 4px 14px rgba(0, 0, 0, 0.24),
  0 14px 36px rgba(0, 0, 0, 0.20);
```

**理由**：仅靠背景色在半透明侧边栏上做不出层次。Apple 的所有"浮动"元素（popover、sheet、active tab）都用强阴影 + 高不透明度来脱离背景。margin 间距是关键——没有 gap 就不会有"卡片在列表中"的感觉。

**替代方案**：只加阴影不加间距 — 前一版提案的问题，效果太弱。

### Decision 2：非活跃 Tab 大幅弱化

**选择**：文字不透明度降到 55-65%，指示点变淡

```
  当前对比度：
  Active:   color: --color-text-primary (#18212f)      ← 100%
  Inactive: color: --color-text-secondary (#344053)    ← ~85%
  差距太小！

  目标对比度：
  Active:   color: --color-text-primary (#18212f)      ← 100%
  Inactive: color: rgba(52, 64, 83, 0.55)              ← ~55%
  差距明显！
```

**理由**：Apple 的导航列表中非活跃项通常非常"安静"，让 active 项不需要"喊"就能跳出来。当 inactive 足够弱时，active 加了阴影/卡片后对比才足够明显。

### Decision 3：侧边栏毛玻璃真正"通透"

**选择**：降低背景不透明度 + 增强 blur

| 属性 | 当前 | 改为 |
|------|------|------|
| Light bg | `rgba(255,255,255,0.72)` | `rgba(255,255,255,0.55)` |
| Dark bg | `rgba(27,33,43,0.82)` | `rgba(27,33,43,0.65)` |
| blur | `blur(18px)` | `blur(24px)` |
| saturate | `saturate(160%)` | `saturate(180%)` |

**理由**：72% 不透明度下，blur 再大也看不到背后内容。macOS 的侧边栏毛玻璃大约在 40-60% 不透明度，配合 20-30px blur。降到 55% 后背后的 terminal 输出会隐约可见，这才是"毛玻璃"的意义。

**风险缓解**：如果 55% 太透导致文字可读性下降，可以微调到 60%。但 72% 绝对太实。

### Decision 4：文件树行高与间距大幅调整

| 属性 | 当前 | 改为 | 增幅 |
|------|------|------|------|
| ROW_HEIGHT | 28px | 34px | +21% |
| ICON_SIZE | 15px | 16px | +7% |
| Icon margin-right | 5px | 8px | +60% |
| Chevron size | 14px | 15px | — |

**理由**：macOS Finder 侧边栏行高约 28-36px，但 Finder 的间距和内边距让实际感受更舒展。34px 配合 8px 图标间距会产生明显的"呼吸感"差异。在 800px 面板中可见行从 28 行降到 23 行，但文件树有虚拟滚动，性能零影响。

### Decision 5：文件夹蓝灰色 + 目录名加粗

**图标颜色**：
```
Light:  #6b87b5 (柔和蓝灰色，适度饱和)
Dark:   #8aa3d4 (亮蓝灰色)
```

**目录名字重**：`fontWeight: 550`（比文件的 `normal` 更重，但不到 `bold`）

**理由**：双重信号（颜色 + 字重）确保目录和文件在快速扫描时有足够区分。`#6b87b5` 比 `rgba(62,104,178,0.5)` 更实在，不会在浅色背景上显得虚。

### Decision 6：选中文件 accent 指示条

```
  选中态：左侧 3px 圆角 accent 指示条 + 背景高亮

     ┃ 📄 selected-file.ts            ← ┃ 是 3px accent 色指示条
       📄 other-file.ts
       📁 folder-name
```

通过 `borderLeft: 3px solid var(--color-accent-primary)` + `borderRadius: 2px`（对整行设 `borderRadius: 8px`，指示条在左侧圆角内自然融合）。

### Decision 7：Hover 态圆角卡片感

文件树 hover 行添加：
- `borderRadius: 8px`
- `transition: background-color 150ms ease, box-shadow 150ms ease`
- hover 时增加一层极淡阴影 `0 1px 3px rgba(0,0,0,0.04)` (light)

让 hover 不只是"变个颜色"，而是有"微微浮起"的感觉。

### Decision 8：CSS Token 命名与值

新增 token：

| Token | Light | Dark |
|-------|-------|------|
| `--shadow-tab-active` | `0 1px 2px rgba(0,20,60,0.08), 0 4px 12px rgba(0,20,60,0.06), 0 12px 32px rgba(0,20,60,0.05)` | `0 1px 3px rgba(0,0,0,0.32), 0 4px 14px rgba(0,0,0,0.24), 0 14px 36px rgba(0,0,0,0.20)` |
| `--shadow-tab-hover` | `0 1px 3px rgba(0,20,60,0.05), 0 4px 10px rgba(0,20,60,0.03)` | `0 1px 4px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.14)` |
| `--color-tab-active-bg` | `rgba(255,255,255,0.92)` | `rgba(39,47,61,0.98)` |
| `--color-tab-active-inset` | `inset 0 0.5px 0 rgba(255,255,255,0.9)` | `inset 0 0.5px 0 rgba(255,255,255,0.10)` |
| `--color-tab-active-border` | `rgba(106,128,169,0.22)` | `rgba(126,151,217,0.22)` |
| `--color-tab-inactive-text` | `rgba(52,64,83,0.55)` | `rgba(197,208,226,0.50)` |
| `--color-tab-inactive-dot` | `rgba(125,135,153,0.40)` | `rgba(129,144,168,0.35)` |
| `--shadow-tree-row-hover` | `0 1px 3px rgba(0,20,60,0.04)` | `0 1px 4px rgba(0,0,0,0.16)` |
| `--color-tree-row-hover` | `rgba(49,67,93,0.06)` | `rgba(214,225,255,0.06)` |
| `--color-tree-indicator` | `var(--color-accent-primary)` | `var(--color-accent-primary)` |

修改的 token：

| Token | 当前 Light | 改为 Light | 当前 Dark | 改为 Dark |
|-------|-----------|-----------|----------|----------|
| `--color-surface-sidebar` | `rgba(255,255,255,0.72)` | `rgba(255,255,255,0.55)` | `rgba(27,33,43,0.82)` | `rgba(27,33,43,0.65)` |
| `--color-icon-folder` | `#a38046` | `#6b87b5` | `#d7b075` | `#8aa3d4` |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 侧边栏降到 55% 不透明度后文字可读性下降 | blur 从 18→24px 补偿，同时活跃 tab 卡片自身有 92% 不透明度。若 55% 过透可微调到 58-60% |
| 活跃 tab 增加 margin 后与上下行产生间距，可能让列表看起来"不连贯" | 这正是预期效果——卡片需要从列表中"跳出来"。margin 控制在 4px，刚好能看出间距但不破坏列表节奏 |
| 文件树行高 28→34px 减少可见行数约 21% | 文件树有虚拟滚动，性能无影响。34px 是 macOS Finder 的标准行高，用户习惯接受度高 |
| 三层阴影 + backdrop-filter 嵌套的 GPU 开销 | 仅 1 个活跃 tab 元素有完整效果，其余都是透明无 shadow。实测在 Electron Chromium 上几乎无性能差异 |
| `--color-icon-folder` 修改影响 terminal sidebar 的 workspace 图标 | 预期行为——workspace 图标也应统一为蓝灰色 |
