## ADDED Requirements

### Requirement: 终端 CWD 变化通知
当 PTY 会话的工作目录发生变化时，系统 SHALL 向渲染进程推送通知事件。

#### Scenario: CWD 变化检测
- **WHEN** PTY 进程产生输出数据
- **THEN** 主进程 SHALL 以节流方式检查该 PTY 会话的实际工作目录（通过 OS 级查询），若 CWD 与上次已知值不同，SHALL 向渲染进程发送 `terminal:cwdChanged` 事件，包含 `{ id: string, cwd: string }`

#### Scenario: 节流检测频率
- **WHEN** PTY 进程在短时间内产生大量输出
- **THEN** CWD 检测 SHALL 被节流为不超过每秒一次，避免过度调用 `lsof` 或类似系统命令

#### Scenario: 渲染进程监听接口
- **WHEN** 渲染进程需要监听终端 CWD 变化
- **THEN** `terminalApi` SHALL 暴露 `onCwdChanged(callback)` 方法，返回取消监听函数
