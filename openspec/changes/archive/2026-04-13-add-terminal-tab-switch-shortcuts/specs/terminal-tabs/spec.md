## ADDED Requirements

### Requirement: Terminal tab 切换快捷键
terminal 面板 SHALL 支持通过当前配置的快捷键在二级 terminal tab 之间循环切换活跃终端。

#### Scenario: 快捷键切换到上一个 terminal tab
- **WHEN** 用户按下“上一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按左侧导航从上到下的二级 terminal tab 顺序选择当前活跃 tab 的上一项
- **THEN** 若当前活跃 tab 已经是第一项，系统 SHALL 循环选择最后一项

#### Scenario: 快捷键切换到下一个 terminal tab
- **WHEN** 用户按下“下一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按左侧导航从上到下的二级 terminal tab 顺序选择当前活跃 tab 的下一项
- **THEN** 若当前活跃 tab 已经是最后一项，系统 SHALL 循环选择第一项

#### Scenario: 单个 terminal tab 时保持当前状态
- **WHEN** terminal 面板中只有一个二级 terminal tab
- **THEN** 用户按下“上一个 terminal tab”或“下一个 terminal tab”快捷键后，系统 SHALL 保持当前活跃 terminal tab 不变

#### Scenario: 切换时保持终端状态
- **WHEN** 用户通过快捷键在多个二级 terminal tab 之间切换
- **THEN** 目标二级 terminal tab SHALL 成为活跃终端
- **THEN** 目标终端 SHALL 获得键盘焦点，后续输入 SHALL 进入该终端
- **THEN** 每个终端 SHALL 保留其输出历史、滚动位置和运行中的进程

#### Scenario: 折叠 workspace 内的 terminal tab 可通过快捷键切换
- **WHEN** 目标二级 terminal tab 所属 workspace 当前处于折叠状态
- **THEN** 用户通过快捷键切换到该 terminal tab 后，目标终端内容 SHALL 显示在终端面板中
- **THEN** 系统 SHALL 不因为快捷键切换而强制展开该 workspace
