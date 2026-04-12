## MODIFIED Requirements

### Requirement: xterm.js 终端 UI
渲染进程 SHALL 使用 xterm.js 提供终端 UI，支持基本的终端交互体验。每个终端实例 SHALL 作为独立的可实例化组件存在，支持在同一面板内并行存在多个实例。

#### Scenario: 终端面板渲染
- **WHEN** 一个终端实例挂载到 DOM
- **THEN** xterm.js SHALL 初始化并占满其容器的可用空间

#### Scenario: 终端全宽占满
- **WHEN** 终端实例容器被渲染
- **THEN** 容器 SHALL 从父元素的 left: 0 到 right: 0 占满完整宽度，不存在硬编码的左侧偏移
- **AND** FitAddon 计算的列数 SHALL 基于容器完整宽度，使 TUI 应用能够渲染填满终端全宽

#### Scenario: 终端内边距
- **WHEN** 终端内容被渲染
- **THEN** 终端文字左侧 SHALL 存在合理的内边距（4-6px），防止文字紧贴容器左边缘
- **AND** 该内边距 SHALL 通过 xterm.js 内部样式或 CSS 覆写实现，不影响 FitAddon 的列数计算准确性

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
