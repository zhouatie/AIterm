## ADDED Requirements

### Requirement: 终端首尾快速滚动

系统 SHALL 允许用户在当前激活的 xterm.js 终端普通滚动缓冲区中快速滚动到最上方或最下方。该能力 SHALL 仅改变终端 viewport 的查看位置，不得向 PTY stdin 写入输入，不得改变 PTY 进程状态。

#### Scenario: 滚动到最上方
- **WHEN** 当前激活 terminal session 处于普通 buffer
- **AND** 该 terminal 存在可回看的 scrollback 内容
- **AND** 用户触发“滚动到最上”操作
- **THEN** 当前 terminal viewport SHALL 滚动到 xterm.js 当前保留缓冲区的最上方
- **AND** 系统 SHALL 保持该 terminal session 继续作为当前激活 session

#### Scenario: 滚动到最下方
- **WHEN** 当前激活 terminal session 处于普通 buffer
- **AND** 当前 terminal viewport 不在最下方
- **AND** 用户触发“滚动到最下”操作
- **THEN** 当前 terminal viewport SHALL 滚动到 xterm.js 当前缓冲区的最下方
- **AND** 后续 PTY 输出 SHALL 按 xterm.js 默认行为继续显示在底部

#### Scenario: 显示首尾滚动控件
- **WHEN** 当前激活 terminal session 处于普通 buffer
- **AND** 该 terminal 存在可回看的 scrollback 内容
- **THEN** terminal 内容区 SHALL 提供滚动到最上与滚动到最下的显性控件
- **AND** 控件 SHALL 使用图标或其他紧凑视觉形式，避免遮挡主要终端内容
- **AND** 控件 SHALL 通过 tooltip 或等效 hover 信息说明其功能与快捷键

#### Scenario: 禁用无意义的滚动目标
- **WHEN** 当前激活 terminal session 已位于缓冲区最上方
- **THEN** “滚动到最上”控件 SHALL 展示为不可用或不触发滚动
- **WHEN** 当前激活 terminal session 已位于缓冲区最下方
- **THEN** “滚动到最下”控件 SHALL 展示为不可用或不触发滚动

#### Scenario: 无 scrollback 时隐藏首尾滚动控件
- **WHEN** 当前激活 terminal session 没有可回看的 scrollback 内容
- **THEN** terminal 内容区 SHALL 不展示首尾滚动控件

#### Scenario: 通过 terminal-local 快捷键触发
- **WHEN** 用户焦点位于 terminal 内部
- **AND** 当前激活 terminal session 处于普通 buffer
- **AND** 用户按下滚动到最上或滚动到最下的 terminal-local 快捷键
- **THEN** 系统 SHALL 对当前激活 terminal session 执行对应首尾滚动
- **AND** 该快捷键 SHALL NOT 作为字符输入发送到 PTY stdin
- **AND** 滚动完成后 terminal SHALL 保持可继续输入的焦点状态

#### Scenario: alternate screen 中不干扰 TUI
- **WHEN** 当前激活 terminal session 处于 alternate screen
- **THEN** terminal 内容区 SHALL 不展示首尾滚动控件
- **AND** terminal-local 首尾滚动快捷键 SHALL NOT 触发应用级首尾滚动
- **AND** 系统 SHALL 避免阻断全屏 TUI 自身可处理的按键语义

#### Scenario: 多 terminal session 独立滚动
- **WHEN** 同一面板中存在多个 terminal session
- **AND** 用户在当前激活 session 中触发首尾滚动
- **THEN** 系统 SHALL 只滚动当前激活 session 的 terminal viewport
- **AND** 其他 session 的 terminal viewport 与 scrollback 状态 SHALL 保持不变
