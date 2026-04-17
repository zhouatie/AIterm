# Capability: terminal-content-persistence

## Purpose
终端内容序列化与跨重启恢复能力，在应用退出时保存终端缓冲区内容，重启后恢复上次的终端显示。

## Requirements

### Requirement: 终端内容序列化
系统 SHALL 在应用退出时将每个终端会话的缓冲区内容序列化保存。

#### Scenario: 应用退出时序列化缓冲区
- **WHEN** 应用窗口关闭
- **THEN** 系统 SHALL 使用 SerializeAddon 将每个活跃终端会话的缓冲区内容序列化
- **AND** 序列化内容 SHALL 包含 ANSI 格式信息（颜色、样式）

#### Scenario: 限制序列化行数
- **WHEN** 终端缓冲区内容超过最大序列化行数限制（默认 1000 行）
- **THEN** 系统 SHALL 仅序列化最近的 1000 行内容
- **AND** 更早的历史内容 SHALL 被丢弃

#### Scenario: 序列化数据存储
- **WHEN** 缓冲区序列化完成
- **THEN** 序列化数据 SHALL 通过 IPC 发送到主进程
- **AND** 主进程 SHALL 将数据写入 `<userData>/terminal-buffers/<sessionId>.txt`
- **AND** 每个 session 的数据 SHALL 存储为独立文件

### Requirement: 终端内容恢复
系统 SHALL 在应用启动时从持久化数据中恢复终端缓冲区内容。

#### Scenario: 启动时恢复终端内容
- **WHEN** 应用启动且存在有效的终端缓冲区持久化数据
- **THEN** 系统 SHALL 在 tab 布局恢复完成后，将序列化内容回写到对应的终端实例
- **AND** 恢复后的终端 SHALL 显示上次退出时的内容（含颜色和样式）

#### Scenario: 持久化数据不存在
- **WHEN** 应用启动时某个 session 对应的缓冲区文件不存在
- **THEN** 该终端 SHALL 以干净的初始状态启动
- **AND** 系统 SHALL 不报错

#### Scenario: 持久化数据损坏
- **WHEN** 缓冲区文件存在但内容损坏或无法解析
- **THEN** 系统 SHALL 静默忽略该文件
- **AND** 该终端 SHALL 以干净的初始状态启动

### Requirement: 过期数据清理
系统 SHALL 自动清理不再需要的终端缓冲区持久化文件。

#### Scenario: 删除孤立的缓冲区文件
- **WHEN** 应用启动时发现 `terminal-buffers/` 目录中存在的文件无法匹配到任何恢复的 session
- **THEN** 系统 SHALL 删除这些孤立文件以释放磁盘空间
