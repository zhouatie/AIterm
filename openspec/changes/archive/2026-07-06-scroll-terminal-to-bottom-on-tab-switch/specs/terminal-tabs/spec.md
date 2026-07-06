## MODIFIED Requirements

### Requirement: Tab 切换
用户 SHALL 能够通过二级终端节点切换终端会话，并通过一级 workspace 管理节点展开状态。切换到某个二级终端会话后，该会话的右侧 terminal viewport SHALL 默认滚动到 xterm.js 普通 buffer 底部，以展示最新输出。

#### Scenario: 点击二级终端节点切换会话
- **WHEN** 用户点击一个非活跃的二级终端节点
- **THEN** 该节点对应的终端会话 SHALL 成为活跃终端
- **AND** 对应终端内容 SHALL 显示在终端面板中
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 快捷键切换会话后滚动到底部
- **WHEN** 用户通过上一/下一 terminal tab 快捷键或编号快捷键切换到另一个二级终端
- **THEN** 目标终端会话 SHALL 成为活跃终端
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 外部入口激活会话后滚动到底部
- **WHEN** 用户通过 Agent Inbox、系统通知或 Spec Dashboard 激活某个 terminal session
- **THEN** 目标终端会话 SHALL 成为活跃终端
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 切换时保留终端状态但不保留历史 viewport
- **WHEN** 用户在多个二级终端之间来回切换
- **THEN** 每个终端 SHALL 完整保留其输出历史和运行中的进程
- **AND** 系统 SHALL NOT 因切换向 PTY stdin 写入任何内容
- **AND** 重新激活的终端 SHALL 不保留切换前的历史 viewport 位置，而是显示普通 buffer 底部

#### Scenario: 当前活跃终端内手动回看仍可用
- **WHEN** 用户在当前活跃 terminal 中手动滚动回看历史输出
- **AND** 用户未切换到其他 terminal session
- **THEN** 系统 SHALL 保留用户当前查看的 viewport
- **AND** 用户 SHALL 仍可使用滚动到最上、滚动到最下控件或鼠标滚轮进行回看

#### Scenario: 点击一级 workspace 节点切换展开状态
- **WHEN** 用户点击某个一级 workspace 节点
- **THEN** 系统 SHALL 切换该 workspace 的展开 / 收起状态
- **AND** 此操作 SHALL 不直接切换当前活跃终端会话
- **AND** 此操作 SHALL NOT 改变当前活跃终端 viewport 位置

#### Scenario: 切换到隐藏后再显示的终端
- **WHEN** 用户切换到一个之前处于隐藏状态的二级终端
- **THEN** 该终端 SHALL 自动重新适配当前面板尺寸
- **AND** 该终端 SHALL 在尺寸适配与待消费输出写入完成后滚动到普通 buffer 底部
