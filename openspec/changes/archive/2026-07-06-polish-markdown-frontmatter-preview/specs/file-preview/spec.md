## ADDED Requirements

### Requirement: Markdown 顶部文档属性预览
系统 SHALL 在 Markdown 文件预览中识别位于文件开头的 YAML front matter，并将其作为独立的顶部文档属性块展示。该属性块 SHALL 与正文 Markdown 渲染分离，且 SHALL NOT 修改源 Markdown 文件内容。

#### Scenario: 展示顶部 YAML front matter
- **WHEN** 用户预览的 Markdown 文件第一行是 `---`
- **AND** 文件后续存在闭合的 `---`
- **AND** 两个分隔符之间包含 YAML front matter 内容
- **THEN** 预览区 SHALL 在正文前展示一个顶部文档属性块
- **AND** 该属性块 SHALL 展示 front matter 中的属性名和属性值
- **AND** 预览区 SHALL NOT 将 front matter 分隔符渲染为普通水平线

#### Scenario: 正文继续按 Markdown 渲染
- **WHEN** 用户预览包含顶部 YAML front matter 的 Markdown 文件
- **AND** front matter 闭合分隔符之后存在 Markdown 正文
- **THEN** 预览区 SHALL 使用现有 Markdown/GFM 渲染能力展示正文
- **AND** 正文中的标题、列表、代码块、Mermaid 图表和任务 checkbox SHALL 保持现有行为

#### Scenario: 未闭合 front matter 不特殊处理
- **WHEN** 用户预览的 Markdown 文件第一行是 `---`
- **AND** 文件后续不存在闭合的 `---`
- **THEN** 预览区 SHALL 按现有 Markdown 渲染路径处理该文件
- **AND** 系统 SHALL NOT 展示顶部文档属性块

#### Scenario: 非顶部分隔线不识别为文档属性
- **WHEN** 用户预览的 Markdown 文件在正文中包含 `---`
- **AND** 文件第一行不是 `---`
- **THEN** 预览区 SHALL 按现有 Markdown 渲染路径处理这些分隔线
- **AND** 系统 SHALL NOT 将正文中的分隔线内容展示为顶部文档属性块

#### Scenario: 顶部文档属性不污染标题导航
- **WHEN** 用户预览包含顶部 YAML front matter 和 Markdown 标题的文件
- **THEN** Markdown 标题树 SHALL 仅反映正文中实际渲染出的 `h1` 到 `h6` 标题
- **AND** front matter 属性名 SHALL NOT 作为 Markdown 标题出现在标题树中

#### Scenario: 顶部文档属性与预览交互共存
- **WHEN** 用户预览包含顶部 YAML front matter 的 Markdown 文件
- **THEN** 预览查找、评论选区创建、评论锚点恢复、代码块复制、Mermaid 渲染和 GFM task checkbox 写回 SHALL 保持可用
- **AND** 这些交互 SHALL NOT 因顶部文档属性展示而修改源 Markdown 文件或评论持久化数据
