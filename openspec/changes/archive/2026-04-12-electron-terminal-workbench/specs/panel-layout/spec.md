## ADDED Requirements

### Requirement: 主内容区面板容器
应用 SHALL 提供一个主内容区容器，用于承载当前活跃的功能面板。

#### Scenario: 默认显示终端面板
- **WHEN** 应用启动完成
- **THEN** 主内容区 SHALL 默认显示终端面板

#### Scenario: 面板占满可用空间
- **WHEN** 面板被激活显示
- **THEN** 面板 SHALL 占满主内容区的全部可用空间

### Requirement: 面板注册机制
系统 SHALL 提供面板注册接口，允许声明式地注册新的功能面板。

#### Scenario: 注册面板
- **WHEN** 一个新面板模块调用注册接口
- **THEN** 该面板 SHALL 被加入可用面板列表，可通过标识符激活

#### Scenario: 注册信息
- **WHEN** 面板注册时
- **THEN** SHALL 提供面板唯一标识符（id）和面板组件

### Requirement: 面板切换
用户 SHALL 能够在已注册的面板之间进行切换。

#### Scenario: 快捷键切换
- **WHEN** 用户按下面板切换快捷键
- **THEN** 主内容区 SHALL 切换到目标面板

#### Scenario: 切换时保留状态
- **WHEN** 用户从面板 A 切换到面板 B，再切回面板 A
- **THEN** 面板 A SHALL 保留之前的状态（如终端的历史输出和滚动位置）
