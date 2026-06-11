## REMOVED Requirements

### Requirement: Git Diff 面板展示
**Reason**: Git Diff 面板被移除，应用不再提供内置 diff overlay。
**Migration**: 用户可在终端中使用 `git diff`、`git status` 或外部 Git 工具查看改动。

### Requirement: 面板顶部摘要信息
**Reason**: Git Diff 面板被移除，不再展示面板级分支名和变更统计。
**Migration**: 终端 tab 的 git 分支名显示保留；变更统计可通过终端命令或外部 Git 工具查看。

### Requirement: 面板与 BrowserPanel 互斥
**Reason**: Git Diff 面板和 BrowserPanel 均被移除，不再存在二者互斥关系。
**Migration**: 无应用内迁移路径。

### Requirement: Git Diff icon 状态管理
**Reason**: 标题栏 Git Diff icon 被移除，不再需要根据 active terminal 的 git 状态切换 icon 状态。
**Migration**: 终端 tab 的 git 状态探测继续用于分支名显示，不提供 Git Diff 入口。

### Requirement: IPC 数据获取
**Reason**: Git Diff 面板被移除后，renderer 不再需要 `window.gitApi.diff` 或 `window.gitApi.statusSummary`。
**Migration**: 用户通过终端直接运行 git 命令；内部终端 git metadata 通道不受影响。

### Requirement: 主题适配
**Reason**: Git Diff 视图被移除，不再需要 diff 渲染主题适配。
**Migration**: 应用主题系统继续服务终端、文件树和文件预览。
