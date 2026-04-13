## ADDED Requirements

### Requirement: Terminal 侧边导航视觉层级
terminal 侧边导航 SHALL 以统一的导航表面呈现 workspace 与二级 terminal tab，并通过更克制的层级样式体现一级容器与二级会话的区别。

#### Scenario: workspace 与 terminal tab 具有清晰层级
- **WHEN** terminal 侧边导航处于展开状态
- **THEN** 一级 workspace 节点 SHALL 通过更稳的字重、图标和表面层级与二级 terminal tab 区分
- **THEN** 二级 terminal tab SHALL 保持更轻的密度与更弱的背景存在感，避免与一级节点争抢视觉重点

#### Scenario: 活跃 terminal tab 使用低对比焦点样式
- **WHEN** 某个二级 terminal tab 对应当前活跃 session
- **THEN** 该节点 SHALL 使用克制的焦点样式突出当前上下文
- **THEN** 系统 SHALL 不依赖高饱和整行选中底色作为唯一激活信号

#### Scenario: 悬停与行内操作不破坏布局稳定性
- **WHEN** 用户悬停 workspace 或二级 terminal tab 节点
- **THEN** 对应节点 SHALL 提供轻量 hover 反馈
- **THEN** 行内操作按钮的出现、隐藏或强调 SHALL 不导致列表文本跳动或节点宽度突变

### Requirement: Terminal 导航状态提示协调
terminal 导航中的激活态、attention 提示与收起 / 展开入口 SHALL 使用协调一致的视觉语言，不得相互争抢用户注意力。

#### Scenario: attention 提示独立于活跃态
- **WHEN** 某个终端存在 attention 提示，且该终端不是当前活跃项
- **THEN** attention 提示 SHALL 以独立但克制的方式可见
- **THEN** 该提示 SHALL 不覆盖或替代活跃 terminal tab 的焦点表达规则

#### Scenario: 收起展开入口与侧边导航风格统一
- **WHEN** terminal 侧边导航处于展开或收起状态
- **THEN** 对应的收起 / 展开入口 SHALL 与导航表面使用一致的描边、背景与 hover 规则
- **THEN** 该入口 SHALL 看起来属于终端工作台界面的一部分，而不是额外悬浮的小部件
