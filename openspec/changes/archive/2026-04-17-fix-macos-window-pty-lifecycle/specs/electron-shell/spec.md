## MODIFIED Requirements

### Requirement: 应用生命周期管理
应用 SHALL 正确处理窗口关闭和应用退出事件。关闭 GUI 会终止活跃 PTY 会话时，应用 SHALL 先向用户展示二次确认；只有用户确认后才允许关闭窗口并清理 PTY。关闭所有窗口后，应用 SHALL 清理所有活跃 PTY 会话；在 macOS 上应用进程 MAY 保持运行以支持 dock 重新打开窗口，但不得保留不可见的后台 PTY。

#### Scenario: 关闭 GUI 前展示二次确认
- **WHEN** 用户请求关闭主窗口且当前存在活跃 PTY 会话
- **THEN** 应用 SHALL 在主窗口关闭前展示二次确认
- **THEN** 确认内容 SHALL 明确告知关闭 GUI 会终止正在运行的终端进程

#### Scenario: 取消关闭 GUI
- **WHEN** 关闭确认已展示
- **AND** 用户选择取消关闭
- **THEN** 应用 SHALL 保持主窗口打开
- **THEN** 应用 SHALL NOT 终止任何活跃 PTY 进程
- **THEN** 应用 SHALL NOT 从主进程 session registry 中移除任何 PTY 会话

#### Scenario: 确认关闭 GUI
- **WHEN** 关闭确认已展示
- **AND** 用户确认关闭
- **THEN** 应用 SHALL 继续执行主窗口关闭流程
- **THEN** 应用 SHALL 允许渲染进程保存当前 tab 布局状态
- **THEN** 应用 SHALL 在窗口关闭后清理所有活跃 PTY 会话

#### Scenario: 关闭窗口时清理 PTY
- **WHEN** 用户关闭主窗口并导致应用没有剩余窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程
- **THEN** 应用 SHALL 从主进程 session registry 中移除这些 PTY 会话

#### Scenario: 非 macOS 关闭窗口后退出
- **WHEN** 用户在非 macOS 平台关闭所有窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程后退出

#### Scenario: macOS 关闭窗口后不保留 PTY
- **WHEN** 用户在 macOS 上关闭所有窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程
- **THEN** 应用 MAY 保持进程运行等待 dock 重新激活
- **THEN** 应用 SHALL NOT 保留任何已关闭窗口关联的后台 PTY 会话

#### Scenario: macOS dock 行为
- **WHEN** 在 macOS 上关闭所有窗口后点击 dock 图标
- **THEN** 应用 SHALL 重新创建主窗口
- **THEN** 新窗口 SHALL NOT 复用关闭窗口前已终止的 PTY 会话

#### Scenario: 应用退出时重复清理安全
- **WHEN** 应用退出流程触发且 PTY 会话已经在窗口关闭时被清理
- **THEN** 应用 SHALL 安全完成退出清理
- **THEN** 重复清理 SHALL NOT 导致应用崩溃或抛出未处理异常
