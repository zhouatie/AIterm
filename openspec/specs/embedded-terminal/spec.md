# Capability: embedded-terminal

## Purpose
嵌入式终端能力，负责 PTY 会话的创建/销毁、输入输出传输、尺寸同步以及基于 xterm.js 的终端 UI 渲染。
## Requirements
### Requirement: 创建终端会话
系统 SHALL 支持通过 IPC 创建一个终端会话，在主进程中 spawn 一个 PTY 进程并连接到用户默认 shell。

#### Scenario: 创建终端
- **WHEN** 渲染进程发送 `terminal:create` 请求
- **THEN** 主进程 SHALL 使用 node-pty 创建一个新的 PTY 实例，spawn 用户默认 shell（如 `/bin/zsh`），并返回会话标识符

#### Scenario: 继承环境变量
- **WHEN** PTY 进程被创建
- **THEN** SHALL 继承当前系统环境变量，确保 PATH 等关键变量可用

### Requirement: 终端输入传输
用户在 xterm.js 中的按键输入 SHALL 通过 IPC 传输到主进程的 PTY stdin。

#### Scenario: 普通字符输入
- **WHEN** 用户在终端面板中输入字符
- **THEN** 字符 SHALL 通过 `terminal:input` IPC 通道发送到对应 PTY 的 stdin

#### Scenario: 特殊按键
- **WHEN** 用户按下 Ctrl+C、Ctrl+D 等控制键
- **THEN** 对应的控制序列 SHALL 正确传输到 PTY

### Requirement: 终端输出渲染
PTY 进程的 stdout 输出 SHALL 通过 IPC 传输到渲染进程，并由 xterm.js 渲染。

#### Scenario: 命令输出
- **WHEN** PTY 进程产生输出（如命令执行结果）
- **THEN** 输出数据 SHALL 通过 `terminal:output` IPC 事件推送到渲染进程，由 xterm.js 渲染

#### Scenario: ANSI 颜色
- **WHEN** PTY 输出包含 ANSI 转义序列（颜色、样式等）
- **THEN** xterm.js SHALL 正确渲染对应的颜色和样式

### Requirement: 终端尺寸同步
当终端面板尺寸变化时，系统 SHALL 将新的行列数同步到 PTY 进程。

#### Scenario: 窗口缩放
- **WHEN** 用户调整应用窗口大小导致终端面板尺寸变化
- **THEN** 渲染进程 SHALL 通过 `terminal:resize` 通知主进程新的 cols/rows，PTY SHALL 同步更新尺寸

#### Scenario: 全屏 TUI 应用适配
- **WHEN** 终端中运行 vim、htop 等全屏 TUI 应用时窗口大小改变
- **THEN** TUI 应用 SHALL 收到 SIGWINCH 信号并正确重绘

### Requirement: 终端会话销毁
系统 SHALL 支持销毁终端会话，清理 PTY 进程和相关资源。

#### Scenario: 主动销毁
- **WHEN** 渲染进程发送 `terminal:dispose` 请求
- **THEN** 主进程 SHALL 终止对应的 PTY 进程并释放资源

#### Scenario: shell 退出
- **WHEN** PTY 中的 shell 进程正常退出（如用户输入 `exit`）
- **THEN** 系统 SHALL 通知渲染进程会话已结束

### Requirement: xterm.js 终端 UI
渲染进程 SHALL 使用 xterm.js 提供终端 UI，支持基本的终端交互体验。每个终端实例 SHALL 作为独立的可实例化组件存在，支持在同一面板内并行存在多个实例。

#### Scenario: 终端面板渲染
- **WHEN** 一个终端实例挂载到 DOM
- **THEN** xterm.js SHALL 初始化并占满其容器的可用空间

#### Scenario: 滚动回看
- **WHEN** 终端输出超过可视区域
- **THEN** 用户 SHALL 能通过滚动查看历史输出

#### Scenario: 文本选择与复制
- **WHEN** 用户在终端中用鼠标选择文本
- **THEN** 选中文本 SHALL 可以通过 Cmd+C 复制到系统剪贴板

#### Scenario: 多实例独立运行
- **WHEN** 同一面板内存在多个终端实例
- **THEN** 每个实例 SHALL 拥有独立的 xterm.js 实例、PTY 会话和滚动缓冲区，互不干扰

#### Scenario: 终端配色随主题切换
- **WHEN** 应用主题模式发生变化（深色↔浅色）
- **THEN** 所有已存在的 xterm.js 终端实例 SHALL 动态更新其 `options.theme` 配色方案以匹配当前主题，无需销毁重建终端实例

#### Scenario: 深色模式终端配色
- **WHEN** 当前主题模式为深色
- **THEN** 终端 SHALL 使用深色背景、浅色前景文字及适配深色模式的 ANSI 颜色方案

#### Scenario: 浅色模式终端配色
- **WHEN** 当前主题模式为浅色
- **THEN** 终端 SHALL 使用浅色背景、深色前景文字及适配浅色模式的 ANSI 颜色方案

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

