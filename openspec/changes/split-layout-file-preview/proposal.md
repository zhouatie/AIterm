## Why

当前应用窗口被终端面板完全占满，用户在终端中工作时无法同时浏览项目文件或阅读文档。开发者在日常工作中频繁需要在终端操作和文件/文档查阅之间切换，将文件预览能力直接嵌入工作台可以显著减少上下文切换成本。

## What Changes

- 将现有的单面板全屏布局改为左右分栏布局，左侧为文件预览区，右侧为终端区
- 新增文件树组件，以 VS Code 风格展示目录结构，支持展开/折叠、文件选中
- 新增 Markdown 预览组件，使用成熟开源库（react-markdown + remark/rehype 插件）渲染选中的 Markdown 文件
- 文件树默认只显示 Markdown 文件（`.md`），根目录自动与右侧当前激活终端 Tab 的工作目录对齐
- 新增主进程 IPC 通道，支持读取目录列表和文件内容
- 分栏比例可通过拖拽分隔条调整

## Capabilities

### New Capabilities
- `file-preview`: 文件预览系统，包含文件树浏览、Markdown 渲染和目录同步能力

### Modified Capabilities
- `panel-layout`: 从单面板全屏容器改为左右分栏布局，左栏承载文件预览面板，右栏承载原有面板系统
- `electron-shell`: 新增文件系统相关 IPC 通道（读取目录、读取文件内容），并通过 preload 安全暴露

## Impact

- **布局系统**：`PanelManager` / `PanelContainer` 需要重构为左右分栏结构，右侧保留原有面板切换机制
- **主进程 IPC**：`src/main.ts` 需新增 `fs:readdir` 和 `fs:readfile` handler
- **Preload 脚本**：`src/preload.ts` 需新增 `fileApi` 暴露文件系统操作
- **终端模块**：需要暴露当前激活终端 Tab 的工作目录（cwd），供文件树根目录同步使用
- **新增依赖**：react-markdown、remark-gfm、rehype-highlight 等 Markdown 渲染库
- **样式**：文件树和 Markdown 预览区需要独立的样式，与白色主题保持一致
