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

### Requirement: 二维码生成记录
系统 SHALL 在二维码工具中保存最近 10 次成功生成的二维码文本记录，并允许用户从记录中恢复输入。

#### Scenario: 保存成功生成记录
- **WHEN** 用户在二维码工具中输入非空文本
- **AND** 系统成功生成对应二维码预览
- **AND** 该输入在短暂稳定时间内未继续变化
- **THEN** 系统 SHALL 将该文本保存到最近生成记录顶部
- **AND** 最近生成记录 SHALL 跨应用会话保留

#### Scenario: 最近记录最多保存 10 条
- **WHEN** 系统保存新的二维码生成记录后最近记录数量超过 10 条
- **THEN** 系统 SHALL 保留最近更新的 10 条记录
- **AND** 系统 SHALL 自动移除更旧的最近记录

#### Scenario: 最近记录去重
- **WHEN** 系统保存的二维码文本已存在于最近生成记录
- **THEN** 系统 SHALL 更新该记录的最近生成时间
- **AND** 系统 SHALL 将该记录移动到最近生成记录顶部
- **AND** 系统 SHALL NOT 追加重复记录

#### Scenario: 点击最近记录恢复输入
- **WHEN** 用户点击一条最近生成记录
- **THEN** 系统 SHALL 将该记录的文本填入二维码工具输入区
- **AND** 系统 SHALL 根据该文本重新生成二维码预览

#### Scenario: 删除最近记录
- **WHEN** 用户删除一条最近生成记录
- **THEN** 系统 SHALL 从最近生成记录中移除该记录
- **AND** 系统 SHALL NOT 清空当前二维码输入

#### Scenario: 清空最近记录
- **WHEN** 用户触发清空最近生成记录
- **THEN** 系统 SHALL 移除全部最近生成记录
- **AND** 系统 SHALL 保留固定常驻链接
- **AND** 系统 SHALL NOT 清空当前二维码输入

### Requirement: 二维码固定常驻链接
系统 SHALL 允许用户在二维码工具中固定当前二维码文本为常驻链接，并在后续会话中复用；当当前二维码文本已固定时，系统 SHALL 允许用户从当前文本主操作取消固定。

#### Scenario: 固定当前二维码文本
- **WHEN** 用户在二维码工具中输入非空文本
- **AND** 系统已成功生成对应二维码预览
- **AND** 用户触发固定操作
- **THEN** 系统 SHALL 将当前文本保存为固定常驻链接
- **AND** 固定常驻链接 SHALL 跨应用会话保留

#### Scenario: 固定链接不计入最近记录上限
- **WHEN** 用户固定一条二维码文本
- **THEN** 系统 SHALL 在固定常驻链接区域展示该文本
- **AND** 系统 SHALL NOT 因固定链接数量变化减少最近生成记录的 10 条上限

#### Scenario: 点击固定链接恢复输入
- **WHEN** 用户点击一条固定常驻链接
- **THEN** 系统 SHALL 将该固定链接的文本填入二维码工具输入区
- **AND** 系统 SHALL 根据该文本重新生成二维码预览

#### Scenario: 从主操作取消固定当前文本
- **WHEN** 当前二维码输入文本已存在于固定常驻链接
- **AND** 用户触发当前文本的取消固定操作
- **THEN** 系统 SHALL 从固定常驻链接区域移除该文本
- **AND** 系统 SHALL NOT 清空当前二维码输入
- **AND** 系统 SHALL NOT 删除同文本的最近生成记录

#### Scenario: 取消固定链接
- **WHEN** 用户取消固定一条常驻链接
- **THEN** 系统 SHALL 从固定常驻链接区域移除该链接
- **AND** 系统 SHALL NOT 清空当前二维码输入
- **AND** 系统 SHALL NOT 删除同文本的最近生成记录

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
