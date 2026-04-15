## 1. 依赖与基础设施

- [x] 1.1 安装 `@git-diff-view/react` 和 `@git-diff-view/core` 依赖
- [x] 1.2 在 `src/main.ts` 中新增 `git:diff` IPC handler — 接收 `cwd`，执行 `git -C {cwd} diff HEAD`，返回原始 diff 文本（含错误处理）
- [x] 1.3 在 `src/main.ts` 中新增 `git:status-summary` IPC handler — 接收 `cwd`，执行 `git -C {cwd} status --porcelain`，返回解析后的文件变更摘要对象
- [x] 1.4 在 `src/preload.ts` 中新增 `gitApi` bridge，暴露 `window.gitApi.diff(cwd)` 和 `window.gitApi.statusSummary(cwd)`
- [x] 1.5 在 `src/global.d.ts` 中补充 `window.gitApi` 的类型声明

## 2. 快捷键系统扩展

- [x] 2.1 在 `src/ShortcutContext.tsx` 的 `ShortcutActionId` 联合类型中新增 `'toggle-git-diff'`
- [x] 2.2 在 `SHORTCUT_ACTIONS` 数组中新增对应的 action 定义（title: 'Git Diff 面板展示/收起'）
- [x] 2.3 在 `DEFAULT_SHORTCUT_BINDINGS` 中添加 `'toggle-git-diff': 'Meta+G'`

## 3. App 层 overlay 状态重构

- [x] 3.1 将 `App.tsx` 中的 `isBrowserOpen` state 替换为 `activeOverlay: 'none' | 'browser' | 'git-diff'`
- [x] 3.2 更新 `toggleBrowser` 函数和 Browser icon 的 active 样式逻辑，改为基于 `activeOverlay === 'browser'` 判断
- [x] 3.3 更新 `BrowserPanel` 的 `isOpen` prop 传值为 `activeOverlay === 'browser'`
- [x] 3.4 更新 `BrowserPanel` 的 `onClose` 回调为 `setActiveOverlay('none')`
- [x] 3.5 注册 `toggle-git-diff` 快捷键 handler，根据 `isGitRepo` 状态决定是否响应

## 4. Title Bar Git Diff Icon

- [x] 4.1 在 title bar 的 Live View icon 与 Browser icon 之间添加 Git Diff icon 按钮（使用 lucide-react 的 `GitCompareArrows` 或 `FileDiff` 图标）
- [x] 4.2 实现 icon 的禁用态样式 — 当 active session 的 `isGitRepo === false` 时降低 opacity、设置 cursor: not-allowed、tooltip 显示"当前目录不是 Git 仓库"
- [x] 4.3 实现 icon 的 active 态样式 — 当 `activeOverlay === 'git-diff'` 时应用与 Browser icon 相同的高亮效果
- [x] 4.4 实现点击逻辑 — 禁用时不响应，否则 toggle `activeOverlay` 在 `'none'` 和 `'git-diff'` 之间切换

## 5. GitDiffPanel 组件

- [x] 5.1 创建 `src/components/GitDiffPanel.tsx`，实现基础骨架 — slide-over 动画容器（复制 BrowserPanel 的 `panelContainerStyle` 模式）
- [x] 5.2 实现面板打开时的数据获取逻辑 — 调用 `window.gitApi.diff(cwd)` 和 `window.gitApi.statusSummary(cwd)` 获取数据
- [x] 5.3 实现面板顶部 header — 展示分支名、文件变更摘要、关闭按钮
- [x] 5.4 使用 `@git-diff-view/core` 解析 diff 文本，按文件拆分为 DiffFile 实例
- [x] 5.5 使用 `@git-diff-view/react` 的 `DiffView` 渲染每个文件的 diff，传入 `diffViewTheme` 匹配当前主题
- [x] 5.6 引入 `@git-diff-view/react/styles/diff-view-pure.css` 样式
- [x] 5.7 实现无改动时的空状态提示（"当前没有改动"）
- [x] 5.8 实现加载中状态（获取 diff 数据期间显示 loading indicator）

## 6. 状态联动与边界情况

- [x] 6.1 实现切换 terminal tab 时 icon 状态实时更新 — 订阅 activeSessionId 变化，获取对应 session 的 `isGitRepo`
- [x] 6.2 实现切换到非 git tab 时自动关闭已打开的 Git Diff 面板
- [x] 6.3 在 `App.tsx` 中将 `GitDiffPanel` 挂载到 content area（与 BrowserPanel 同级）
- [x] 6.4 验证 BrowserPanel 与 GitDiffPanel 的互斥行为 — 打开一个时另一个自动关闭

## 7. 验证与清理

- [x] 7.1 验证 dark/light 主题切换时 diff 视图配色正确更新
- [x] 7.2 验证 `Meta+G` 快捷键在 terminal 获焦时正常触发
- [x] 7.3 验证非 git 目录下快捷键和 icon 点击均不响应
- [x] 7.4 运行 TypeScript 编译检查，确保无类型错误
