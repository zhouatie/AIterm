# Capability: terminal-canvas-renderer

## Purpose
Canvas 渲染器回退能力，在 WebGL 渲染器不可用时提供高性能的 Canvas 2D 渲染作为中间回退层。

## ADDED Requirements

### Requirement: Canvas 渲染器作为中间回退层
系统 SHALL 在 WebGL 渲染器失败时尝试 Canvas 渲染器，Canvas 也失败时再降至 DOM 渲染器。

#### Scenario: WebGL 失败后回退到 Canvas
- **WHEN** 终端初始化时 WebGL 渲染器加载失败
- **THEN** 系统 SHALL 尝试加载 CanvasAddon 作为渲染器
- **AND** 终端 SHALL 使用 Canvas 2D 渲染

#### Scenario: Canvas 也失败后回退到 DOM
- **WHEN** WebGL 和 Canvas 渲染器均加载失败
- **THEN** 系统 SHALL 回退到 xterm.js 默认 DOM 渲染器
- **AND** 终端会话 SHALL 保持可用

#### Scenario: 渲染器降级链完整执行
- **WHEN** 终端实例初始化渲染器
- **THEN** 系统 SHALL 按 WebGL → Canvas → DOM 的优先级顺序依次尝试
- **AND** 每次失败 SHALL 记录警告日志但不中断终端初始化

### Requirement: 渲染器类型可查询
系统 SHALL 跟踪当前终端实例使用的渲染器类型。

#### Scenario: 查询当前渲染器类型
- **WHEN** 系统需要判断当前终端使用的渲染器
- **THEN** 系统 SHALL 提供当前渲染器类型（'webgl' | 'canvas' | 'dom'）
- **AND** 该信息 SHALL 用于决定是否加载渲染器相关 addon（如 Image addon）
