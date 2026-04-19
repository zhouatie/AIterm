# Capability: note-vault-switching

## Purpose
管理已保存 Vault 列表与当前激活 Vault，让笔记模块和设置面板能够围绕同一份 Vault 状态工作。

## Requirements
### Requirement: 已保存 Vault 列表
系统 SHALL 维护一份可持久化的已保存 Vault 列表，供笔记模块和设置面板共享使用。

#### Scenario: 首次启动时建立默认 Vault
- **WHEN** 用户此前从未保存过任何 Vault
- **THEN** 系统 SHALL 以 `{userData}/notes` 创建并保存一个默认 Vault
- **THEN** 该默认 Vault SHALL 成为当前激活 Vault

#### Scenario: 新增一个 Vault
- **WHEN** 用户提供一个新的 Vault 根路径并保存
- **THEN** 系统 SHALL 将该路径追加到已保存 Vault 列表
- **THEN** 每个 Vault 条目 SHALL 持有稳定标识、显示名称和根路径
- **THEN** 若该根路径已存在于列表中，系统 SHALL 阻止重复保存

### Requirement: 当前 Vault 切换
系统 SHALL 支持在应用内切换当前激活 Vault，并让笔记面板立即切换到该 Vault 的内容上下文。

#### Scenario: 从顶部切换器切换当前 Vault
- **WHEN** 用户在笔记面板顶部选择另一个 Vault
- **THEN** 系统 SHALL 将该 Vault 设为当前激活 Vault
- **THEN** 左侧文件树 SHALL 重新加载该 Vault 根目录下的内容
- **THEN** 编辑区 SHALL 恢复该 Vault 上次的当前文档，或在无可恢复文档时显示空状态

#### Scenario: 重新打开面板时恢复当前 Vault
- **WHEN** 用户关闭后再次打开笔记面板
- **THEN** 系统 SHALL 恢复上次激活的 Vault
- **THEN** 若该 Vault 已不可用，系统 SHALL 回退到任一可用 Vault；若不存在任何已保存 Vault，则 SHALL 回退到默认 Vault
