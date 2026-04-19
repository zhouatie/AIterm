## MODIFIED Requirements

### Requirement: 默认笔记存储目录
系统 SHALL 提供默认的笔记 Vault，位于 Electron userData 路径下的 `notes` 子目录，并在没有任何已保存 Vault 时作为初始激活项。

#### Scenario: 使用默认 Vault
- **WHEN** 用户未保存任何自定义 Vault
- **THEN** 系统 SHALL 使用 `{userData}/notes/` 作为默认 Vault 根目录
- **THEN** 该默认 Vault SHALL 成为当前激活 Vault

#### Scenario: 默认 Vault 目录不存在时自动创建
- **WHEN** 系统需要使用默认 Vault 且对应目录不存在
- **THEN** 系统 SHALL 自动创建该目录（含必要的父目录）

### Requirement: 自定义笔记存储目录
系统 SHALL 允许用户保存多个自定义 Vault 根目录，而不是只维护一个笔记目录路径。

#### Scenario: 保存自定义 Vault
- **WHEN** 用户在设置面板中输入一个自定义 Vault 根路径并保存
- **THEN** 系统 SHALL 将该路径持久化为一个新的 Vault 条目
- **THEN** 该路径对应的目录若不存在，系统 SHALL 自动创建该目录（含必要的父目录）

#### Scenario: 防止重复保存同一路径
- **WHEN** 用户尝试保存一个已存在于 Vault 列表中的根路径
- **THEN** 系统 SHALL 阻止重复保存

#### Scenario: 从旧单目录配置迁移
- **WHEN** 系统读取到旧的单笔记目录配置但尚未建立 Vault 列表
- **THEN** 系统 SHALL 将该目录迁移为一个 Vault 条目
- **THEN** 该迁移后的 Vault SHALL 成为当前激活 Vault
