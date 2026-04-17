# Capability: terminal-unicode

## Purpose
Unicode 11 字符宽度正确计算能力，确保 CJK 全角字符、Emoji 及复杂 Unicode 在终端中正确渲染和对齐。

## ADDED Requirements

### Requirement: Unicode 11 宽度计算
系统 SHALL 使用 Unicode 11 标准的字符宽度表进行终端列宽计算。

#### Scenario: 加载 Unicode11 支持
- **WHEN** 终端实例初始化时
- **THEN** 系统 SHALL 加载 Unicode11Addon
- **AND** 系统 SHALL 将终端的 Unicode 处理版本设置为 "11"

#### Scenario: CJK 全角字符正确占两列
- **WHEN** 终端输出包含中文、日文或韩文全角字符
- **THEN** 每个全角字符 SHALL 占据 2 列宽度
- **AND** 后续字符的光标位置 SHALL 正确偏移

#### Scenario: Emoji 正确占两列
- **WHEN** 终端输出包含 Emoji 字符（如 🎉、👍）
- **THEN** Emoji 字符 SHALL 占据 2 列宽度
- **AND** 光标位置 SHALL 正确反映 Emoji 的实际显示宽度

#### Scenario: 混合文本对齐正确
- **WHEN** 终端输出包含 ASCII、CJK 和 Emoji 的混合文本
- **THEN** 所有字符 SHALL 在同一行内正确对齐
- **AND** 全屏 TUI 应用（如表格、边框绘制）在混合文本场景下 SHALL 正确渲染
