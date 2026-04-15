## Why

AIterm 用户在终端中进行开发时，经常需要查看当前工程相对于上次提交的改动范围。目前只能切到终端手动执行 `git diff`，输出是纯文本、没有语法高亮、不能按文件折叠，体验差。在 title bar 加一个 Git Diff 快捷入口，以 GitHub 风格的 diff 视图展示改动，能让用户一键掌握工程变更全貌。

## What Changes

- 在 title bar 的 Live View icon 与 Browser icon 之间新增 Git Diff icon
- 点击 icon 后，从上方滑下一个全屏覆盖面板（与 BrowserPanel 同样的 slide-over 动画），展示当前 active terminal session 对应 git 仓库的 `git diff HEAD` 输出
- Git Diff 面板与 Browser 面板互斥：同一时间只能打开一个
- 新增键盘快捷键 `Meta+G` 唤起/关闭 Git Diff 面板
- 当 active terminal session 不在 git 仓库内时，Git Diff icon 显示为禁用态（灰色、不可点击）
- 使用 `@git-diff-view/react` 渲染 GitHub 风格的 diff 视图，支持语法高亮和 dark/light 主题适配
- 面板顶部展示分支名和文件变更摘要（来自 `git status --porcelain`）

## Capabilities

### New Capabilities
- `git-diff-panel`: Git Diff 覆盖面板，包括 IPC 数据获取、面板 UI、diff 渲染、icon 状态管理

### Modified Capabilities
- `keyboard-shortcuts`: 新增 `toggle-git-diff` 快捷键动作，默认绑定 `Meta+G`

## Impact

- **新增依赖**: `@git-diff-view/react`, `@git-diff-view/core`
- **受影响代码**:
  - `src/main.ts` — 新增 `git:diff` 和 `git:status-summary` IPC handler
  - `src/preload.ts` — 新增 `gitApi` bridge
  - `src/App.tsx` — overlay 互斥 state、Git Diff icon、面板挂载
  - `src/ShortcutContext.tsx` — 新增 `toggle-git-diff` action ID 和默认绑定
  - 新组件 `src/components/GitDiffPanel.tsx`
