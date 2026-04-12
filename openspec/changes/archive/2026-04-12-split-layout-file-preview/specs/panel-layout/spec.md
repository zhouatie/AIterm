## MODIFIED Requirements

### Requirement: 主内容区面板容器
应用 SHALL 提供一个左右分栏布局，左栏为文件预览面板，右栏为面板容器（承载终端等功能面板）。

#### Scenario: 默认显示终端面板
- **WHEN** 应用启动完成
- **THEN** 右栏面板容器 SHALL 默认显示终端面板，左栏 SHALL 显示文件预览面板

#### Scenario: 面板占满右栏可用空间
- **WHEN** 面板被激活显示
- **THEN** 面板 SHALL 占满右栏面板容器的全部可用空间

#### Scenario: 左右分栏比例可调
- **WHEN** 用户拖拽左右栏之间的分隔条
- **THEN** 左右栏宽度比例 SHALL 随之调整，并有最小宽度约束防止面板被完全折叠

#### Scenario: 分栏默认比例
- **WHEN** 应用首次启动
- **THEN** 左栏 SHALL 占据约 30% 宽度，右栏占据约 70% 宽度
