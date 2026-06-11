## Why

当前应用已经聚焦为终端工作台，笔记、内嵌浏览器和 Git Diff 面板增加了标题栏入口、快捷键、IPC、持久化状态和依赖维护成本。移除这些非核心功能可以收敛产品表面，降低后续维护与回归测试范围。

## What Changes

- **BREAKING** 移除笔记功能：标题栏笔记入口、笔记 Overlay、Vault 管理设置、笔记文件树、Markdown 编辑器、自动保存和笔记相关本地状态都不再提供。
- **BREAKING** 移除内嵌浏览器功能：标题栏浏览器入口、BrowserPanel、多标签 webview、地址栏导航、历史/补全、浏览器上下文快捷键、新窗口拦截转发和 `window.browserApi` 都不再提供。
- **BREAKING** 移除 Git Diff 面板功能：标题栏 Git Diff 入口、`Meta+G` 默认绑定、Git Diff Overlay、diff/status IPC、`window.gitApi` 和 `@git-diff-view/*` 依赖都不再提供。
- 保留终端 tab 的 git 分支名显示、git 仓库根目录探测，以及文件树按 `.gitignore` 过滤的行为。
- 保留终端、文件树、文件预览、设置面板中与上述三项无关的能力。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `browser-panel`: 移除内嵌浏览器面板及其所有用户可见交互要求。
- `browser-url-autocomplete`: 移除浏览器地址栏历史、过滤补全和搜索建议要求。
- `git-diff-panel`: 移除 Git Diff 面板展示、状态管理、IPC 数据获取和主题适配要求。
- `keyboard-shortcuts`: 移除浏览器、Git Diff、笔记相关默认快捷键和特殊快捷键分发要求。
- `note-panel`: 移除笔记面板、Vault Explorer、文件树操作和笔记工作台要求。
- `note-editor`: 移除 Markdown 所见即所得笔记编辑器要求。
- `note-storage`: 移除笔记默认/自定义 Vault 存储和笔记专用存储要求。
- `note-autosave`: 移除笔记自动保存要求。
- `note-navigation`: 移除笔记工作台上下文恢复要求。
- `note-vault-switching`: 移除笔记 Vault 列表和当前 Vault 切换要求。
- `settings-panel`: 移除设置面板中的 Vault 管理区要求，保留通用、快捷键、spec 目录、隐藏文件夹和终端 renderer 配置。
- `electron-shell`: 移除浏览器 webview 支持、新窗口请求拦截和 `browserApi` 暴露要求。

## Impact

- 前端组件：移除 `BrowserPanel`、`GitDiffPanel`、`NotePanel`、`NoteFileList`、`NoteEditor` 及其在 `App`、设置面板和快捷键系统中的入口。
- Renderer/preload API：移除 `browserApi`、`gitApi`、笔记专用 `fileApi.scanNotes` 暴露和相关类型。
- Main process：移除浏览器 webview 快捷键/新窗口 IPC、Git Diff IPC、笔记扫描 IPC；保留终端 git 信息和文件树 gitignore 过滤。
- 依赖：移除 `@git-diff-view/core`、`@git-diff-view/react`、`vditor` 等只服务被移除功能的依赖。
- 本地状态：不再读写浏览器历史、笔记 Vault 设置和笔记工作台状态；已有本地数据可留在用户磁盘上但不再被 UI 使用。
