## MODIFIED Requirements

### Requirement: 笔记目录配置
设置面板 SHALL 将原有的单笔记目录输入框升级为 Vault 管理入口，允许用户维护多个 Vault 并指定当前激活项。

#### Scenario: 展示 Vault 管理区
- **WHEN** 用户打开设置面板
- **THEN** 系统 SHALL 展示已保存 Vault 列表
- **THEN** 每个 Vault 项 SHALL 展示显示名称与根路径
- **THEN** 系统 SHALL 明确标记当前激活 Vault

#### Scenario: 新增 Vault
- **WHEN** 用户输入一个新的 Vault 根路径并点击保存
- **THEN** 系统 SHALL 校验该路径为绝对路径且可访问
- **THEN** 校验通过后，系统 SHALL 将其加入 Vault 列表

#### Scenario: 切换当前激活 Vault
- **WHEN** 用户在设置面板中将某个已保存 Vault 设为当前激活项并保存
- **THEN** 系统 SHALL 持久化新的当前激活 Vault
- **THEN** 笔记面板 SHALL 使用该 Vault 重新加载笔记树
