## ADDED Requirements

### Requirement: 侧边栏切换控件布局
系统 SHALL 在不遮挡 terminal 内容区的前提下展示 terminal 侧边 tab 栏的收起 / 展开控件。

#### Scenario: 展开态将控件放入 tab 面板内侧
- **WHEN** terminal 侧边 tab 栏处于展开状态
- **THEN** 收起控件 SHALL 显示在 terminal tab 面板自身的可视边界内
- **THEN** 该控件 SHALL 不悬浮在 terminal 内容区之上

#### Scenario: 收起态保留稳定的展开入口
- **WHEN** terminal 侧边 tab 栏处于收起状态
- **THEN** 系统 SHALL 保留一个稳定可点击的展开入口
- **THEN** 该入口 SHALL 不遮挡 terminal 内容区的主要可视区域

#### Scenario: 切换控件不额外压缩终端内容
- **WHEN** 用户在 terminal 中查看普通输出或运行 TUI 应用时切换侧边 tab 栏
- **THEN** terminal 可见区域 SHALL 只受侧边栏本身宽度变化影响
- **THEN** 系统 SHALL 不因为切换控件的悬浮定位而额外覆盖终端内容
