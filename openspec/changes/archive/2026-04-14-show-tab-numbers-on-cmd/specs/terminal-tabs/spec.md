## ADDED Requirements

### Requirement: 按住 Command 时显示 tab 跳转序号
按住 `Command` 键期间，terminal 侧边导航 SHALL 在每个二级 terminal tab 节点前临时显示其对应的跳转序号，以辅助用户定位目标 tab 后使用编号快捷键直跳。

#### Scenario: 按住 Command 时序号出现
- **WHEN** 用户按下并持续按住 `Command` 键
- **THEN** 侧边导航中每个二级 terminal tab 节点前 SHALL 显示其跳转序号
- **THEN** 序号 SHALL 与 `select-terminal-tab-1…9` 快捷键的目标位置完全对应：第 1–8 个 tab 显示 `1`–`8`，最后一个 tab 显示 `9`
- **THEN** 超出前 8 个且不是最后一个的 tab SHALL 不显示序号
- **THEN** 序号 SHALL 使用克制的视觉样式（muted 色、等宽字体），不遮挡或替代 tab 名称

#### Scenario: 松开 Command 时序号消失
- **WHEN** 用户松开 `Command` 键
- **THEN** 所有 tab 序号 SHALL 立即消失，侧边栏恢复默认视图

#### Scenario: 窗口失焦时序号自动隐藏
- **WHEN** 应用窗口失去焦点（如用户通过 `Cmd+Tab` 切换到其他应用）
- **THEN** 系统 SHALL 重置按键状态，侧边栏序号 SHALL 消失
- **THEN** 用户返回应用后，侧边栏 SHALL 处于无序号的默认视图

#### Scenario: 序号区域固定宽度不引起布局抖动
- **WHEN** 序号在显示与隐藏之间切换
- **THEN** tab 名称文字的横向位置 SHALL 保持稳定，不因序号出现或消失而发生偏移

#### Scenario: 侧边栏收起时不受影响
- **WHEN** terminal 侧边栏处于收起状态，用户按住 `Command` 键
- **THEN** 系统 SHALL 不做任何特殊处理（侧边栏不可见，序号无从显示）
- **THEN** `Command` 键的其他快捷键功能 SHALL 正常工作
