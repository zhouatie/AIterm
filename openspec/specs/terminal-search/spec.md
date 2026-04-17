# Capability: terminal-search

## Purpose
终端内容搜索能力，提供终端缓冲区内的文本搜索、高亮匹配、正则支持与匹配项间导航功能。

## Requirements

### Requirement: 搜索功能激活与关闭
系统 SHALL 支持通过快捷键激活和关闭终端搜索功能。

#### Scenario: 快捷键激活搜索
- **WHEN** 用户在终端聚焦时按下搜索快捷键（Cmd+F）
- **THEN** 终端右上角 SHALL 显示浮层式搜索栏
- **AND** 搜索输入框 SHALL 自动获得焦点

#### Scenario: 关闭搜索栏
- **WHEN** 用户按下 Escape 键或点击搜索栏关闭按钮
- **THEN** 搜索栏 SHALL 关闭并隐藏
- **AND** 终端中的所有搜索高亮 SHALL 被清除
- **AND** 终端 SHALL 重新获得键盘焦点

#### Scenario: 已有选中文本时激活搜索
- **WHEN** 用户在终端中选中了一段文本后按下 Cmd+F
- **THEN** 搜索栏 SHALL 显示并将选中文本自动填入搜索输入框
- **AND** 系统 SHALL 立即执行该文本的搜索

### Requirement: 文本搜索与高亮
系统 SHALL 在终端回滚缓冲区中搜索匹配文本，并高亮显示所有匹配项。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在搜索输入框中输入文本
- **THEN** 系统 SHALL 在终端缓冲区（包括回滚历史）中搜索所有匹配项
- **AND** 所有匹配项 SHALL 以可区分的背景色高亮显示
- **AND** 当前焦点匹配项 SHALL 使用与其他匹配项不同的高亮色

#### Scenario: 显示匹配计数
- **WHEN** 搜索完成后存在匹配结果
- **THEN** 搜索栏 SHALL 显示当前焦点索引与总匹配数（如 "3/17"）

#### Scenario: 无匹配结果
- **WHEN** 搜索文本在终端缓冲区中无匹配
- **THEN** 搜索栏 SHALL 显示 "0/0" 或等效的无结果提示
- **AND** 搜索输入框 SHALL 以视觉方式（如红色边框）提示无结果

### Requirement: 搜索匹配项间导航
用户 SHALL 能在匹配项之间向前和向后导航。

#### Scenario: 导航到下一个匹配项
- **WHEN** 用户点击搜索栏的"下一个"按钮或按下 Enter/Cmd+G
- **THEN** 焦点 SHALL 移动到下一个匹配项
- **AND** 终端视口 SHALL 滚动以使该匹配项可见

#### Scenario: 导航到上一个匹配项
- **WHEN** 用户点击搜索栏的"上一个"按钮或按下 Shift+Enter/Cmd+Shift+G
- **THEN** 焦点 SHALL 移动到上一个匹配项
- **AND** 终端视口 SHALL 滚动以使该匹配项可见

#### Scenario: 循环导航
- **WHEN** 当前焦点在最后一个匹配项且用户导航到下一个
- **THEN** 焦点 SHALL 循环回到第一个匹配项

### Requirement: 正则表达式搜索
系统 SHALL 支持使用正则表达式进行终端内容搜索。

#### Scenario: 启用正则模式
- **WHEN** 用户点击搜索栏中的正则表达式切换按钮（.*）
- **THEN** 搜索输入 SHALL 被解释为正则表达式
- **AND** 匹配结果 SHALL 根据正则模式更新

#### Scenario: 大小写敏感切换
- **WHEN** 用户点击搜索栏中的大小写敏感切换按钮（Aa）
- **THEN** 搜索 SHALL 在大小写敏感和不敏感模式之间切换
- **AND** 匹配结果 SHALL 立即更新

#### Scenario: 无效正则表达式
- **WHEN** 用户输入了语法无效的正则表达式
- **THEN** 系统 SHALL 不执行搜索
- **AND** 搜索输入框 SHALL 以视觉方式提示正则语法错误
