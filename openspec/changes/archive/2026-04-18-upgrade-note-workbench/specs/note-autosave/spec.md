## ADDED Requirements

### Requirement: 自动保存状态反馈
系统 SHALL 为当前文档提供可见的自动保存状态反馈，帮助用户确认编辑结果是否已落盘。

#### Scenario: 编辑后显示编辑中
- **WHEN** 用户修改当前文档且尚未触发保存完成
- **THEN** 系统 SHALL 展示 `编辑中` 状态

#### Scenario: 保存过程中显示保存中
- **WHEN** 系统正在写入当前文档内容
- **THEN** 系统 SHALL 展示 `保存中` 状态

#### Scenario: 保存完成后显示已保存
- **WHEN** 当前文档最近一次保存成功且不存在未保存修改
- **THEN** 系统 SHALL 展示 `已保存` 状态

## MODIFIED Requirements

### Requirement: 事件触发即时保存
系统 SHALL 在特定事件发生时立即 flush 未保存的内容，不等待 debounce 计时器。

#### Scenario: 切换当前笔记时保存
- **WHEN** 用户从当前文档切换到另一个笔记
- **THEN** 系统 SHALL 立即保存切换前文档的未保存内容

#### Scenario: 关闭笔记面板时保存
- **WHEN** 用户关闭笔记面板（点击关闭按钮或快捷键）
- **THEN** 系统 SHALL 立即保存当前有未保存修改的笔记内容

#### Scenario: 窗口失焦时保存
- **WHEN** 应用窗口失去焦点（用户切换到其他应用）
- **THEN** 系统 SHALL 立即保存所有有未保存修改的笔记

#### Scenario: 应用退出时保存
- **WHEN** 应用即将退出（beforeunload 事件）
- **THEN** 系统 SHALL 同步保存所有有未保存修改的笔记
