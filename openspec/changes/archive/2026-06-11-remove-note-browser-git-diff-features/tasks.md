## 1. Renderer 入口与组件移除

- [x] 1.1 从 `src/App.tsx` 移除浏览器、Git Diff、笔记的 imports、overlay 分支、标题栏按钮、快捷键注册和组件挂载
- [x] 1.2 删除 `src/components/BrowserPanel.tsx`、`src/components/GitDiffPanel.tsx`、`src/components/NotePanel.tsx`、`src/components/NoteFileList.tsx`、`src/components/NoteEditor.tsx`
- [x] 1.3 删除笔记专用工具模块 `src/utils/note-settings.ts`、`src/utils/note-workbench-state.ts`、`src/utils/note-autosave.ts`
- [x] 1.4 确认终端 tab 的 git 分支名显示、git root metadata 和文件树 `.gitignore` 过滤未被删除

## 2. 快捷键与设置面板收敛

- [x] 2.1 从 `src/ShortcutContext.tsx` 移除 `toggle-browser`、`toggle-git-diff`、`toggle-notes` action、默认绑定和动作文案
- [x] 2.2 更新快捷键配置读取/校验逻辑，使旧 localStorage 中已移除 action 被忽略且不造成冲突或空值错误
- [x] 2.3 从 `src/App.tsx` 移除浏览器上下文快捷键分发和笔记开关键保留分发逻辑
- [x] 2.4 从 `src/components/SettingsPanel.tsx` 移除 Vault 管理区、note props/state、Vault 校验和保存回调
- [x] 2.5 确认设置面板仍展示并保存保留的快捷键、spec 目录、隐藏文件夹和终端 renderer 配置

## 3. Preload 与 Main IPC 清理

- [x] 3.1 从 `src/preload.ts` 和 `src/global.d.ts` 移除 `browserApi`、`gitApi`、`BrowserShortcutCommand`、`GitApi`、`GitStatusSummary`
- [x] 3.2 从 `fileApi` 暴露中移除笔记专用 `scanNotes` 和默认笔记目录专用 `getUserDataPath`
- [x] 3.3 从 `src/main.ts` 移除浏览器 open-state、webview shortcut/new-window 拦截、`browser:*` IPC 和浏览器快捷键解析函数
- [x] 3.4 从 Electron BrowserWindow 配置中移除已废弃的 `webviewTag: true`
- [x] 3.5 从 `src/main.ts` 移除 `git:diff`、`git:status-summary` IPC 和只服务 Git Diff 面板的类型
- [x] 3.6 从 `src/main.ts` 移除 `fs:scan-notes` handler，保留通用文件读写、目录扫描、gitignore 过滤和终端相关 IPC

## 4. 依赖与构建清理

- [x] 4.1 从 `package.json` 移除 `@git-diff-view/core`、`@git-diff-view/react`、`vditor`
- [x] 4.2 更新项目保留的 lockfile，确保已删除依赖不再被直接引用
- [x] 4.3 运行 TypeScript/打包或现有可用校验命令，修复所有残留 import、类型和 IPC 引用
- [x] 4.4 搜索确认 `BrowserPanel`、`GitDiffPanel`、`NotePanel`、`toggle-browser`、`toggle-git-diff`、`toggle-notes`、`browserApi`、`gitApi`、`scanNotes` 在运行时代码中无残留

## 5. 行为验证

- [x] 5.1 启动应用，确认标题栏不再显示浏览器、Git Diff、笔记按钮
- [x] 5.2 打开设置面板，确认不再显示 Vault 管理区和三项已移除功能的快捷键配置
- [x] 5.3 验证保留快捷键仍可创建/关闭/重命名 workspace 与 terminal tab，并可切换 terminal tab
- [x] 5.4 验证终端位于 git 仓库时 tab 仍可显示分支名，非 git 目录仍显示路径最后一级名称
- [x] 5.5 验证文件树仍按 `.gitignore` 和隐藏文件夹配置过滤，文件预览和文件预览查找仍正常
- [x] 5.6 运行 OpenSpec 状态/校验命令，确认本 change 仍处于 apply-ready 状态
