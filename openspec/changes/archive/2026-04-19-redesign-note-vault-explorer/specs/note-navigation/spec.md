## MODIFIED Requirements

### Requirement: 工作台上下文恢复
系统 SHALL 在笔记工作台重新打开时恢复当前激活 Vault 及其上次的主要上下文，减少在多个 Vault 之间反复定位的成本。

#### Scenario: 恢复当前 Vault 的上次工作上下文
- **WHEN** 用户关闭后再次打开笔记工作台
- **THEN** 系统 SHALL 恢复上次激活的 Vault
- **THEN** 若该 Vault 上次记录的文件夹与笔记仍存在，系统 SHALL 恢复对应的当前文件夹与当前文档

#### Scenario: 切回某个 Vault 时恢复该 Vault 自己的上下文
- **WHEN** 用户从 Vault 切换器切换回一个此前使用过的 Vault
- **THEN** 系统 SHALL 恢复该 Vault 自己上次的当前文件夹与当前文档
- **THEN** 系统 SHALL 不得复用其他 Vault 的文件夹或文档路径

#### Scenario: 上下文已失效时降级恢复
- **WHEN** 当前 Vault 上次记录的文件夹或笔记已不存在
- **THEN** 系统 SHALL 回退到该 Vault 根目录或空文档状态
- **THEN** 工作台 SHALL 保持可用，不因失效记录报错或卡死

## REMOVED Requirements

### Requirement: 工作台视图切换
**Reason**: 笔记导航已从 `最近` / `收藏` / `全部` 多模式切换收敛为“当前 Vault 的单一文件树”。
**Migration**: 用户通过顶部 Vault 切换器切换当前仓库，通过同一棵文件树与搜索框定位目标笔记。

### Requirement: 收藏笔记
**Reason**: 本轮范围不再保留 `收藏` 作为笔记导航模式，避免与 Vault Explorer 的单树心智冲突。
**Migration**: 用户在当前 Vault 内通过目录组织和搜索定位笔记，不再依赖收藏列表入口。

### Requirement: 最近访问记录
**Reason**: `最近` 视图与单一 Vault 文件树目标冲突，本轮移除最近访问驱动的导航模式。
**Migration**: 用户重新打开面板时恢复当前 Vault 的上次上下文，而不是进入独立的最近列表。
