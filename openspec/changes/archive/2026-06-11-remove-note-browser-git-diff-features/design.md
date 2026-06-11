## Context

AIterm 目前以 `src/App.tsx` 的标题栏按钮和 overlay 状态承载三个非核心功能：内嵌浏览器、Git Diff 面板和笔记工作台。这些功能横跨 renderer 组件、快捷键注册、preload API、main process IPC、localStorage 状态和 npm 依赖。

本次变更是删除型变更。目标不是替换成新的功能，而是让终端、文件树、文件预览和设置面板回到更小的产品表面。Git 的范围需要特别约束：只移除 Git Diff 面板和快捷键，保留终端 tab 的 git 分支显示、git root 探测，以及文件树 `.gitignore` 过滤。

## Goals / Non-Goals

**Goals:**

- 从 UI 中移除浏览器、Git Diff、笔记三个标题栏入口和对应 overlay。
- 从快捷键系统中移除 `toggle-browser`、`toggle-git-diff`、`toggle-notes` 以及浏览器/笔记特殊分发逻辑。
- 移除 `BrowserPanel`、`GitDiffPanel`、`NotePanel`、`NoteFileList`、`NoteEditor` 和笔记工具模块在运行时代码中的引用。
- 移除 `window.browserApi`、`window.gitApi`、笔记专用 `scanNotes` 暴露和对应 main process IPC。
- 移除只服务这些功能的依赖，例如 `@git-diff-view/*` 和 `vditor`。
- 同步 OpenSpec 主规格，确保被删除能力不再作为系统要求存在。

**Non-Goals:**

- 不删除终端 tab 的 git 分支名显示、git 仓库判断、git root 信息或相关 pty session metadata。
- 不删除文件树、文件预览、Markdown 预览、交互式 Markdown checkbox 写回等与笔记工作台无关的能力。
- 不主动迁移或清理用户磁盘上已有的笔记文件、浏览器历史 localStorage、旧 Vault 设置 localStorage。
- 不重构终端、文件树、设置面板整体架构。

## Decisions

### 1. 以“断开入口 + 删除后端通道”的方式移除功能

选择：先从 `App` 删除 overlay union 中的 `browser`、`git-diff`、`notes` 分支、按钮和组件挂载，再删除不再被引用的组件、工具、IPC 和类型。

理由：三个功能的主入口都集中在 `App` 标题栏和 overlay 层，先断开入口可以让类型错误自然暴露剩余引用，降低遗漏风险。

替代方案：保留组件但隐藏按钮。这个方案仍保留 IPC、依赖和本地状态维护成本，不符合“全部去除”的目标。

### 2. Git 只移除 Git Diff 产品能力

选择：删除 `GitDiffPanel`、`window.gitApi`、`git:diff`、`git:status-summary` 和 `toggle-git-diff`，但保留 `TerminalSessionInfo` 中的 `isGitRepo`、`branchName`、`gitRoot` 与 `pty-manager` 中的 git 探测。

理由：用户已确认只移除 Git Diff 面板和快捷键。终端 tab 分支名显示和文件树 `.gitignore` 过滤属于既有终端/文件体验，不是 Git Diff 面板。

替代方案：删除所有 git 调用。这个方案会改变 terminal tab 自动命名和文件树过滤行为，超出已确认范围。

### 3. 设置面板只移除 Vault 管理区

选择：从 `SettingsPanel` 删除 `noteVaultSettings`、`onSaveNoteVaultSettings`、Vault 管理 UI 和相关校验；保留快捷键、spec 目录、隐藏文件夹和终端 renderer 设置。

理由：设置面板仍是核心配置入口，只有笔记 Vault 配置属于被删除功能。

替代方案：重做设置面板分栏或结构。该重构与删除目标无关，会放大回归面。

### 4. 删除 preload 暴露与 main IPC，而不是保留空实现

选择：移除 `browserApi`、`gitApi`、`FileApi.scanNotes` 的 preload 暴露，以及 `browser:set-open-state`、`browser:open-url`、`browser:shortcut`、`git:*`、`fs:scan-notes` 相关 main 逻辑。

理由：这些 API 没有保留消费者，继续暴露会让已移除能力看起来仍是公共契约。

替代方案：保留返回空结果的兼容 API。当前应用没有外部插件契约依赖这些 API，兼容空壳只会增加维护成本。

### 5. 规格采用“remove requirement”同步删除能力

选择：对浏览器、Git Diff、笔记相关 capability 使用 delta spec 删除原有 requirement；对 `keyboard-shortcuts`、`settings-panel`、`electron-shell` 删除相关局部 requirement 或 scenario。

理由：这次不是修改行为，而是使这些 capability 不再存在。主规格需要在归档后不再要求实现被删除功能。

## Risks / Trade-offs

- [Risk] 删除快捷键 action 后，用户本地 localStorage 里可能还有旧绑定 → 快捷键读取逻辑必须忽略未知 action，或保存时只保留当前 action 集合。
- [Risk] 删除 webview 支持时误伤 Electron 主窗口加载能力 → 只移除 `webviewTag` 和浏览器 webview 事件处理，不改 BrowserWindow 基础加载和安全设置。
- [Risk] 删除笔记文件 API 时误伤文件预览/Markdown 预览 → 只删除 `scanNotes` 与笔记工具模块，保留通用 `readFile`、`writeFile`、`ensureDir`、`rename`、`deleteFile` 等文件能力。
- [Risk] 依赖删除不完整导致 lockfile 或构建失败 → 用包管理器更新 lockfile，并以 TypeScript/Vite/Electron 启动或构建验证收尾。
- [Risk] OpenSpec 主规格仍保留已删除能力要求 → 为所有 proposal 中列出的 modified capability 创建 delta spec，归档时同步删除对应要求。

## Migration Plan

1. 移除 renderer UI 入口和快捷键 action，使应用表面不再出现三项功能。
2. 删除不再被引用的组件、工具模块、preload API 和 main IPC。
3. 删除只服务被移除功能的 npm 依赖并更新 lockfile。
4. 运行类型检查/构建，修复残留引用。
5. 手动验证标题栏、设置面板、快捷键列表、终端 tab 命名、文件树过滤和文件预览仍正常。

Rollback 策略：如果移除后发现关键工作流依赖某项功能，可从该 change 之前的代码恢复对应组件和 IPC；因为本次不迁移用户数据，旧本地数据仍可被恢复后的功能继续读取。

## Open Questions

- 无。Git 范围已确认：只移除 Git Diff 面板和快捷键，保留终端/文件树内部 git 辅助行为。
