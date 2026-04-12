## Why

文件树当前仅支持显示 Markdown 文件，无法浏览工程中的其他文件类型，限制了作为工作台的实用性。右键菜单缺少"复制文件名"这一高频操作。此外，当用户在终端中 `cd` 到新目录后，左侧文件树不会自动更新，需要手动点击刷新，体验不流畅。

## What Changes

- **文件类型过滤切换**：在文件树刷新按钮旁新增一个切换图标，控制是否只显示 Markdown 文件。开启时只显示 `.md` 文件（当前默认行为），关闭时显示工程目录下的所有文件。默认为只显示 Markdown。
- **右键菜单"复制文件名"**：在文件树节点的右键上下文菜单中新增"复制文件名"选项，将节点的文件名（不含路径）复制到剪贴板。
- **终端 CWD 变化自动刷新文件树**：当右侧终端面板中执行 `cd` 等命令导致工作目录变化时，左侧文件树自动检测并更新根目录。不使用轮询，而是通过 PTY 输出钩子检测 shell 提示符变化后主动查询 CWD。

## Capabilities

### New Capabilities

无新增独立能力。

### Modified Capabilities

- `file-preview`：新增文件类型过滤切换需求（Markdown-only / 全部文件）；右键菜单新增"复制文件名"选项；文件树根目录在终端 CWD 变化时自动同步更新。
- `embedded-terminal`：终端需要提供 CWD 变化通知机制，当 PTY 的工作目录发生变化时通知渲染进程。

## Impact

- **主进程（main.ts）**：需要新增"扫描全部文件"的 IPC 通道（或在现有 `fs:scan-md-files` 中增加参数），支持返回非 Markdown 文件；需要在 PTY 输出时检测 CWD 变化并推送事件。
- **PTY Manager（pty-manager.ts）**：需要增加 CWD 变化检测逻辑，在 PTY 数据输出时定期检查 `lsof`/`/proc` 获取实际 CWD。
- **Preload（preload.ts）**：需要暴露新的 API（扫描全部文件、监听 CWD 变化事件）。
- **FileTree 组件**：工具栏新增切换按钮，根据过滤状态调用不同的扫描 API；右键菜单新增菜单项。
- **FilePreviewPanel 组件**：监听终端 CWD 变化事件以自动更新根目录。
- **类型声明（global.d.ts）**：新增 API 类型定义。
