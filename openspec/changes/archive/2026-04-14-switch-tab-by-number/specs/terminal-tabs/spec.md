## ADDED Requirements

### Requirement: Terminal tab 编号直跳快捷键
terminal 面板 SHALL 支持通过编号快捷键直接跳转到指定位置的二级 terminal tab。

#### Scenario: 按编号跳转到对应 terminal tab
- **WHEN** 用户按下编号跳转快捷键（`Command + 1` 至 `Command + 8`）
- **THEN** 系统 SHALL 以侧边导航从上到下展开后的扁平顺序为序号基准
- **THEN** 系统 SHALL 将对应序号位置（1-based）的二级 terminal tab 设为活跃终端
- **THEN** 若该序号超出当前 tab 总数，系统 SHALL 静默不执行任何操作

#### Scenario: Command + 9 跳转到最后一个 terminal tab
- **WHEN** 用户按下 `Command + 9`
- **THEN** 系统 SHALL 将最后一个二级 terminal tab（无论总数量）设为活跃终端
- **THEN** 若当前只有一个 terminal tab，系统 SHALL 保持该 tab 为活跃状态

#### Scenario: 折叠 workspace 内的 tab 参与编号计数
- **WHEN** 某个 workspace 处于折叠状态
- **THEN** 该 workspace 下的二级 terminal tab SHALL 仍按侧边导航中的视觉顺序参与编号
- **THEN** 按编号快捷键跳转到折叠 workspace 内的 tab 时，系统 SHALL 切换到该终端
- **THEN** 系统 SHALL 不因为快捷键跳转而强制展开该 workspace

#### Scenario: 跳转时保持终端状态
- **WHEN** 用户通过编号快捷键跳转到某个二级 terminal tab
- **THEN** 目标终端 SHALL 获得键盘焦点，后续输入 SHALL 进入该终端
- **THEN** 目标终端 SHALL 保留其输出历史、滚动位置和运行中的进程
