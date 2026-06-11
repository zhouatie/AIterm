## ADDED Requirements

### Requirement: Markdown 标题树导航
系统 SHALL 在 Markdown 文件预览中提供基于当前文档标题结构的悬浮标题树导航。标题树 SHALL 仅反映预览区实际渲染出的 `h1` 到 `h6` 标题，并 SHALL 支持用户点击标题后滚动定位到对应标题。

#### Scenario: 显示悬浮标题树入口
- **WHEN** 用户选中一个包含一个或多个标题的 `.md` 文件
- **THEN** 预览区 SHALL 在 Markdown 内容区域左侧显示悬浮标题树入口
- **AND** 该入口 SHALL 不改变 Markdown 正文的布局宽度

#### Scenario: Hover 或 focus 展开标题树
- **WHEN** 用户将鼠标移动到悬浮标题树入口、已展开的标题树面板上，或通过键盘 focus 到标题树入口
- **THEN** 系统 SHALL 展开标题树面板
- **AND** 标题树 SHALL 按 `h1` 到 `h6` 层级使用缩进或等效视觉层级展示标题

#### Scenario: 点击标题跳转定位
- **WHEN** 用户点击标题树中的一个标题项
- **THEN** Markdown 预览滚动容器 SHALL 滚动到对应的渲染标题位置
- **AND** 系统 SHALL 保持当前选中文件、文件内容和文件树状态不变

#### Scenario: 无标题时隐藏入口
- **WHEN** 用户选中的 `.md` 文件没有渲染出任何 `h1` 到 `h6` 标题
- **THEN** 预览区 SHALL 不显示标题树入口或空标题树面板

#### Scenario: 非 Markdown 文件不显示标题树
- **WHEN** 用户选中一个非 `.md` 文件
- **THEN** 预览区 SHALL 使用现有代码预览模式
- **AND** 系统 SHALL 不显示 Markdown 标题树入口
