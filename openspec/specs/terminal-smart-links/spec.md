# Capability: terminal-smart-links

## Purpose
自定义链接检测与面板联动能力，在终端输出中识别文件路径并支持点击跳转到 FilePreviewPanel。

## Requirements

### Requirement: 文件路径链接检测
系统 SHALL 在终端输出中检测文件路径模式，并将其渲染为可点击链接。

#### Scenario: 检测绝对路径
- **WHEN** 终端输出包含绝对文件路径（如 `/src/auth/session.ts`）
- **THEN** 该路径 SHALL 被识别为可点击链接
- **AND** 鼠标悬停时 SHALL 显示下划线和链接提示

#### Scenario: 检测带行列号的路径
- **WHEN** 终端输出包含 `file:line` 或 `file:line:col` 格式的路径（如 `src/auth.ts:47:12`）
- **THEN** 整个 `file:line:col` 模式 SHALL 被识别为可点击链接
- **AND** 点击时 SHALL 传递文件路径、行号和列号信息

#### Scenario: 检测相对路径
- **WHEN** 终端输出包含 `./` 或 `../` 开头的相对路径
- **THEN** 系统 SHALL 将相对路径解析为基于终端 CWD 的绝对路径
- **AND** 解析后的路径 SHALL 被识别为可点击链接

#### Scenario: 路径存在性验证
- **WHEN** 系统检测到潜在的文件路径链接
- **THEN** 系统 SHALL 通过 IPC 验证该文件路径是否实际存在
- **AND** 不存在的路径 SHALL 不显示为可点击链接

### Requirement: 链接点击跳转到 FilePreviewPanel
用户点击终端中的文件路径链接 SHALL 在 FilePreviewPanel 中打开对应文件。

#### Scenario: 点击文件路径打开预览
- **WHEN** 用户点击终端中的文件路径链接
- **THEN** 系统 SHALL 在 FilePreviewPanel 中打开该文件
- **AND** 如果 FilePreviewPanel 当前未显示，SHALL 自动展开

#### Scenario: 点击带行号的路径定位到行
- **WHEN** 用户点击包含行号信息的文件路径链接（如 `file.ts:47`）
- **THEN** FilePreviewPanel SHALL 打开该文件并滚动到指定行
- **AND** 指定行 SHALL 以高亮方式突出显示

#### Scenario: 链接与 WebLinksAddon 共存
- **WHEN** 终端同时加载了 WebLinksAddon 和自定义 LinkProvider
- **THEN** URL 链接 SHALL 继续由 WebLinksAddon 处理
- **AND** 文件路径链接 SHALL 由自定义 LinkProvider 处理
- **AND** 两者 SHALL 互不干扰
