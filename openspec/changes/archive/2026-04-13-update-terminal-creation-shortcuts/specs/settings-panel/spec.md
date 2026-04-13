## MODIFIED Requirements

### Requirement: 设置面板提供快捷键配置区
设置面板 SHALL 提供本次支持的快捷键配置区，用于展示和编辑可配置动作的当前绑定值。

#### Scenario: 展示可配置动作
- **WHEN** 用户打开设置面板
- **THEN** 系统 SHALL 展示文件树展示/收起、terminal tab 侧边栏展示/收起、新增 workspace、当前激活 workspace 下新增 terminal tab、重命名当前 workspace、重命名当前二级 terminal tab、关闭当前二级 terminal tab、关闭当前 workspace、上一个 terminal tab、下一个 terminal tab这 10 个动作的快捷键配置项

#### Scenario: 展示当前生效值
- **WHEN** 设置面板渲染快捷键配置项
- **THEN** 每个配置项 SHALL 显示当前生效的快捷键值

#### Scenario: 提供保存入口
- **WHEN** 用户在设置面板中修改了任一快捷键配置
- **THEN** 系统 SHALL 提供明确的保存操作以提交本次修改
