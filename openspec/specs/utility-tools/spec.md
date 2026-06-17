# Capability: utility-tools

## Purpose
提供应用内开发者工具入口和统一工具面板，用于本地处理 JSON、二维码和 Mermaid 图表预览等轻量前端工具。

## Requirements
### Requirement: 顶部开发者工具入口
系统 SHALL 在标题栏提供一个 icon-only 开发者工具入口，并允许用户从该入口打开统一工具面板。

#### Scenario: 标题栏显示单一工具入口
- **WHEN** 应用主窗口标题栏渲染完成
- **THEN** 标题栏 SHALL 显示一个 icon-only 工具按钮
- **THEN** 工具按钮 SHALL 提供“工具”或“开发者工具”语义的 tooltip 或 `aria-label`

#### Scenario: 点击工具入口
- **WHEN** 用户点击标题栏工具入口
- **THEN** 系统 SHALL 打开开发者工具面板
- **THEN** 开发者工具面板 SHALL 显示 JSON、二维码和 Mermaid 工具标签

#### Scenario: 首次打开工具面板
- **WHEN** 用户首次点击标题栏工具入口
- **THEN** 开发者工具面板 SHALL 默认激活 JSON 工具视图

#### Scenario: 重新打开工具面板
- **WHEN** 用户在开发者工具面板中切换到任一工具后关闭面板
- **AND** 用户在同一应用会话内再次点击标题栏工具入口
- **THEN** 开发者工具面板 SHALL 恢复上一次激活的工具视图

### Requirement: 统一工具面板
系统 SHALL 使用一个统一且足够大的开发者工具面板承载 JSON、二维码和 Mermaid 工具，并在关闭或切换工具时保留当前会话内的工具状态。

#### Scenario: 面板内切换工具
- **WHEN** 开发者工具面板已打开，且用户选择另一个工具标签
- **THEN** 系统 SHALL 在同一个面板中切换到目标工具
- **THEN** 系统 SHALL 保留切换前工具的输入、输出和错误状态

#### Scenario: 关闭面板
- **WHEN** 开发者工具面板已打开，且用户点击关闭控件或面板外部遮罩
- **THEN** 系统 SHALL 关闭开发者工具面板
- **THEN** 底层文件预览和 terminal 面板 SHALL 保持原有显示状态

#### Scenario: 重新打开后保留状态
- **WHEN** 用户在开发者工具面板中输入内容后关闭面板
- **AND** 用户在同一应用会话内再次打开开发者工具面板
- **THEN** 系统 SHALL 恢复上一次输入内容、输出结果和错误状态

#### Scenario: 工具面板使用大尺寸工作区
- **WHEN** 应用窗口有足够显示空间，且开发者工具面板打开
- **THEN** 开发者工具面板 SHALL 占据窗口主要可用区域，而不是小型弹窗尺寸
- **THEN** 面板 SHALL 为输入区和结果 / 预览区提供左右分栏的大工作区

#### Scenario: Mermaid 预览保持可读
- **WHEN** 用户在 Mermaid 工具中渲染图表
- **THEN** Mermaid 预览区 SHALL 使用大尺寸可滚动区域展示图表
- **THEN** 系统 SHALL 避免因面板过窄或过矮导致图表默认状态下难以辨认

### Requirement: JSON 格式化工具
系统 SHALL 允许用户输入 JSON 文本，并提供格式化、压缩、复制输出和解析错误展示能力。

#### Scenario: 格式化有效 JSON
- **WHEN** 用户在 JSON 工具中输入有效 JSON 文本并触发格式化
- **THEN** 系统 SHALL 在输出区显示缩进为 2 个空格的格式化 JSON
- **THEN** 系统 SHALL 清除之前的 JSON 解析错误

#### Scenario: 压缩有效 JSON
- **WHEN** 用户在 JSON 工具中输入有效 JSON 文本并触发压缩
- **THEN** 系统 SHALL 在输出区显示无多余空白字符的压缩 JSON
- **THEN** 系统 SHALL 清除之前的 JSON 解析错误

#### Scenario: 展示 JSON 解析错误
- **WHEN** 用户在 JSON 工具中输入无效 JSON 文本并触发格式化或压缩
- **THEN** 系统 SHALL 展示解析错误信息
- **THEN** 系统 SHALL 保留用户输入文本，不得用错误内容覆盖输入区

#### Scenario: 复制 JSON 输出
- **WHEN** JSON 工具存在输出结果，且用户点击复制输出
- **THEN** 系统 SHALL 将当前 JSON 输出复制到系统剪贴板

### Requirement: 二维码生成工具
系统 SHALL 允许用户输入任意文本，并在本地生成可预览的二维码。

#### Scenario: 输入文本生成二维码
- **WHEN** 用户在二维码工具中输入非空文本
- **THEN** 系统 SHALL 生成内容对应该文本的二维码预览
- **THEN** 二维码预览 SHALL 在浅色底面上清晰显示

#### Scenario: 清空二维码输入
- **WHEN** 用户清空二维码工具输入
- **THEN** 系统 SHALL 隐藏二维码预览
- **THEN** 系统 SHALL 显示空状态，而不是保留旧二维码误导用户

#### Scenario: 二维码生成失败
- **WHEN** 二维码库无法根据当前输入生成二维码
- **THEN** 系统 SHALL 显示生成失败提示
- **THEN** 系统 SHALL 保留用户输入文本

#### Scenario: 复制二维码 SVG
- **WHEN** 二维码工具已生成二维码，且用户点击复制 SVG
- **THEN** 系统 SHALL 将当前二维码 SVG 内容复制到系统剪贴板

### Requirement: Mermaid 图表预览工具
系统 SHALL 允许用户输入 Mermaid 源码，并在本地渲染图表预览。

#### Scenario: 渲染有效 Mermaid 图表
- **WHEN** 用户在 Mermaid 工具中输入有效 Mermaid 源码
- **THEN** 系统 SHALL 渲染对应的图表预览
- **THEN** 系统 SHALL 清除之前的 Mermaid 渲染错误

#### Scenario: 展示 Mermaid 渲染错误
- **WHEN** 用户在 Mermaid 工具中输入无效 Mermaid 源码
- **THEN** 系统 SHALL 展示渲染或语法错误信息
- **THEN** 系统 SHALL 保留用户输入源码

#### Scenario: Mermaid 预览跟随主题
- **WHEN** 应用主题在浅色、深色或跟随系统之间变化
- **THEN** Mermaid 图表预览 SHALL 使用与当前有效主题协调的 Mermaid 主题重新渲染

#### Scenario: Mermaid 空输入
- **WHEN** 用户清空 Mermaid 工具输入
- **THEN** 系统 SHALL 隐藏 Mermaid 图表预览
- **THEN** 系统 SHALL 显示空状态，而不是保留旧图表误导用户
