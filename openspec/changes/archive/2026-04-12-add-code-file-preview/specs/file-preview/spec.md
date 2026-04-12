## MODIFIED Requirements

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法和代码高亮。仅当选中文件的扩展名为 `.md` 时才使用此渲染模式。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容

## ADDED Requirements

### Requirement: 文件类型预览路由
文件预览面板 SHALL 根据选中文件的扩展名自动选择对应的预览组件进行渲染。

#### Scenario: Markdown 文件路由到 Markdown 预览
- **WHEN** 用户选中一个 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `MarkdownPreview` 组件渲染文件内容

#### Scenario: 代码文件路由到代码预览
- **WHEN** 用户选中一个非 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `CodePreview` 组件渲染文件内容，提供语法高亮

#### Scenario: 切换文件类型时预览组件切换
- **WHEN** 用户先选中一个 `.md` 文件，再选中一个 `.ts` 文件
- **THEN** 预览区 SHALL 从 Markdown 渲染模式无缝切换到代码高亮模式
