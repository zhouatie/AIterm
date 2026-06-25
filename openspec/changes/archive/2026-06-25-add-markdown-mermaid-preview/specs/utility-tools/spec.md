## MODIFIED Requirements

### Requirement: Mermaid 图表预览工具
系统 SHALL 允许用户输入 Mermaid 源码，并在本地渲染图表预览。成功渲染的 Mermaid 图表 SHALL 支持全屏查看，并在全屏查看时支持滚轮缩放。

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

#### Scenario: Mermaid 工具图表全屏查看
- **WHEN** Mermaid 工具已成功渲染图表预览
- **AND** 用户点击图表或图表全屏查看控件
- **THEN** 系统 SHALL 打开全屏图表查看层
- **AND** 全屏查看层 SHALL 展示当前 Mermaid 图表内容
- **AND** 全屏查看层 SHALL 默认按可用宽高等比适配图表，使图表尽量撑满查看区域且不变形

#### Scenario: Mermaid 工具全屏图表滚轮缩放
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 用户在查看层内滚动鼠标滚轮
- **THEN** 系统 SHALL 根据滚轮方向放大或缩小图表
- **AND** 系统 SHALL 将缩放比例限制在可用范围内，避免图表不可恢复地过小或过大

#### Scenario: Mermaid 工具全屏默认适配容器
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 根据图表 intrinsic 尺寸和全屏画布可用宽高计算初始缩放比例
- **AND** 图表 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 工具全屏按可见内容边界适配
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** Mermaid SVG 的声明 viewBox 或画布尺寸包含明显大于可见图形的空白区域
- **THEN** 系统 SHALL 优先根据 SVG 可见内容边界计算初始缩放比例
- **AND** 图表可见内容 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 工具全屏源码与图表模式切换
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 系统 SHALL 提供源码模式和图表模式切换控件
- **AND** 用户切换到源码模式时，系统 SHALL 展示当前 Mermaid 输入源码
- **AND** 用户切换回图表模式时，系统 SHALL 展示 Mermaid 图表并保留可滚轮缩放能力

#### Scenario: Mermaid 工具全屏模式切换控件命中区域
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 图表 / 源码切换控件可见
- **THEN** 切换控件的可点击命中区域 SHALL 与视觉按钮边界一致
- **AND** 用户点击视觉按钮区域时，系统 SHALL 切换到对应模式

#### Scenario: Mermaid 工具全屏右上角工具栏完整按钮命中区域
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 右上角工具栏中的图表、源码、复制、关闭控件可见
- **THEN** 每个控件的可点击命中区域 SHALL 覆盖其整个可见按钮区域
- **AND** 用户点击任一控件可见按钮区域内的边缘、角落或中心时，系统 SHALL 执行该控件对应操作

#### Scenario: Mermaid 工具全屏容器右下角缩放百分比
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 缩放百分比 SHALL 固定显示在全屏容器右下角
- **AND** 关闭图标 SHALL 保持显示在全屏容器右上角
- **AND** 缩放百分比 SHALL NOT 占用或推动工具栏中的图表 / 源码切换、复制或关闭控件

#### Scenario: Mermaid 工具全屏一键复制
- **WHEN** Mermaid 工具的全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 提供复制控件用于复制当前 Mermaid SVG
- **WHEN** 当前模式为源码模式
- **THEN** 系统 SHALL 提供复制控件用于复制当前 Mermaid 输入源码
- **AND** 复制操作 SHALL NOT 切换模式或关闭全屏查看层
