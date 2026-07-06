## Context

当前 `MarkdownPreview` 直接把完整 Markdown 文本交给 `ReactMarkdown`，并通过自定义 components 支持标题 apply、任务 checkbox、代码块复制和 Mermaid。对于以 YAML front matter 开头的文档，`react-markdown` 会把 `---` 当作普通 Markdown thematic break 处理，夹在其中的属性行也会进入正文排版，导致 skill 文档这类顶部元数据的样式突兀且不易阅读。

本次变更只影响 Markdown 预览层的展示方式，不改变文件读取、保存、源文件格式、评论存储或 SDD 任务 apply 路由。

## Goals / Non-Goals

**Goals:**
- 识别位于文档开头、由 `---` 包裹的 YAML front matter。
- 将 front matter 渲染为独立的顶部文档属性块，避免与正文排版混在一起。
- 属性块采用紧凑、可扫描的键值展示，长值可换行并保持可读。
- front matter 之后的正文继续走现有 `ReactMarkdown`、GFM、代码块复制、Mermaid、任务 checkbox、标题树、查找和评论逻辑。
- 不改写源 Markdown 文件。

**Non-Goals:**
- 不新增 Markdown 编辑能力。
- 不实现完整 YAML schema 校验或复杂 YAML 编辑器。
- 不改变非顶部 `---` 分隔线的普通 Markdown 渲染行为。
- 不新增运行时依赖。

## Decisions

1. 在 Markdown 渲染前做轻量 front matter 分离。
   - 原因：问题只发生在文档开头的属性块，先把该片段从正文中分离，可以避免 `react-markdown` 把 `---` 渲染成横线，并保持现有 Markdown 组件映射不被污染。
   - 替代方案：引入 remark frontmatter 插件。该方案会增加依赖和 AST 处理复杂度，而本需求只需要识别顶部闭合块并展示文本属性。

2. 仅识别文件首行起始的闭合 `---` 块。
   - 原因：YAML front matter 的语义要求出现在文档开头。严格限定范围可以避免把正文中的水平线或分隔段误判为文档属性。
   - 替代方案：扫描全文任意 `---` 块。该方案容易误伤普通 Markdown 内容。

3. 属性解析采用行级键值解析，保留无法安全结构化的内容。
   - 原因：skill 文档顶部常见属性是 `name: value`、`description: value` 以及少量嵌套字段。行级解析足以提供更好的阅读样式；遇到复杂或多行 YAML 时应保持内容可见，而不是丢弃。
   - 替代方案：实现完整 YAML parser。该方案超出展示修正的范围，也会引入更大的实现和测试面。

4. 使用专用 `MarkdownFrontmatterPanel` 组件展示属性。
   - 原因：front matter 展示与 Markdown 正文渲染职责不同。单独组件可以让布局、空态、长文本换行和嵌套字段样式集中管理，避免扩大 `ReactMarkdown` components 配置。
   - 替代方案：把 front matter 转成 Markdown 表格再交给 `ReactMarkdown`。该方案仍会让属性块参与 Markdown 正文结构，且难以保证标题树、评论锚点和样式边界稳定。

5. 样式复用现有 Markdown 预览色彩变量。
   - 原因：属性块应看起来属于预览正文的一部分，但视觉上比正文更轻、更紧凑。使用现有 `--color-bg-code`、`--color-border-*`、`--color-text-*` 等变量可以兼容当前 light/dark 主题，不引入新的主题分支。
   - 替代方案：使用醒目的新配色或大卡片样式。该方案会让顶部元数据喧宾夺主，不符合文档属性的辅助信息定位。

6. 标题收集只基于正文 Markdown 渲染后的 heading。
   - 原因：front matter 属性名不是文档标题，不应出现在标题树中。分离后标题树继续查询 `.markdown-body` 内的 `h1` 到 `h6`，属性块不生成 heading。
   - 替代方案：把属性块放进 `.markdown-body` 并用 heading/definition list 语义展示。该方案可能让标题树和正文结构产生误判。

## Risks / Trade-offs

- 复杂 YAML 不能完全结构化展示 → 对无法解析成简单键值的行保留原文展示，保证信息不丢失。
- front matter 分离会改变预览 DOM 文本顺序和节点结构 → 属性块仍在正文前可见，正文内容继续走原渲染链路；评论和查找需要覆盖属性块与正文两类可见文本。
- 仅识别首行 `---` 可能不处理带 BOM 或前置空白的文件 → 实现时可先去除 UTF-8 BOM，但不把任意前置空白视作 front matter，避免误判。
- 长 description 或中文文本可能撑宽面板 → 属性值使用换行和断词规则，属性块不改变预览容器宽度。
- 嵌套 metadata 的展示可能不如完整 YAML 表格精细 → 以可读和不丢失为优先，后续如需要编辑或完整结构化再扩展。
