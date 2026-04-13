## MODIFIED Requirements

### Requirement: 快捷键配置校验
系统 SHALL 阻止无效或冲突的快捷键配置被保存。快捷键触发判断 SHALL 能正确区分真实用户可编辑输入元素（`<input>`、`<select>`、`contentEditable` 元素及非终端 `<textarea>`）与 xterm.js 内部键盘捕获元素，在终端获焦时不得屏蔽全局面板快捷键的触发。

#### Scenario: 阻止重复绑定
- **WHEN** 用户尝试将两个动作保存为同一个快捷键组合
- **THEN** 系统 SHALL 阻止保存，并提示存在冲突

#### Scenario: 阻止空绑定
- **WHEN** 用户尝试保存空快捷键值
- **THEN** 系统 SHALL 阻止保存，并提示该动作必须保留快捷键绑定

#### Scenario: 终端获焦时面板快捷键不被屏蔽
- **WHEN** 用户点击终端面板，终端（xterm.js）获得焦点
- **THEN** 用户按下面板收起/展开快捷键（如 `Command + B`、`Command + S`）
- **THEN** 系统 SHALL 正常触发对应面板的展开或收起操作，不得静默丢弃该快捷键事件

#### Scenario: 工作区重命名输入框中不触发面板快捷键
- **WHEN** 用户正在工作区重命名输入框中输入内容
- **THEN** 按下任意快捷键组合
- **THEN** 系统 SHALL 不触发全局面板快捷键，避免干扰用户输入
