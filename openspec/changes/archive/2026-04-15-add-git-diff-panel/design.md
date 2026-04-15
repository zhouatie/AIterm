## Context

AIterm 是一个基于 Electron + React 19 的桌面终端工作台。当前架构中已有一个 BrowserPanel 使用 `position: absolute; translateY` 做从上方滑下的全屏覆盖面板。title bar 上有 4 个 icon 按钮（FileTree / Theme / LiveView / Browser）。终端的 `pty-manager.ts` 已经为每个 session 检测 `isGitRepo` 和 `branchName`，数据通过 IPC 暴露到 renderer。

项目使用 inline React styles（无 CSS-in-JS 库、无 Tailwind），状态管理为 React useState/useRef + Context。快捷键系统通过 `ShortcutContext` 统一管理。

## Goals / Non-Goals

**Goals:**
- 用户一键（或 `Meta+G`）查看当前 terminal session 对应 git 仓库相对于上次 commit 的全部改动
- 提供 GitHub 风格的 diff 视图（语法高亮、按文件分组、+/- 着色）
- 与现有 BrowserPanel 共享交互模式（互斥 slide-over 面板）
- Dark/Light 主题自动适配

**Non-Goals:**
- 不做 git staging / commit / push 等写操作
- 不做 side-by-side diff 视图（第一版只做 unified）
- 不做文件级别的展开/折叠（后续迭代）
- 不做实时 file watcher 自动刷新（每次打开面板时获取）

## Decisions

### 1. 面板互斥 + overlay state 统一管理

**决策**: 引入 `activeOverlay: 'none' | 'browser' | 'git-diff'` 状态替代现有 `isBrowserOpen` boolean。

**理由**: 两个面板都是全屏 slide-over，同时打开无意义且会产生 z-index 竞争。统一为一个 state slot 天然保证互斥，同时扩展性好（未来新增面板只需加枚举值）。

**替代方案**: 保持两个独立 boolean + 在 toggle 时手动关闭另一个 — 状态分散，容易遗漏。

### 2. 非 git 项目时 icon 禁用（而非隐藏或打开空面板）

**决策**: 当 active session 的 `isGitRepo === false` 时，Git Diff icon 显示为灰色禁用态（降低 opacity、cursor: not-allowed、tooltip 提示"当前目录不是 Git 仓库"），`Meta+G` 快捷键静默不响应。

**理由**:
- 隐藏会导致 title bar icon 位置跳动，用户切换 tab 时视觉不稳定
- 打开空面板需要额外的空状态设计，且多一次无意义交互
- 禁用态是桌面应用最标准的"功能存在但不可用"表达

### 3. Diff 数据源使用 `git diff HEAD`

**决策**: 主数据源为 `git diff HEAD`（所有 uncommitted 改动 = staged + unstaged vs 上次 commit），辅以 `git status --porcelain` 提供文件摘要。

**理由**: 用户的核心需求是"看当前工程改了啥"，`git diff HEAD` 最符合这个心智模型。`git diff`（仅 unstaged）或 `git diff --cached`（仅 staged）都只是部分视图。

### 4. 使用 `@git-diff-view/react` 渲染 diff

**决策**: 引入 `@git-diff-view/react` + `@git-diff-view/core` 作为 diff 渲染层。

**理由**:
- GitHub 风格 UI 开箱即用
- 内置 `diffViewTheme` prop 支持 dark/light 切换，与现有 ThemeContext 对接简单
- 提供 pure CSS 版本，不引入 Tailwind 冲突
- API 简洁（`<DiffView data={{ hunks }} />`），与项目"最少依赖"风格匹配

**替代方案**: `react-diff-view`（232k 周下载）更成熟但 API 复杂度高，需自行配 refractor 做语法高亮；自己用 highlight.js 渲染纯文本 diff 则体验太差。

### 5. 动画复用策略：复制 style 而非抽取公共组件

**决策**: `GitDiffPanel` 直接复制 `BrowserPanel` 的 `panelContainerStyle` 动画逻辑（5 行 CSS），不抽取公共 `SlideOverPanel` 组件。

**理由**: BrowserPanel 已有 930 行，重构引入不必要风险。5 行动画代码重复可接受，且两个面板的内部结构完全不同。如果未来出现第三个 slide-over 面板再考虑抽取。

### 6. IPC 设计

**决策**: 新增两个 IPC channel：
- `git:diff` — 接收 `cwd: string`，执行 `git -C {cwd} diff HEAD`，返回原始 diff 文本
- `git:status-summary` — 接收 `cwd: string`，执行 `git -C {cwd} status --porcelain`，返回解析后的文件变更摘要

通过 `preload.ts` 暴露为 `window.gitApi.diff(cwd)` 和 `window.gitApi.statusSummary(cwd)`。

**理由**: 与项目现有 IPC bridge 模式一致（`terminalApi`, `fileApi`, `themeApi` 等）。原始 diff 文本在 renderer 端用 `@git-diff-view/core` 解析，保持 main process 简单。

## Risks / Trade-offs

- **[大 diff 性能]** → `git diff HEAD` 在大型仓库可能产生很大输出。第一版不做 web worker 优化，但 `@git-diff-view/react` 本身支持虚拟滚动，问题不大。如果后续发现性能瓶颈，可启用其 Web Worker 支持。
- **[Untracked 文件盲区]** → `git diff HEAD` 不包含 untracked 文件。通过 `git status --porcelain` 摘要提示用户有 untracked 文件存在，但不展示其内容。
- **[React 19 兼容性]** → `@git-diff-view/react` 需验证与 React 19 的兼容性。若有问题可降级到纯文本高亮渲染作为兜底。
- **[overlay 状态迁移]** → 将 `isBrowserOpen` 改为 `activeOverlay` 会影响 BrowserPanel 的 isOpen 传参逻辑，需要同步修改 Browser icon 的 active 样式判断。
