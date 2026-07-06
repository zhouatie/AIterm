## 1. Front Matter 解析

- [x] 1.1 为 Markdown 内容新增顶部 YAML front matter 分离逻辑，仅识别文件首行 `---` 且存在闭合 `---` 的情况。
- [x] 1.2 将分离结果建模为属性项列表、原始属性文本和正文 Markdown，保证复杂或无法结构化的 YAML 内容仍可展示。
- [x] 1.3 覆盖未闭合 front matter、非顶部 `---`、空属性块、长 description 和嵌套 metadata 等输入场景。

## 2. Markdown 预览渲染

- [x] 2.1 在 `MarkdownPreview` 中接入 front matter 分离结果，先渲染顶部文档属性块，再把正文 Markdown 交给现有 `MarkdownRenderedContent`。
- [x] 2.2 新增 `MarkdownFrontmatterPanel` 或等效内部组件，使用紧凑键值布局展示属性名和属性值，并保留无法结构化内容。
- [x] 2.3 确保 front matter 属性名不生成 Markdown heading，标题树仍只收集正文中的 `h1` 到 `h6`。

## 3. 样式与交互共存

- [x] 3.1 在 `src/index.css` 中补充顶部文档属性块样式，复用现有 light/dark 主题变量，并处理长文本换行。
- [x] 3.2 确认预览查找、评论选区创建、评论锚点恢复、代码块复制、Mermaid 渲染和 GFM task checkbox 写回不因 front matter 分离失效。
- [x] 3.3 确认展示 front matter 不触发源 Markdown 文件写入，也不改变评论持久化数据。

## 4. 验证

- [x] 4.1 使用包含 skill front matter 的 Markdown 示例验证顶部属性块展示、正文渲染和标题树行为。
- [x] 4.2 使用没有 front matter、未闭合 front matter、正文中包含 `---` 的 Markdown 示例验证回退行为。
- [x] 4.3 运行项目可用测试或针对解析逻辑新增单元验证；不主动执行 lint。
