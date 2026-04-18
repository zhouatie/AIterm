## MODIFIED Requirements

### Requirement: 搜索功能激活与关闭
系统 SHALL 支持通过快捷键激活和关闭终端搜索功能，并且该快捷键在终端聚焦时不得同时触发文件预览查找。

#### Scenario: 快捷键激活搜索
- **WHEN** 用户在终端聚焦时按下搜索快捷键（Cmd+F）
- **THEN** 终端右上角 SHALL 显示浮层式搜索栏
- **AND** 搜索输入框 SHALL 自动获得焦点
- **AND** 系统 SHALL 不打开文件预览查找框

#### Scenario: 非终端焦点不激活终端搜索
- **WHEN** 用户当前焦点不在终端（xterm.js）内部
- **THEN** 用户按下搜索快捷键（Cmd+F）时，系统 SHALL 不打开终端搜索栏

#### Scenario: 关闭搜索栏
- **WHEN** 用户按下 Escape 键或点击搜索栏关闭按钮
- **THEN** 搜索栏 SHALL 关闭并隐藏
- **AND** 终端中的所有搜索高亮 SHALL 被清除
- **AND** 终端 SHALL 重新获得键盘焦点

#### Scenario: 已有选中文本时激活搜索
- **WHEN** 用户在终端中选中了一段文本后按下 Cmd+F
- **THEN** 搜索栏 SHALL 显示并将选中文本自动填入搜索输入框
- **AND** 系统 SHALL 立即执行该文本的搜索
- **AND** 系统 SHALL 不打开文件预览查找框
