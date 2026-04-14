## MODIFIED Requirements

### Requirement: GUI attention 通知分发
系统 SHALL 在接收到合法 terminal attention 事件后同时触发系统通知和渲染进程状态更新，并支持用户通过点击系统通知直接激活对应的 terminal session。

#### Scenario: 发送系统通知
- **WHEN** 主进程接收到合法 terminal attention 事件
- **THEN** 系统 SHALL 发送 Electron 原生系统通知
- **THEN** 通知内容 SHALL 能表达对应 agent 需要用户回到 GUI 终端处理

#### Scenario: 推送渲染进程事件
- **WHEN** 主进程接收到合法 terminal attention 事件
- **THEN** 系统 SHALL 通过 preload 暴露的 terminal API 向渲染进程推送该事件

#### Scenario: 系统通知失败时保留 UI 状态
- **WHEN** 主进程接收到合法 terminal attention 事件但系统通知无法展示
- **THEN** 系统 SHALL 仍向渲染进程推送该事件

#### Scenario: 点击系统通知唤起应用窗口
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 将应用主窗口恢复至可见状态（若已最小化则先还原）
- **THEN** 系统 SHALL 将应用主窗口置于前台并获得焦点

#### Scenario: 点击系统通知激活对应 terminal session
- **WHEN** 用户点击系统通知
- **THEN** 系统 SHALL 切换到触发该通知的 terminal session tab
- **THEN** 该 terminal session 的 attention 状态 SHALL 被清除
- **THEN** 其他 terminal session 的 attention 状态 SHALL 保持不变

#### Scenario: 点击系统通知时展开 terminal 侧边栏
- **WHEN** 用户点击系统通知，且 terminal 侧边栏处于收起状态
- **THEN** terminal 侧边栏 SHALL 自动展开

#### Scenario: 点击系统通知时 terminal session 已不存在
- **WHEN** 用户点击系统通知，但对应 terminal session 已关闭或不再存在
- **THEN** 系统 SHALL 静默忽略该激活指令
- **THEN** 系统 SHALL NOT 产生报错或异常状态
