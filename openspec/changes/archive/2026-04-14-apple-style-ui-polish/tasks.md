## 1. 主题 Token 扩展与修改

- [x] 1.1 在 `src/index.css` 的 `:root` 中新增 tab 卡片化 token：`--shadow-tab-active`（三层强阴影）、`--shadow-tab-hover`（两层阴影）、`--color-tab-active-bg`（rgba 255,255,255,0.92）、`--color-tab-active-inset`（顶部高光）、`--color-tab-active-border`、`--color-tab-inactive-text`（rgba 52,64,83,0.55）、`--color-tab-inactive-dot`
- [x] 1.2 在 `[data-theme="dark"]` 中新增对等 tab 卡片化 token，阴影不透明度约为 light 的 3-4 倍，inactive-text 降至 0.50
- [x] 1.3 修改 `:root` 中 `--color-surface-sidebar` 从 `rgba(255,255,255,0.72)` 改为 `rgba(255,255,255,0.55)`
- [x] 1.4 修改 `[data-theme="dark"]` 中 `--color-surface-sidebar` 从 `rgba(27,33,43,0.82)` 改为 `rgba(27,33,43,0.65)`
- [x] 1.5 修改 `:root` 中 `--color-icon-folder` 从 `#a38046` 改为 `#6b87b5`
- [x] 1.6 修改 `[data-theme="dark"]` 中 `--color-icon-folder` 从 `#d7b075` 改为 `#8aa3d4`
- [x] 1.7 在 `:root` 和 `[data-theme="dark"]` 中新增文件树 token：`--color-tree-indicator`、`--color-tree-row-hover`、`--shadow-tree-row-hover`

## 2. Terminal 侧边栏毛玻璃增强

- [x] 2.1 在 `TerminalPanel.tsx` 侧边栏容器 div（约 line 952-964）将 `backdropFilter` 从 `blur(18px) saturate(160%)` 改为 `blur(24px) saturate(180%)`
- [x] 2.2 确认侧边栏背景已自动跟随 `--color-surface-sidebar` 新值（更低不透明度）

## 3. Terminal Tab 卡片化

- [x] 3.1 修改活跃 session tab 行的 `backgroundColor` 为 `var(--color-tab-active-bg)`
- [x] 3.2 修改活跃 session tab 行的 `boxShadow` 为 `var(--shadow-tab-active), var(--color-tab-active-inset)` 组合
- [x] 3.3 修改活跃 session tab 行的 `border` 为 `1px solid var(--color-tab-active-border)`
- [x] 3.4 为活跃 session tab 行添加 `backdropFilter: 'blur(12px) saturate(150%)'`
- [x] 3.5 为活跃 session tab 行添加 `marginTop: 4, marginBottom: 4`，使其与上下非活跃行拉开间距
- [x] 3.6 修改非活跃 session tab 行的文字颜色为 `var(--color-tab-inactive-text)`
- [x] 3.7 修改非活跃 session tab 行的左侧指示点颜色：非 attention 且非 active 时使用 `var(--color-tab-inactive-dot)`
- [x] 3.8 修改 hover 态：非活跃 tab hover 时 `boxShadow` 使用 `var(--shadow-tab-hover)`，`transition` 使用 `200ms ease-out`

## 4. 文件树视觉升级

- [x] 4.1 在 `FileTree.tsx` 中将 `ROW_HEIGHT` 从 28 改为 34
- [x] 4.2 将 `ICON_SIZE` 从 15 改为 16
- [x] 4.3 将图标 `marginRight` 从 5 改为 8
- [x] 4.4 将 chevron 尺寸从 14 改为 15
- [x] 4.5 为目录名添加 `fontWeight: 550`，保持文件名使用默认字重
- [x] 4.6 为 TreeNodeItem 行容器添加 `borderRadius: 8`、`marginLeft: 4`、`marginRight: 4`（给圆角留出空间）
- [x] 4.7 修改 hover 态：添加 `transition: 'background-color 150ms ease, box-shadow 150ms ease'`，hover 时 backgroundColor 使用 `var(--color-tree-row-hover)`，boxShadow 使用 `var(--shadow-tree-row-hover)`
- [x] 4.8 为选中文件行添加 `borderLeft: '3px solid var(--color-tree-indicator)'` + `borderRadius: 8px`
- [x] 4.9 调整选中行的 paddingLeft 补偿 borderLeft 宽度，避免文字偏移

## 5. 整体验证

- [x] 5.1 Light 模式验证：侧边栏是否能透过看到背后 terminal 内容；活跃 tab 是否明确"浮起"，与非活跃行有显而易见的层次差；文件夹图标是否为蓝灰色；文件树行距是否舒适
- [x] 5.2 Dark 模式验证：阴影是否在深色背景上清晰可见；活跃 tab 卡片感是否与 light 模式等价；侧边栏毛玻璃是否通透
- [x] 5.3 主题循环切换测试：light → dark → system 三种模式快速切换，确认所有视觉变更即时生效、无闪烁、无 CSS 变量残留
- [x] 5.4 确认 workspace 节点的文件夹图标已统一为蓝灰色
- [x] 5.5 确认文件树虚拟滚动在新行高下正常工作，滚动流畅无断裂
