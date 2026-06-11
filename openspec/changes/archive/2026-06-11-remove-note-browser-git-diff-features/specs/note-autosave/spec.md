## REMOVED Requirements

### Requirement: Debounce 自动保存
**Reason**: 笔记编辑器被移除，不再存在笔记内容自动保存。
**Migration**: 使用外部编辑器的保存机制。

### Requirement: 自动保存状态反馈
**Reason**: 笔记编辑器和保存状态 UI 被移除。
**Migration**: 无应用内迁移路径。

### Requirement: 事件触发即时保存
**Reason**: 笔记面板被移除，不再需要在切换笔记、关闭面板、窗口失焦或退出时保存笔记内容。
**Migration**: 使用外部编辑器保存文件。

### Requirement: 兜底定时保存
**Reason**: 笔记自动保存系统被移除。
**Migration**: 无应用内迁移路径。

### Requirement: 脏检查避免无意义写入
**Reason**: 笔记自动保存系统被移除，不再需要笔记保存脏检查或并发写入保护。
**Migration**: 无应用内迁移路径。
