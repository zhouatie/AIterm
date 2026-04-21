## ADDED Requirements

### Requirement: 浏览器上下文快捷键分发
系统 SHALL 在不改变现有用户可配置应用级快捷键绑定的前提下，为浏览器面板提供固定的上下文快捷键优先级。当浏览器面板打开时，浏览器相关冲突快捷键 SHALL 优先由浏览器处理；当浏览器面板关闭时，这些快捷键 SHALL 恢复为现有工作台行为。

#### Scenario: 浏览器打开时冲突快捷键优先由浏览器处理
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+T`、`Cmd+W`、`Cmd+Shift+[`、`Cmd+Shift+]`、`Cmd+1..9`
- **THEN** 系统 SHALL 优先触发浏览器对应动作
- **THEN** 系统 SHALL NOT 同时触发 terminal 或 workspace 的同名快捷键动作

#### Scenario: 浏览器关闭时冲突快捷键恢复为工作台行为
- **WHEN** 浏览器面板处于关闭状态，且用户按下 `Cmd+T`、`Cmd+W`、`Cmd+Shift+[`、`Cmd+Shift+]`、`Cmd+1..9`
- **THEN** 系统 SHALL 按当前应用级快捷键绑定触发既有 terminal / workspace 动作

#### Scenario: 地址栏输入时保留浏览器开关键
- **WHEN** 浏览器面板已打开，且焦点位于地址栏输入框
- **THEN** 用户按下 `Cmd+L`
- **THEN** 系统 SHALL 切换浏览器面板显示状态
- **THEN** 系统 SHALL NOT 将该按键交给地址栏输入处理

#### Scenario: 网页内容获焦时保留浏览器开关键
- **WHEN** 浏览器面板已打开，且焦点位于当前网页 `webview`
- **THEN** 用户按下 `Cmd+L`
- **THEN** 系统 SHALL 切换浏览器面板显示状态

#### Scenario: 浏览器打开时前进后退与刷新由浏览器处理
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+R`、`Cmd+[` 或 `Cmd+]`
- **THEN** 系统 SHALL 将对应按键分发给浏览器当前活跃标签页
- **THEN** 系统 SHALL NOT 将这些按键分发为 terminal 或其他工作台动作
