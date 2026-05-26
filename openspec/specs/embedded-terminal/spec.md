# Capability: embedded-terminal

## Purpose
嵌入式终端能力，负责 PTY 会话的创建/销毁、输入输出传输、尺寸同步以及基于 xterm.js 的终端 UI 渲染。
## Requirements
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

### Requirement: 终端输入传输
用户在 xterm.js 中的按键输入 SHALL 通过 IPC 传输到主进程的 PTY stdin。

#### Scenario: 普通字符输入
- **WHEN** 用户在终端面板中输入字符
- **THEN** 字符 SHALL 通过 `terminal:input` IPC 通道发送到对应 PTY 的 stdin

#### Scenario: 特殊按键
- **WHEN** 用户按下 Ctrl+C、Ctrl+D 等控制键
- **THEN** 对应的控制序列 SHALL 正确传输到 PTY

### Requirement: 终端输出渲染
PTY 进程的 stdout 输出 SHALL 通过按 session 路由的终端输出链路传输到渲染进程，并由对应 session 的 xterm.js 实例渲染。系统 SHALL 对高频输出进行微批次聚合，以降低无效 IPC 与写入频率，同时保持交互可用性。

#### Scenario: 命令输出
- **WHEN** 某个 PTY 会话产生输出（如命令执行结果）
- **THEN** 输出数据 SHALL 只被路由到该会话对应的终端输出链路，而不得广播给无关终端实例
- **AND** 对应会话的 xterm.js 实例 SHALL 渲染该输出

#### Scenario: 高频输出批处理
- **WHEN** 同一 PTY 会话在短时间内产生大量连续输出
- **THEN** 系统 SHALL 在发送到渲染进程前按 session 将输出聚合为微批次
- **AND** 每个批次 SHALL 在短延迟预算内被 flush，避免明显的输入或显示滞后

#### Scenario: 后台会话输出缓存
- **WHEN** 某个 PTY 会话处于非活跃状态且继续产生输出
- **THEN** 系统 SHALL 为该会话保留待消费输出，而不得要求非活跃 terminal 实例持续实时写入
- **AND** 待该会话重新激活时，系统 SHALL 按原始顺序补写未消费输出

#### Scenario: ANSI 颜色
- **WHEN** PTY 输出包含 ANSI 转义序列（颜色、样式等）
- **THEN** xterm.js SHALL 正确渲染对应的颜色和样式

### Requirement: 终端尺寸同步
当终端面板尺寸变化时，系统 SHALL 将新的行列数同步到当前参与可视渲染的 PTY 进程。对于非活跃会话，系统 SHALL 在其重新激活前补同步最新尺寸，确保重新显示时终端网格正确。

#### Scenario: 窗口缩放
- **WHEN** 用户调整应用窗口大小导致当前活跃终端面板尺寸变化
- **THEN** 渲染进程 SHALL 通过 `terminal:resize` 通知主进程新的 cols/rows
- **AND** 当前活跃 PTY SHALL 同步更新尺寸

#### Scenario: 全屏 TUI 应用适配
- **WHEN** 当前活跃终端中运行 vim、htop 等全屏 TUI 应用且窗口大小改变
- **THEN** TUI 应用 SHALL 收到尺寸变更并正确重绘

#### Scenario: 非活跃会话重新激活
- **WHEN** 某个非活跃终端会话重新变为活跃
- **THEN** 系统 SHALL 在该会话恢复前台交互前同步其最新 cols/rows
- **AND** 该会话后续显示 SHALL 使用最新终端网格尺寸

### Requirement: 终端会话销毁
系统 SHALL 支持销毁终端会话，清理 PTY 进程和相关资源。

#### Scenario: 主动销毁
- **WHEN** 渲染进程发送 `terminal:dispose` 请求
- **THEN** 主进程 SHALL 终止对应的 PTY 进程并释放资源

#### Scenario: shell 退出
- **WHEN** PTY 中的 shell 进程正常退出（如用户输入 `exit`）
- **THEN** 系统 SHALL 通知渲染进程会话已结束

### Requirement: xterm.js 终端 UI
渲染进程 SHALL 使用 xterm.js 提供终端 UI，支持基本的终端交互体验。每个终端实例 SHALL 作为独立的可实例化组件存在，支持在同一面板内并行存在多个实例。系统 SHALL 根据终端活跃状态和 renderer 策略减少后台 UI 开销；在用户显式允许时系统 SHALL 尝试启用 WebGL renderer，默认路径 SHALL 优先使用 Canvas renderer。

#### Scenario: 终端面板渲染
- **WHEN** 一个终端实例挂载到 DOM
- **THEN** xterm.js SHALL 初始化并占满其容器的可用空间

#### Scenario: 终端全宽占满
- **WHEN** 终端实例容器被渲染
- **THEN** 容器 SHALL 从父元素的 left: 0 到 right: 0 占满完整宽度，不存在硬编码的左侧偏移
- **AND** fit 计算的列数 SHALL 基于容器完整宽度，使 TUI 应用能够渲染填满终端全宽

#### Scenario: 终端内边距
- **WHEN** 终端内容被渲染
- **THEN** 终端文字左侧 SHALL 存在合理的内边距（4-6px），防止文字紧贴容器左边缘
- **AND** 该内边距 SHALL 通过 xterm.js 内部样式或 CSS 覆写实现，不影响列数计算准确性

#### Scenario: 终端滚动条样式统一
- **WHEN** 终端输出超过可视区域且 xterm viewport 出现滚动条
- **THEN** xterm 滚动条 SHALL 使用与文件系统滚动区域一致的滚动条宽度、轨道、滑块、hover 和圆角样式
- **AND** 滚动条颜色 SHALL 使用当前主题下的应用滚动条 CSS 变量

#### Scenario: 滚动回看
- **WHEN** 终端输出超过可视区域
- **THEN** 用户 SHALL 能通过滚动查看历史输出

#### Scenario: 文本选择与复制
- **WHEN** 用户在终端中用鼠标选择文本
- **THEN** 选中文本 SHALL 可以通过 Cmd+C 复制到系统剪贴板

#### Scenario: 多实例独立运行
- **WHEN** 同一面板内存在多个终端实例
- **THEN** 每个实例 SHALL 拥有独立的终端会话标识、PTY 会话和滚动缓冲区，互不干扰

#### Scenario: 非活跃实例降载
- **WHEN** 某个终端实例处于非活跃状态
- **THEN** 系统 SHALL 保持该 PTY 会话继续运行
- **AND** 该实例 SHALL 不再持续参与实时输出写入和尺寸观察链路

#### Scenario: 终端配色随主题切换
- **WHEN** 应用主题模式发生变化（深色↔浅色）
- **THEN** 所有已存在的 xterm.js 终端实例 SHALL 动态更新其 `options.theme` 配色方案以匹配当前主题，无需销毁重建终端实例

#### Scenario: 深色模式终端配色
- **WHEN** 当前主题模式为深色
- **THEN** 终端 SHALL 使用深色背景、浅色前景文字及适配深色模式的 ANSI 颜色方案

#### Scenario: 浅色模式终端配色
- **WHEN** 当前主题模式为浅色
- **THEN** 终端 SHALL 使用浅色背景、深色前景文字及适配浅色模式的 ANSI 颜色方案

#### Scenario: 默认使用 Canvas renderer
- **WHEN** 终端 renderer 偏好不存在或被显式关闭
- **THEN** 系统 SHALL 先尝试为终端实例加载 Canvas renderer
- **AND** Canvas renderer 不可用时 SHALL 使用默认 DOM renderer

#### Scenario: 启用 WebGL renderer
- **WHEN** 终端 renderer 偏好允许优先使用 WebGL 且当前环境支持 WebGL renderer 初始化
- **THEN** 系统 SHALL 为终端实例尝试启用 WebGL renderer

#### Scenario: WebGL renderer 回退到 Canvas renderer
- **WHEN** WebGL renderer 不受支持或初始化失败
- **THEN** 系统 SHALL 尝试加载 Canvas renderer 作为回退
- **AND** Canvas renderer 加载失败时 SHALL 进一步回退到默认 DOM renderer
- **AND** 终端会话 SHALL 保持可用，不得因 renderer 初始化失败而中断

#### Scenario: Addon 统一加载
- **WHEN** 终端实例初始化时
- **THEN** 系统 SHALL 加载以下 addon：WebLinksAddon、Unicode11Addon、SearchAddon
- **AND** 系统 SHALL 根据渲染器类型条件加载 ImageAddon（仅 Canvas 渲染器）
- **AND** 所有 addon 的加载失败 SHALL 不阻止终端正常使用

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
