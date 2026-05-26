## MODIFIED Requirements

### Requirement: 创建终端会话
系统 SHALL 支持通过 IPC 创建一个终端会话，在主进程中 spawn 一个 PTY 进程并连接到用户默认 shell。系统 SHALL 在 macOS GUI 打包启动场景下恢复用户登录 shell 环境后再创建 PTY，使终端会话可访问用户日常终端中的 CLI 工具。

#### Scenario: 创建终端
- **WHEN** 渲染进程发送 `terminal:create` 请求
- **THEN** 主进程 SHALL 使用 node-pty 创建一个新的 PTY 实例，spawn 用户默认 shell（如 `/bin/zsh`），并返回会话标识符

#### Scenario: 继承环境变量
- **WHEN** PTY 进程被创建
- **THEN** SHALL 继承当前系统环境变量，确保 PATH 等关键变量可用

#### Scenario: macOS 打包应用恢复登录 shell PATH
- **WHEN** 应用在 macOS 上以打包后的 GUI 应用方式启动
- **AND** PTY 进程被创建
- **THEN** 主进程 SHALL 使用用户登录 shell 可见的环境变量构造 PTY 环境
- **AND** PTY 环境中的 `PATH` SHALL 包含登录 shell 可解析出的用户 CLI 路径

#### Scenario: AIterm 运行时变量优先
- **WHEN** PTY 环境由登录 shell 环境和应用运行时变量合并生成
- **THEN** `SHELL`、`TERM`、`COLORTERM` 以及 AIterm 通知相关变量 SHALL 使用 AIterm 创建会话时指定的值

#### Scenario: 登录 shell 环境恢复失败
- **WHEN** 主进程无法在超时范围内解析用户登录 shell 环境
- **THEN** 终端会话 SHALL 仍然被创建
- **AND** PTY SHALL 使用当前主进程环境变量作为回退
