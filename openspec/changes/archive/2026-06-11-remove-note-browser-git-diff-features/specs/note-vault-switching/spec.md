## REMOVED Requirements

### Requirement: 已保存 Vault 列表
**Reason**: 笔记功能和 Vault 管理入口被移除，应用不再维护已保存 Vault 列表。
**Migration**: 已保存的旧 Vault 配置可保留在 localStorage 中，但不再被 UI 使用。

### Requirement: 当前 Vault 切换
**Reason**: 笔记面板被移除，不再存在当前激活 Vault。
**Migration**: 使用外部笔记工具管理和切换 Vault。
