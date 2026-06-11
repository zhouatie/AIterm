## REMOVED Requirements

### Requirement: 默认笔记存储目录
**Reason**: 笔记功能被移除，应用不再创建或使用默认 notes Vault。
**Migration**: 已存在的本地笔记目录保留在磁盘上，但应用不再自动读取或创建该目录。

### Requirement: 自定义笔记存储目录
**Reason**: Vault 管理入口被移除，应用不再保存或切换自定义笔记 Vault。
**Migration**: 已保存的旧 Vault localStorage 数据可保留在本地，但不再被 UI 使用。

### Requirement: 获取 userData 路径
**Reason**: 默认 notes Vault 逻辑被移除，笔记模块不再需要读取 Electron userData 路径来拼接默认目录。
**Migration**: 无应用内迁移路径。
