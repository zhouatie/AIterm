## Context

当前应用是一个 Electron 桌面工作台，窗口内容为全屏终端面板，通过 PanelManager 提供面板注册和切换机制。布局系统（`PanelContainer`）以 absolute 定位叠放所有面板，一次只显示一个。终端模块已支持多 Tab，每个 Tab 对应独立 PTY 会话。主进程通过 IPC 管理 PTY 生命周期，preload 脚本暴露 `terminalApi`。

用户希望在终端旁边增加文件预览能力（文件树 + Markdown 渲染），形成左右分栏布局，类似 VS Code 的侧边栏 + 编辑器布局。

技术约束：Electron contextIsolation 启用，文件系统操作必须通过主进程 IPC，渲染进程不可直接访问 Node.js API。

## Goals / Non-Goals

**Goals:**
- 实现左右分栏布局，左栏为文件预览区，右栏为现有面板系统（终端等）
- 左栏包含文件树和 Markdown 预览两个子区域（上下布局）
- 文件树根目录自动与右侧激活终端 Tab 的工作目录同步
- Markdown 文件点击后在预览区渲染，使用成熟开源库
- 分栏比例可拖拽调整
- 保持安全架构：文件系统操作通过 IPC + preload 桥接

**Non-Goals:**
- 不实现通用代码编辑器（非 Markdown 文件仅显示在文件树中，不打开预览）
- 不实现文件编辑/保存功能（只读预览）
- 不实现文件搜索/过滤
- 不实现多文件 Tab 预览（一次只预览一个文件）
- 不实现远程文件系统支持

## Decisions

### 决策 1：布局架构 — 在 PanelContainer 外层增加分栏容器

**选择**：在 `App.tsx` 层面引入一个 `SplitLayout` 组件，将窗口分为左右两栏。左栏渲染文件预览面板，右栏渲染现有的 `PanelContainer`。

**替代方案**：将文件预览作为一个独立面板注册到 PanelManager。
**否决原因**：PanelManager 的设计是"一次显示一个面板"，文件预览需要和终端同时可见，属于不同层级的布局概念。

**替代方案**：使用第三方分栏库（如 react-split-pane）。
**否决原因**：分栏逻辑相对简单（一个可拖拽分隔条 + flex 布局），引入额外依赖不值得。自行实现一个 `SplitLayout` 组件即可。

### 决策 2：Markdown 渲染库 — react-markdown + remark-gfm + rehype-highlight

**选择**：使用 `react-markdown`（周下载量 300 万+）作为核心渲染器，搭配 `remark-gfm`（GFM 表格、任务列表等）和 `rehype-highlight`（代码块语法高亮）。

**替代方案**：marked + DOMPurify + 手动注入。
**否决原因**：需要 dangerouslySetInnerHTML，安全风险更高，且与 React 组件模型不协调。

**替代方案**：@uiw/react-markdown-preview。
**否决原因**：功能更重，捆绑暗色主题，定制成本高。

### 决策 3：文件系统 IPC 设计 — 最小化 API 表面

**选择**：新增两个 IPC 通道：
- `fs:readdir`：给定路径，返回目录条目列表（名称、类型、大小）
- `fs:readfile`：给定路径，返回文件文本内容（限定最大 1MB）

通过 preload 暴露为 `window.fileApi.readDir(path)` 和 `window.fileApi.readFile(path)`。

**安全考虑**：主进程侧对路径做基本校验（拒绝 `..` 遍历到非预期位置），但不做严格沙箱——这是本地开发工具，用户有完全的文件系统权限。

### 决策 4：工作目录同步 — 通过 PTY cwd 查询

**选择**：利用 `node-pty` 的 `process` 属性（返回当前前台进程名称）以及 `/proc` 或 `lsof` 机制在 macOS 上获取 PTY 的当前工作目录。但更实用的方案是：主进程新增一个 `terminal:getCwd` IPC 通道，通过读取 `/proc/<pid>/cwd`（Linux）或使用 `lsof -p <pid>` 解析（macOS）获取 shell 进程的 cwd。

**简化替代方案**：在创建 PTY 时记录初始 cwd，后续不追踪变化。
**取舍**：初版可以先用这个简化方案，用户手动 `cd` 后文件树不会自动更新。后续可通过 shell integration（PROMPT_COMMAND hook）或定时 lsof 轮询来增强。

**最终决定**：初版采用简化方案——PTY 创建时记录 cwd 并返回给渲染进程。在 `pty-manager.ts` 的 `PtySession` 中增加 `cwd` 字段。后续迭代再增加实时 cwd 追踪。

### 决策 5：文件树组件 — 自行实现轻量树

**选择**：自行实现一个简单的递归树组件（`FileTree`），支持展开/折叠目录、选中文件。默认过滤只显示 `.md` 文件和包含 `.md` 文件的目录。

**替代方案**：使用 react-arborist 等树组件库。
**否决原因**：文件树需求简单（只显示 Markdown 文件），引入完整树组件库过于重量级。

### 决策 6：文件预览面板内部布局

**选择**：文件预览面板内部采用上下布局——上方为文件树（固定高度或可折叠），下方为 Markdown 预览区（占满剩余空间）。选中文件后，预览区展示渲染结果。

未选中文件时，预览区显示占位提示。

## Risks / Trade-offs

- **[风险] 初版无法追踪终端 cwd 变化** → 用户 cd 后文件树不更新。缓解：在文件树顶部显示当前根路径，后续通过 shell integration 增强。
- **[风险] 大目录加载性能** → 如果 cwd 下有数千文件。缓解：初版过滤只显示 `.md` 文件，且使用懒加载（展开目录时才请求子目录内容）。
- **[风险] Markdown 文件可能很大** → 缓解：`fs:readfile` 限制最大 1MB，超出提示用户。
- **[取舍] 自行实现分栏拖拽** → 比用第三方库更轻量，但需要处理鼠标事件、最小宽度约束等细节。复杂度可控。
- **[取舍] 文件树只显示 Markdown** → 限制了通用性，但符合当前产品定位（前端开发笔记/文档工作台）。后续可扩展过滤规则。
