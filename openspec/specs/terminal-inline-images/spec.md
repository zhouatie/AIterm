# Capability: terminal-inline-images

## Purpose
终端内联图片渲染能力，支持 iTerm2 内联图片协议和 Sixel 图形，在终端中直接显示图片。

## Requirements

### Requirement: Image addon 条件加载
系统 SHALL 仅在 Canvas 渲染器激活时加载 Image addon。

#### Scenario: Canvas 渲染器下加载 Image addon
- **WHEN** 终端初始化且当前使用 Canvas 渲染器
- **THEN** 系统 SHALL 加载 ImageAddon
- **AND** 终端 SHALL 支持内联图片渲染

#### Scenario: WebGL 渲染器下不加载 Image addon
- **WHEN** 终端初始化且当前使用 WebGL 渲染器
- **THEN** 系统 SHALL 不加载 ImageAddon
- **AND** 包含内联图片的输出 SHALL 以文本/乱码形式显示（降级行为）

#### Scenario: DOM 渲染器下不加载 Image addon
- **WHEN** 终端初始化且当前使用 DOM 渲染器
- **THEN** 系统 SHALL 不加载 ImageAddon

### Requirement: iTerm2 内联图片协议支持
系统 SHALL 支持 iTerm2 的内联图片协议，在终端中直接渲染图片。

#### Scenario: 渲染 iTerm2 协议图片
- **WHEN** 终端接收到符合 iTerm2 内联图片协议的转义序列
- **THEN** 系统 SHALL 在终端中渲染该图片
- **AND** 图片 SHALL 在不超过终端宽度的前提下按原始比例显示

#### Scenario: imgcat 工具输出
- **WHEN** 用户在终端中使用 `imgcat` 命令显示图片
- **THEN** 图片 SHALL 被正确渲染在终端输出中
- **AND** 后续终端输出 SHALL 在图片下方正常显示

### Requirement: Sixel 图形支持
系统 SHALL 支持 Sixel 图形协议的终端内图片渲染。

#### Scenario: 渲染 Sixel 图形
- **WHEN** 终端接收到 Sixel 图形数据
- **THEN** 系统 SHALL 将 Sixel 数据渲染为图片显示在终端中

#### Scenario: 图片随终端滚动
- **WHEN** 终端中已渲染的图片因新输出被推入回滚缓冲区
- **THEN** 图片 SHALL 跟随文本一同滚动
- **AND** 用户滚动回看时 SHALL 能重新看到该图片
