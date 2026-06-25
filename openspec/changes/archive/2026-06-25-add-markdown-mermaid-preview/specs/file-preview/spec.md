## MODIFIED Requirements

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法、代码高亮和 Mermaid 图表渲染。仅当选中文件的扩展名为 `.md` 时才使用此渲染模式。Markdown 预览中的 GFM 任务列表 checkbox SHALL 支持点击切换状态，并将变更写回源 Markdown 文件。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 点击任务 checkbox 勾选
- **WHEN** 用户点击 Markdown 预览中由 `- [ ]`、`* [ ]` 或 `+ [ ]` 渲染出的未完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为已完成状态 `[x]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为勾选状态

#### Scenario: 点击任务 checkbox 取消勾选
- **WHEN** 用户点击 Markdown 预览中由 `[x]` 或 `[X]` 渲染出的已完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为未完成状态 `[ ]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为未勾选状态

#### Scenario: 嵌套任务 checkbox 写回
- **WHEN** Markdown 文件包含缩进的嵌套 GFM 任务列表，且用户点击其中一个任务 checkbox
- **THEN** 系统 SHALL 按任务项在源文件中的出现顺序定位对应 marker
- **AND** 系统 SHALL 只切换该 marker 的状态，不改变该行缩进或正文内容

#### Scenario: checkbox 写回失败
- **WHEN** 用户点击任务 checkbox 但源文件写入失败
- **THEN** 系统 SHALL 保持当前预览内容与写入前一致
- **AND** 系统 SHALL 向用户展示写入失败反馈

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: Mermaid 图表渲染
- **WHEN** Markdown 文件包含语言标识为 `mermaid` 的 fenced code block
- **THEN** 预览区 SHALL 将该代码块内容渲染为 Mermaid 图表
- **AND** 预览区 SHALL NOT 将该代码块显示为普通高亮代码块

#### Scenario: Mermaid 图表主题
- **WHEN** 当前应用主题为 light 或 dark
- **AND** Markdown 文件包含可成功渲染的 Mermaid 图表
- **THEN** 预览区 SHALL 使用与当前应用主题匹配的 Mermaid 主题渲染图表

#### Scenario: Mermaid 渲染失败
- **WHEN** Markdown 文件包含无法成功渲染的 Mermaid fenced code block
- **THEN** 预览区 SHALL 在对应位置展示 Mermaid 渲染失败反馈
- **AND** 预览区 SHALL 保留该代码块源码可见
- **AND** 预览区 SHALL 继续渲染文档中的其它内容

#### Scenario: Mermaid 图表滚动稳定性
- **WHEN** Markdown 文件包含已成功渲染的 Mermaid 图表
- **AND** 用户在预览区滚动浏览内容
- **THEN** 预览区 SHALL NOT 因滚动动作让 Mermaid 图表重新进入 loading 状态
- **AND** 预览区 SHALL NOT 因滚动动作重复调用 Mermaid 图表渲染

#### Scenario: Mermaid 图表全屏查看
- **WHEN** Markdown 文件包含已成功渲染的 Mermaid 图表
- **AND** 用户点击该图表或图表全屏查看控件
- **THEN** 系统 SHALL 打开全屏图表查看层
- **AND** 全屏查看层 SHALL 展示同一 Mermaid 图表内容
- **AND** 全屏查看层 SHALL 默认按可用宽高等比适配图表，使图表尽量撑满查看区域且不变形

#### Scenario: Mermaid 全屏图表滚轮缩放
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 用户在查看层内滚动鼠标滚轮
- **THEN** 系统 SHALL 根据滚轮方向放大或缩小图表
- **AND** 系统 SHALL 将缩放比例限制在可用范围内，避免图表不可恢复地过小或过大

#### Scenario: Mermaid 全屏默认适配容器
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 根据图表 intrinsic 尺寸和全屏画布可用宽高计算初始缩放比例
- **AND** 图表 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 全屏按可见内容边界适配
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** Mermaid SVG 的声明 viewBox 或画布尺寸包含明显大于可见图形的空白区域
- **THEN** 系统 SHALL 优先根据 SVG 可见内容边界计算初始缩放比例
- **AND** 图表可见内容 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 全屏源码与图表模式切换
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 系统 SHALL 提供源码模式和图表模式切换控件
- **AND** 用户切换到源码模式时，系统 SHALL 展示该 Mermaid 图表的源码文本
- **AND** 用户切换回图表模式时，系统 SHALL 展示 Mermaid 图表并保留可滚轮缩放能力

#### Scenario: Mermaid 全屏模式切换控件命中区域
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 图表 / 源码切换控件可见
- **THEN** 切换控件的可点击命中区域 SHALL 与视觉按钮边界一致
- **AND** 用户点击视觉按钮区域时，系统 SHALL 切换到对应模式

#### Scenario: Mermaid 全屏右上角工具栏完整按钮命中区域
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 右上角工具栏中的图表、源码、复制、关闭控件可见
- **THEN** 每个控件的可点击命中区域 SHALL 覆盖其整个可见按钮区域
- **AND** 用户点击任一控件可见按钮区域内的边缘、角落或中心时，系统 SHALL 执行该控件对应操作

#### Scenario: Mermaid 全屏容器右下角缩放百分比
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 缩放百分比 SHALL 固定显示在全屏容器右下角
- **AND** 关闭图标 SHALL 保持显示在全屏容器右上角
- **AND** 缩放百分比 SHALL NOT 占用或推动工具栏中的图表 / 源码切换、复制或关闭控件

#### Scenario: Mermaid 全屏一键复制
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 提供复制控件用于复制当前 Mermaid SVG
- **WHEN** 当前模式为源码模式
- **THEN** 系统 SHALL 提供复制控件用于复制该 Mermaid 图表源码
- **AND** 复制操作 SHALL NOT 切换模式或关闭全屏查看层

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容
