## ADDED Requirements

### Requirement: terminal 导航快捷键
terminal 面板 SHALL 支持通过当前配置的快捷键触发导航区域显隐和 workspace 创建动作。

#### Scenario: 快捷键切换 terminal 侧边栏展示状态
- **WHEN** 用户按下“terminal tab 侧边栏展示/收起”快捷键
- **THEN** 系统 SHALL 在 terminal 侧边导航的收起态与展开态之间切换

#### Scenario: 快捷键新增 workspace
- **WHEN** 用户按下“新增 workspace”快捷键
- **THEN** 系统 SHALL 创建一个新的 `workspace_{index}` 及其首个二级终端
- **THEN** 新创建的 workspace SHALL 自动成为当前活跃上下文
