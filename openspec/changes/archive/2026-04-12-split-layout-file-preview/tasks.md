## 1. 依赖安装与项目配置

- [x] 1.1 安装 Markdown 渲染相关依赖：react-markdown、remark-gfm、rehype-highlight 及 highlight.js
- [x] 1.2 在 `src/global.d.ts` 中新增 `FileApi` 类型声明（readDir、readFile、getCwd）

## 2. 主进程 IPC 与 PTY 扩展

- [x] 2.1 在 `src/pty-manager.ts` 的 `PtySession` 中增加 `cwd` 字段，createSession 时记录初始 cwd
- [x] 2.2 新增 `getSessionCwd(id)` 导出函数，返回指定会话的初始 cwd
- [x] 2.3 在 `src/main.ts` 中注册 `fs:readdir` IPC handler（读取目录条目列表，返回名称和类型）
- [x] 2.4 在 `src/main.ts` 中注册 `fs:readfile` IPC handler（读取文件文本内容，限制 1MB）
- [x] 2.5 在 `src/main.ts` 中注册 `terminal:getCwd` IPC handler（返回指定会话的初始 cwd）

## 3. Preload 脚本扩展

- [x] 3.1 在 `src/preload.ts` 中通过 contextBridge 暴露 `fileApi` 对象（readDir、readFile）
- [x] 3.2 在 `src/preload.ts` 中扩展 `terminalApi`，新增 `getCwd(id)` 方法

## 4. 分栏布局组件

- [x] 4.1 创建 `src/components/SplitLayout.tsx` 组件：左右分栏容器，支持拖拽分隔条调整比例，默认 30%/70%，有最小宽度约束
- [x] 4.2 修改 `src/App.tsx`，用 SplitLayout 包裹左栏（FilePreviewPanel）和右栏（PanelContainer）

## 5. 文件树组件

- [x] 5.1 创建 `src/components/FileTree.tsx`：递归树组件，支持展开/折叠目录、选中文件高亮
- [x] 5.2 实现目录内容懒加载：展开目录时通过 fileApi.readDir 请求子目录内容
- [x] 5.3 实现 Markdown 文件过滤逻辑：只显示 .md 文件和包含 .md 文件的目录

## 6. Markdown 预览组件

- [x] 6.1 创建 `src/components/MarkdownPreview.tsx`：使用 react-markdown + remark-gfm + rehype-highlight 渲染 Markdown 内容
- [x] 6.2 实现未选中文件时的占位提示 UI
- [x] 6.3 添加白色主题下的 Markdown 排版样式和代码高亮样式

## 7. 文件预览面板集成

- [x] 7.1 创建 `src/components/FilePreviewPanel.tsx`：上下布局，上方文件树 + 下方 Markdown 预览
- [x] 7.2 实现文件选中逻辑：点击文件树中的 .md 文件，通过 fileApi.readFile 加载内容并传递给 MarkdownPreview
- [x] 7.3 实现工作目录同步：监听右侧活跃终端 Tab 变化，通过 terminalApi.getCwd 获取 cwd 并更新文件树根目录

## 8. 终端模块适配

- [x] 8.1 从 TerminalPanel 向上暴露当前激活 Tab 的 sessionId（通过 callback prop 或 context）
- [x] 8.2 确保分栏宽度变化时终端 xterm.js 实例正确调用 fitAddon.fit() 重新适配尺寸

## 9. 样式与主题

- [x] 9.1 文件树样式：节点缩进、图标（目录/文件）、hover/选中状态、与白色主题一致
- [x] 9.2 Markdown 预览样式：正文排版、标题层级、代码块、表格、链接等在白色主题下的优雅呈现
- [x] 9.3 分隔条样式：hover 时视觉反馈、拖拽光标变化
