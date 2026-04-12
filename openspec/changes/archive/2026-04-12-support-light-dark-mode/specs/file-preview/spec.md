## MODIFIED Requirements

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法和代码高亮。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: 代码高亮适配主题
- **WHEN** 应用主题模式发生变化
- **THEN** 代码块的 highlight.js 样式 SHALL 切换到与当前主题匹配的配色方案（浅色主题使用浅色高亮、深色主题使用深色高亮）

#### Scenario: Markdown 正文适配主题
- **WHEN** 应用主题模式发生变化
- **THEN** Markdown 预览区的正文文字颜色、背景色、链接颜色、引用块样式等 SHALL 适配当前主题

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个 Markdown 文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容

### Requirement: 选中文件高亮
用户点击文件节点时 SHALL 显示选中高亮状态。

#### Scenario: 选中文件高亮
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮状态，高亮颜色 SHALL 使用主题变量而非硬编码值
