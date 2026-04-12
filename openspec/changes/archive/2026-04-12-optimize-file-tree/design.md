## Context

当前应用采用左右分栏布局，左栏为 `FilePreviewPanel`（内含 `FileTree` + `MarkdownPreview` 的嵌套分栏），右栏为终端面板。文件树始终可见，通过 2 秒间隔的 `setInterval` 轮询终端 CWD 变化来同步根目录。文件树节点不支持右键菜单操作。

文件树加载性能瓶颈：`fs:readdir` IPC handler 中，对每个子目录调用 `directoryContainsMarkdown()`，该函数递归遍历子目录（最大深度 5），每层都 spawn `git check-ignore` 子进程。在目录较多的项目中，这导致数十次甚至上百次子进程调用，加载明显卡顿。

核心约束：
- macOS `hiddenInset` 标题栏，traffic lights 位于 `{x:12, y:12}`，左栏顶部有 38px padding
- 使用 `lucide-react` 图标库，行内样式（无 CSS-in-JS 或 Tailwind）
- 项目无现有右键菜单实现
- 用户机器已安装 `fd`、`rg`、`fzf` 等终端工具

## Goals / Non-Goals

**Goals:**
- 移除 CWD 定时轮询，改为手动刷新按钮，减少后台资源消耗
- 用户可通过应用顶部 toggle icon 快速收起/展开整个左栏（文件树+预览）
- 左栏收起时完全停止 CWD 同步和目录读取，终端面板占满全宽
- 左栏展开时自动恢复 CWD 同步并刷新文件树
- 展开/收起状态通过 `localStorage` 持久化，下次启动恢复上次状态
- 文件和目录节点支持右键菜单，可复制相对路径和绝对路径
- 用 `fd` 命令替代递归遍历优化文件树加载性能

**Non-Goals:**
- 不改变文件树与 MarkdownPreview 之间的分栏布局结构
- 不添加文件树的持久化**节点**展开状态（收起后重新展开不保留之前展开的子目录）
- 不在右键菜单中添加路径复制以外的操作（如删除、重命名等）
- 不使用 Electron 原生菜单（Menu.buildFromTemplate），使用纯 React 实现上下文菜单
- 不将 `fd` 作为硬依赖——当 `fd` 不可用时回退到现有 Node.js 方案

## Decisions

### 1. 移除 CWD 轮询，改为手动刷新

**决策**：删除 `FilePreviewPanel` 中的 2 秒 `setInterval` CWD 轮询，在文件树工具栏（toggle icon 旁）添加一个刷新按钮（`RefreshCw` 图标），点击时手动获取终端 CWD 并刷新文件树。保留 session 切换时的一次性 CWD 同步。

**理由**：轮询每 2 秒发一次 IPC + lsof 系统调用，大部分时候 CWD 没变，白白消耗资源。用户执行 `cd` 后手动点刷新更符合操作心理模型，也完全避免了轮询开销。

**替代方案**：增大轮询间隔到 10 秒——仍有不必要的开销，且延迟更高，不如手动触发直观。

### 2. Toggle 状态管理提升到 App.tsx 层级

**决策**：在 `App.tsx` 的 `AppContent` 中新增 `panelVisible` 状态，控制整个左栏（文件树+预览）的显隐。`FilePreviewPanel` 接收 `visible` prop 来控制 CWD 同步行为。

**理由**：toggle 控制的是整个左栏而非仅文件树，需要在包含 `SplitLayout` 的层级管理。同时 `localStorage` 持久化也更适合放在应用顶层。

**替代方案**：放在 `FilePreviewPanel` 层级——但无法控制整个左栏的显隐，只能控制文件树内部。

### 3. 收起时通过 SplitLayout.leftCollapsed 隐藏左栏（保持 DOM 挂载）

**决策**：为 `SplitLayout` 新增 `leftCollapsed` prop。收起时左栏 width 设为 0、divider 隐藏，但两侧子组件始终保持挂载。`FilePreviewPanel` 通过 `visible` prop 感知收起状态，跳过 CWD 同步和 IPC 调用。

**理由**：条件渲染（`panelVisible ? <SplitLayout> : <PanelContainer>`）会导致终端面板 DOM 重建，xterm.js 终端会重绘，造成闪烁和状态丢失。通过 CSS width:0 隐藏左栏，右侧终端面板 DOM 完全不变。

**替代方案**：条件渲染——终端会重绘，用户体验差。`display:none`——组件仍挂载但 effects 仍运行，无法节省 IPC 开销。

### 4. Toggle icon 绝对定位在应用顶部

**决策**：toggle icon 使用 `position: absolute` 放在 `AppContent` 根 div 中，`top:6, left:68`（traffic lights 右侧），`z-index:1000`，`WebkitAppRegion: no-drag`。`TerminalTabBar.paddingLeft` 从 80 增加到 96 以避免与 tab 内容重叠。

**理由**：该位置在视觉上紧接 macOS traffic lights，两种状态下（展开/收起）始终可见。绝对定位使按钮独立于左右面板布局。`TerminalTabBar.paddingLeft` 增加到 96 确保收起状态下按钮不与 tab 内容重叠。`PanelLeftClose`/`PanelLeftOpen` 图标语义明确，已有 lucide-react 依赖无需新增。

### 5. 使用 localStorage 持久化展开/收起状态

**决策**：`panelVisible` 状态初始化时从 `localStorage.getItem('sidebarPanelVisible')` 读取，toggle 时同步写入 `localStorage`。默认值为 `true`（展开）。

**理由**：用户收起侧边栏后重启应用，期望保持上次的状态。`localStorage` 是 Electron 渲染进程中最轻量的持久化方案，无需 IPC 或文件 I/O。

### 6. 右键菜单使用纯 React 实现

**决策**：通过 `onContextMenu` 事件在文件树节点上触发，渲染一个绝对定位的菜单 div，包含"复制相对路径"和"复制绝对路径"两个选项。点击菜单外区域或选择后关闭菜单。

**理由**：项目无现有右键菜单系统，且仅需两个菜单项，使用 Electron 原生 `Menu` 会增加 IPC 开销和代码复杂度。纯 React 方案轻量且与现有代码风格一致。

**替代方案**：使用 Electron `Menu.buildFromTemplate()` + IPC——对两个菜单项过于重量级。

### 7. 复制操作使用 Clipboard API

**决策**：使用 `navigator.clipboard.writeText()` 将路径写入剪贴板。相对路径通过截取 `rootPath` 前缀计算，绝对路径直接使用节点的 `path` 属性。

**理由**：Electron 渲染进程支持 Web Clipboard API，无需通过 IPC 调用主进程的 `clipboard` 模块。两种路径计算都在渲染进程中即可完成。

### 8. 文件树展开时的恢复策略

**决策**：文件树从收起恢复到展开时，重新获取当前终端 CWD 并加载文件树，不保留之前的树状态（节点展开状态等）。

**理由**：收起期间终端 CWD 可能已经变化，恢复旧树状态会导致显示过时信息。重新加载确保数据一致性，且使用 `fd` 优化后加载延迟很低。

### 9. 用 `fd` 优化文件树加载性能

**决策**：重写 `fs:readdir` IPC handler。新增一个 `fs:scan-md-files` IPC 通道，使用 `fd -e md --type f` 一次性扫描指定目录下所有 `.md` 文件路径，然后在主进程中根据路径列表构建目录树结构返回给渲染进程。`FileTree` 组件改为一次性接收完整树结构，不再逐目录懒加载。

**实现细节**：
- 命令：`fd -e md --type f --hidden=false` 从 rootPath 执行，输出所有 `.md` 文件的相对路径
- `fd` 默认遵守 `.gitignore`，不需要单独调用 `git check-ignore`
- 解析输出的相对路径列表，按 `/` 分割构建嵌套树结构
- 渲染进程调用新的 `fileApi.scanMdFiles(rootPath)` 替代原有逐层 `readDir`

**理由**：当前方案对 N 个子目录 × 5 层深度做递归遍历 + spawn `git check-ignore`，I/O 和进程创建开销巨大。`fd` 基于 Rust 实现，单次扫描即可替代全部递归调用，且自动遵守 `.gitignore`，减少至 1 次子进程调用。

**Fallback**：检测 `fd` 是否可用（`which fd`），不可用时回退到现有 Node.js 递归方案，保证兼容性。

**替代方案**：
- 使用 `rg --files -g "*.md"`——也很快，但 `fd` 专为文件查找设计，输出更干净
- 使用 `find` + `-name "*.md"`——不遵守 `.gitignore`，速度也不如 `fd`

## Risks / Trade-offs

- **[风险] `fd` 未安装** → 启动时检测 `fd` 可用性，不可用时回退到现有 Node.js 递归方案，功能不受影响仅性能降级
- **[风险] 右键菜单定位可能超出视口边界** → 在渲染菜单前检测位置，如果接近底部/右侧边缘则调整方向
- **[权衡] 移除 CWD 轮询** → 用户 `cd` 后需手动点击刷新按钮才能看到新目录，换取零后台开销。切换终端 Tab 仍会自动同步
- **[权衡] `fd` 全量扫描替代懒加载** → 首次加载获取完整树结构，对超大项目（数万 .md 文件）可能有短暂延迟，但对正常项目（几百文件）几乎瞬间完成
- **[权衡] 收起后不保留文件树状态** → 换取数据一致性，用户需重新展开深层目录
- **[风险] Clipboard API 在某些 Electron 安全配置下可能受限** → 当前 preload 已开启 contextIsolation，Clipboard API 在渲染进程中可正常使用
