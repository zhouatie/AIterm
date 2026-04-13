## ADDED Requirements

### Requirement: 默认快捷键定义
系统 SHALL 为首批支持的应用动作提供默认快捷键绑定。

#### Scenario: 首次加载默认绑定
- **WHEN** 用户首次打开应用，且本地尚无快捷键配置
- **THEN** 文件树展示/收起 SHALL 默认绑定为 `Command + S`
- **THEN** terminal tab 侧边栏展示/收起 SHALL 默认绑定为 `Command + B`
- **THEN** 新增 workspace SHALL 默认绑定为 `Command + T`

### Requirement: 快捷键配置持久化
系统 SHALL 支持保存用户自定义快捷键，并在后续启动时恢复。

#### Scenario: 保存自定义绑定
- **WHEN** 用户在设置面板中修改快捷键并执行保存
- **THEN** 系统 SHALL 持久化保存新的快捷键绑定

#### Scenario: 重新启动后恢复自定义绑定
- **WHEN** 用户已经保存过自定义快捷键后重新启动应用
- **THEN** 系统 SHALL 加载并使用上一次保存的快捷键绑定，而不是回退到默认值

### Requirement: 快捷键配置校验
系统 SHALL 阻止无效或冲突的快捷键配置被保存。

#### Scenario: 阻止重复绑定
- **WHEN** 用户尝试将两个动作保存为同一个快捷键组合
- **THEN** 系统 SHALL 阻止保存，并提示存在冲突

#### Scenario: 阻止空绑定
- **WHEN** 用户尝试保存空快捷键值
- **THEN** 系统 SHALL 阻止保存，并提示该动作必须保留快捷键绑定
