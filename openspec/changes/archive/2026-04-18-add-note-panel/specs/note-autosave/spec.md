## ADDED Requirements

### Requirement: Debounce 自动保存
系统 SHALL 在用户停止打字后自动保存笔记内容，避免每次击键都触发磁盘写入。

#### Scenario: 停止打字后保存
- **WHEN** 用户在编辑器中修改内容后停止打字超过 2 秒
- **THEN** 系统 SHALL 将当前编辑器内容写入对应的 .md 文件

#### Scenario: 连续打字不触发保存
- **WHEN** 用户持续打字（两次击键间隔小于 2 秒）
- **THEN** 系统 SHALL 不触发保存，仅重置 debounce 计时器

### Requirement: 事件触发即时保存
系统 SHALL 在特定事件发生时立即 flush 未保存的内容，不等待 debounce 计时器。

#### Scenario: 切换笔记 Tab 时保存
- **WHEN** 用户切换到另一个笔记 Tab
- **THEN** 系统 SHALL 立即保存切换前 Tab 对应笔记的未保存内容

#### Scenario: 关闭笔记面板时保存
- **WHEN** 用户关闭笔记面板（点击关闭按钮或快捷键）
- **THEN** 系统 SHALL 立即保存所有已打开且有未保存修改的笔记

#### Scenario: 窗口失焦时保存
- **WHEN** 应用窗口失去焦点（用户切换到其他应用）
- **THEN** 系统 SHALL 立即保存所有有未保存修改的笔记

#### Scenario: 应用退出时保存
- **WHEN** 应用即将退出（beforeunload 事件）
- **THEN** 系统 SHALL 同步保存所有有未保存修改的笔记

### Requirement: 兜底定时保存
系统 SHALL 提供兜底定时器，防止极端情况下内容丢失。

#### Scenario: 定时器触发保存
- **WHEN** 距离上次保存已超过 2 分钟，且当前存在未保存修改
- **THEN** 系统 SHALL 自动保存未保存的内容

### Requirement: 脏检查避免无意义写入
系统 SHALL 在每次保存前检查内容是否实际变更，避免重复写磁盘。

#### Scenario: 内容未变更时跳过保存
- **WHEN** 任何保存触发点被触发，但当前编辑器内容与上次成功保存的内容完全相同
- **THEN** 系统 SHALL 跳过本次写入操作

#### Scenario: 并发写入保护
- **WHEN** 多个保存触发点同时触发（如 debounce 到期与窗口失焦同时发生）
- **THEN** 系统 SHALL 保证写入操作串行执行，不发生并发写入同一文件
