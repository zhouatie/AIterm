## Context

本项目是一个 Electron + React 桌面应用（electron-terminal-workbench），左侧为文件树 + Markdown 预览面板，右侧为多 Tab 终端面板。当前文件树仅显示 `.md` 文件，扫描逻辑硬编码在主进程的 `scanWithFd`（使用 `fd -e md`）和 `scanWithNodeFs`（过滤 `.endsWith('.md')`）中。右键菜单已有"复制相对路径"和"复制绝对路径"两个选项。终端 CWD 同步仅在用户手动点击刷新按钮或切换终端 Tab 时触发，用户在终端中 `cd` 后文件树不会自动更新。

关键文件：
- `src/main.ts`：IPC 处理器，文件扫描逻辑，PTY 输出转发
- `src/pty-manager.ts`：PTY 会话管理，CWD 检测（`lsof`）
- `src/preload.ts`：暴露 `terminalApi` 和 `fileApi` 给渲染进程
- `src/components/FileTree.tsx`：文件树组件，工具栏，右键菜单
- `src/components/FilePreviewPanel.tsx`：整合文件树与预览，管理 rootPath 同步

## Goals / Non-Goals

**Goals:**
- 用户可以在 Markdown-only 和全部文件之间切换文件树显示模式
- 右键菜单新增"复制文件名"快捷操作
- 终端 `cd` 后文件树自动检测并刷新，无需手动操作，且不使用轮询

**Non-Goals:**
- 不支持自定义文件类型过滤（如只显示 `.ts` 文件）
- 不改变文件树的懒加载/展开逻辑
- 不引入 file watcher（`fs.watch`）监听文件系统变化
- 不改变 Markdown 预览的渲染逻辑

## Decisions

### 决策 1：全部文件扫描方案

**选择**：新增 `fs:scan-all-files` IPC 通道，复用 `buildTreeFromPaths` 和 `fd`/Node.js 双路径架构。

**理由**：
- 与现有 `fs:scan-md-files` 保持并行，不影响已有逻辑
- `fd` 扫描全部文件时去掉 `-e md` 参数即可（保留 `--type f --no-hidden`）
- Node.js 回退路径去掉 `.endsWith('.md')` 过滤，但仍排除 `.git`、`node_modules` 等常见大目录
- 备选方案：在现有 `fs:scan-md-files` 中增加参数。放弃原因：改变现有 API 签名可能引入兼容问题。

### 决策 2：过滤状态管理

**选择**：在 `FilePreviewPanel` 中管理 `mdOnly` 状态（默认 `true`），通过 props 传递给 `FileTree`。

**理由**：
- 过滤模式影响扫描 API 调用（`scanMdFiles` vs `scanAllFiles`），调用发生在 `FileTree` 组件中
- 状态放在 `FilePreviewPanel` 便于与 rootPath 同步逻辑协调
- `localStorage` 持久化过滤偏好，与现有的侧边栏展开状态持久化模式一致

### 决策 3：切换按钮图标

**选择**：使用 lucide-react 的 `FileText`（Markdown-only 模式）和 `Files`（全部文件模式）图标，放在刷新按钮左侧。

**理由**：
- lucide-react 已是项目依赖，无需引入新图标库
- `FileText` 语义明确暗示"文档/Markdown"，`Files` 暗示"多种文件"
- 通过 `title` 属性提供 tooltip 说明当前模式

### 决策 4：CWD 变化检测机制

**选择**：在主进程 PTY 数据输出回调中，采用节流检测方式——每次 PTY 输出数据时，节流（如 1 秒内最多检测一次）调用 `getSessionLiveCwd` 检查 CWD 是否变化，若变化则向渲染进程推送 `terminal:cwdChanged` 事件。

**理由**：
- PTY 输出回调已存在于 `main.ts:89`（`session.ptyProcess.onData`），在此钩子中附加检测逻辑改动最小
- `lsof` 查询单次耗时约 10-50ms，1 秒节流可接受
- 备选方案 A：在渲染进程中监听 terminal output 事件后自行查询 CWD。放弃原因：每次 output 都触发 IPC 往返查询 CWD 开销更大。
- 备选方案 B：shell 集成（OSC 7 序列）。放弃原因：需要用户配置 shell，不够开箱即用。
- 备选方案 C：定时轮询。放弃原因：spec 明确要求不使用轮询。

### 决策 5：全部文件扫描的排除策略

**选择**：扫描全部文件时，硬编码排除 `node_modules`、`.git`、`dist`、`build`、`out`、`.next` 等常见大目录。使用 `fd` 时通过 `--exclude` 参数实现，Node.js 回退时在递归中跳过。

**理由**：
- 不排除这些目录会导致文件量过大，UI 卡顿
- `fd` 默认已尊重 `.gitignore`，但 `node_modules` 等可能未被 gitignore 的本地目录也需排除
- 后续可考虑读取 `.gitignore` 来动态排除，但当前硬编码足够实用

## Risks / Trade-offs

- **[CWD 检测延迟]** → `lsof` 节流检测存在最多 1 秒延迟。用户 `cd` 后可能看到短暂的旧目录树。缓解：1 秒延迟在交互中几乎不可感知，且用户 `cd` 后通常会等待 shell 返回提示符。
- **[全部文件模式性能]** → 大型工程目录可能包含大量文件。缓解：排除常见大目录 + `fd` 的高性能 + 保留 `--no-hidden` 参数。
- **[lsof 开销]** → 频繁输出的命令（如 `tail -f`）会触发节流上限的 CWD 检测。缓解：节流机制确保最多每秒一次，`lsof` 单次调用成本可控。
- **[CWD 检测不精确]** → `lsof` 获取的是 PTY 子进程的 CWD，如果用户运行的程序自身改变了 CWD，可能误判。缓解：这是极端场景，且与现有手动刷新使用的同一检测机制，行为一致。
