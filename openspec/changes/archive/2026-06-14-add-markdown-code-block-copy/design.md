## Context

当前 `MarkdownPreview` 使用 `react-markdown` 渲染 `.md` 文件，配合 `remark-gfm` 支持 GFM，并通过 `rehype-highlight` 为 fenced code block 输出 highlight.js 类名。组件目前只自定义了 GFM checkbox 渲染，代码块由默认 `<pre><code>` 结构输出，样式由 `src/index.css` 中的 `.markdown-body pre` 和 `.markdown-body pre code` 控制。

这次变更只面向 Markdown 文件预览中的 fenced code block。终端里的 agent 输出、非 Markdown 代码文件预览和 Markdown inline code 都不在范围内。

## Goals / Non-Goals

**Goals:**

- 在 Markdown 文件预览的 fenced code block 上提供一键复制按钮。
- 复制代码块正文，保留代码内部换行和缩进，不包含 fence、语言标识或按钮文本。
- 保持现有 Markdown 代码高亮、GFM checkbox 写回、标题树导航、评论选区和预览查找稳定。
- 按现有 UI 风格使用图标按钮，并提供 hover/focus 可见状态和无障碍标签。

**Non-Goals:**

- 不支持终端 xterm 输出中的 ``` 代码块复制。
- 不为 `CodePreview` 的整文件代码预览增加复制按钮。
- 不新增主进程 IPC、preload API 或第三方依赖。
- 不改变 Markdown 源文件内容或评论持久化数据。

## Decisions

### Decision 1: 在 `ReactMarkdown` 的 `pre` 渲染入口包裹代码块

选择：为 `MarkdownPreview` 增加自定义 `pre` renderer，将默认代码块包裹为带复制按钮的容器，并继续渲染原始 `pre` children。

理由：fenced code block 最终对应块级 `pre`，在这里包裹可以避免影响 inline code，也能保留 `rehype-highlight` 生成的 token 结构和样式类名。按钮在 wrapper 内绝对定位，不参与代码文本布局。

替代方案：自定义 `code` renderer。否决原因是 `code` 同时覆盖 inline code 和 block code，需要额外区分上下文，且更容易干扰现有 inline code 样式。

### Decision 2: 从渲染节点提取代码文本并写入 Clipboard API

选择：复制按钮点击时，从当前代码块渲染节点递归提取文本内容，调用 `navigator.clipboard.writeText()` 写入剪贴板。

理由：`rehype-highlight` 会把代码拆成多个高亮 token，递归提取 React children 可以获得用户看到的代码文本，同时不需要重新解析 Markdown 源文本，也不会改变文件读取链路。复制内容应保持代码内部空白，不做 trim。

替代方案：基于源 Markdown 正则解析 fenced block。否决原因是 CommonMark fence 边界、缩进、反引号长度和语言标识规则容易处理不完整，并且会与最终渲染结果产生偏差。

### Decision 3: 复制按钮使用局部交互状态

选择：每个代码块按钮内部维护短暂的复制成功状态，成功后将图标或 tooltip 文案切换为“已复制”，随后自动恢复。

理由：反馈只和当前代码块相关，不需要提升到 `MarkdownPreview` 全局状态。局部状态可以避免文件切换、查找高亮或评论布局更新时引入额外耦合。

替代方案：不提供成功反馈。否决原因是剪贴板操作没有可见结果，用户难以判断点击是否生效。

## Risks / Trade-offs

- [Risk] 自定义 `pre` wrapper 可能改变代码块滚动、换行或右侧评论 gutter 的视觉关系。→ Mitigation：CSS 保持原有 `pre` padding、背景、圆角和 `white-space` 规则，只增加外层定位容器和按钮避让空间。
- [Risk] 复制按钮文本或图标被预览查找计入搜索匹配。→ Mitigation：按钮使用 `aria-label` / `title` 和图标，不在可见正文中渲染额外文字；必要时在查找扫描中忽略复制控件。
- [Risk] 代码块内创建评论选区时误点复制按钮。→ Mitigation：按钮只位于代码块右上角，并阻止按钮点击冒泡；正文区域仍可正常选择。
- [Risk] Clipboard API 写入失败时用户无反馈。→ Mitigation：失败时不改变文件或预览内容；实现可保留当前项目已有的静默失败策略，或在按钮状态中短暂显示失败样式。
