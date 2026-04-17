# Capability: embedded-terminal (Delta)

## MODIFIED Requirements

### Requirement: xterm.js 终端 UI
渲染进程 SHALL 使用 xterm.js 提供终端 UI，支持基本的终端交互体验。每个终端实例 SHALL 作为独立的可实例化组件存在，支持在同一面板内并行存在多个实例。系统 SHALL 根据终端活跃状态和 renderer 策略减少后台 UI 开销，并在可用时尝试启用 WebGL renderer。

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

#### Scenario: 启用 WebGL renderer
- **WHEN** 终端 renderer 偏好允许优先使用 WebGL 且当前环境支持 WebGL renderer 初始化
- **THEN** 系统 SHALL 为终端实例尝试启用 WebGL renderer

#### Scenario: WebGL renderer 回退到 Canvas renderer
- **WHEN** WebGL renderer 不受支持或初始化失败
- **THEN** 系统 SHALL 尝试加载 Canvas renderer 作为回退
- **AND** Canvas renderer 加载失败时 SHALL 进一步回退到默认 DOM renderer
- **AND** 终端会话 SHALL 保持可用，不得因 renderer 初始化失败而中断

#### Scenario: 显式关闭 WebGL renderer
- **WHEN** 终端 renderer 偏好被显式关闭
- **THEN** 系统 SHALL 尝试使用 Canvas renderer
- **AND** Canvas renderer 不可用时 SHALL 使用默认 DOM renderer

#### Scenario: Addon 统一加载
- **WHEN** 终端实例初始化时
- **THEN** 系统 SHALL 加载以下 addon：WebLinksAddon、Unicode11Addon、SearchAddon
- **AND** 系统 SHALL 根据渲染器类型条件加载 ImageAddon（仅 Canvas 渲染器）
- **AND** 所有 addon 的加载失败 SHALL 不阻止终端正常使用
