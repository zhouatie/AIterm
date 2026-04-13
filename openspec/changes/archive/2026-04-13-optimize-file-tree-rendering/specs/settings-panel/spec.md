## ADDED Requirements

### Requirement: Spec 目录配置
设置面板 SHALL 提供 spec 目录名配置项，用于控制文件树 spec 模式加载哪些目录。

#### Scenario: 展示默认 spec 目录
- **WHEN** 用户首次打开设置面板且无已保存配置
- **THEN** 系统 SHALL 展示默认 spec 目录名 `openspec` 和 `ravenspec`

#### Scenario: 保存 spec 目录配置
- **WHEN** 用户编辑 spec 目录名列表并点击保存
- **THEN** 系统 SHALL 将规范化后的目录名列表保存到 localStorage

#### Scenario: 扩展 spec 目录配置
- **WHEN** 用户添加新的目录名并保存
- **THEN** 文件树 spec 模式 SHALL 使用更新后的目录名列表过滤根目录
