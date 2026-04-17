# Capability: terminal-decorations

## Purpose
终端行级装饰系统，利用 xterm.js Decoration API 在终端缓冲区的特定行上附加可视化标记，支持命令边界、AI 区域高亮和错误行指示。

## ADDED Requirements

### Requirement: 命令边界装饰
系统 SHALL 在每条命令的起始行显示视觉分隔标记，帮助用户识别命令边界。

#### Scenario: 检测命令起始行（OSC 133 支持）
- **WHEN** shell 发送 OSC 133 序列标记命令提示符位置
- **THEN** 系统 SHALL 在该行注册一个 Decoration
- **AND** Decoration SHALL 在行左侧显示一个细竖线或圆点作为命令起始标记

#### Scenario: 启发式命令边界检测
- **WHEN** shell 不支持 OSC 133 序列
- **THEN** 系统 SHALL 回退到基于 prompt 模式匹配的启发式检测
- **AND** 检测到的命令起始行 SHALL 以相同的 Decoration 标记

#### Scenario: 装饰随滚动同步
- **WHEN** 用户在终端中滚动
- **THEN** 命令边界装饰 SHALL 跟随对应行一同滚动
- **AND** 超出缓冲区的装饰 SHALL 被自动清理

### Requirement: AI Agent 区域装饰
系统 SHALL 能够标记 AI Agent 输出的起止区域，使其与普通命令输出在视觉上区分。

#### Scenario: 标记 AI 输出区域
- **WHEN** 系统检测到 AI Agent 的输出区域（通过 attention 事件或 OSC 标记）
- **THEN** 该区域的行 SHALL 以背景色变化的方式高亮
- **AND** 区域起始行 SHALL 显示一个标识 AI 来源的 Decoration 元素

#### Scenario: AI 区域跨越多行
- **WHEN** AI Agent 的输出跨越多行
- **THEN** 整个区域 SHALL 保持连续的背景高亮
- **AND** 背景色 SHALL 与当前主题协调（深色/浅色模式下均清晰可辨）

### Requirement: 错误行装饰
系统 SHALL 在包含错误模式的输出行旁边显示错误指示标记。

#### Scenario: 检测错误模式
- **WHEN** 终端输出行匹配常见错误模式（如 `Error:`、`ERROR`、`failed`、`FATAL`）
- **THEN** 系统 SHALL 在该行左侧放置红色指示点 Decoration

#### Scenario: 错误装饰不干扰正常交互
- **WHEN** 终端行上存在错误装饰
- **THEN** 装饰 SHALL 不阻止该行的文本选择和复制
- **AND** 装饰 SHALL 不影响终端的正常输入输出

### Requirement: 装饰生命周期管理
系统 SHALL 正确管理装饰的创建和清理，避免内存泄漏。

#### Scenario: 终端会话销毁时清理装饰
- **WHEN** 终端实例被销毁
- **THEN** 所有关联的 Decoration SHALL 被释放

#### Scenario: 缓冲区行被回收时清理装饰
- **WHEN** 终端回滚缓冲区达到上限，旧行被回收
- **THEN** 附着在被回收行上的 Decoration SHALL 被自动清理
