## Context

当前文件预览模块由 `FilePreviewPanel` 负责文件选择、读取、写回编排和预览类型路由。Markdown 文件由 `MarkdownPreview` 使用 `react-markdown + remark-gfm + rehype-highlight` 渲染，组件内部已经拥有实际滚动容器，并且现有预览查找能力也在渲染后的 DOM 上收集文本匹配和执行滚动定位。

本次需求只影响 Markdown 预览区内的文档导航，不需要新增主进程 IPC、文件读取 API 或 Markdown 编辑能力。标题树需要与用户看到的渲染结果一致，尤其要避免把代码块、普通段落或未被 `react-markdown` 识别为标题的文本误判为标题。

## Goals / Non-Goals

**Goals:**

- 在 Markdown 预览区左侧提供低占用的悬浮标题树入口。
- 用户 hover 或 focus 标题树入口后，可以展开查看当前文档的 `h1` 到 `h6` 标题结构。
- 点击标题树节点后，在当前 Markdown 预览滚动容器内定位到对应标题。
- 保持现有 Markdown 渲染、GFM checkbox 写回、预览查找和非 Markdown 文件预览行为稳定。

**Non-Goals:**

- 不为非 Markdown 代码预览增加标题/符号导航。
- 不提供 Markdown 编辑、重排、自动补全 anchor 或源文件改写能力。
- 不新增全局快捷键、持久化开关或用户配置项。
- 不要求实现当前章节滚动跟随高亮；后续可作为增强独立处理。

## Decisions

### 决策 1：从渲染后的 DOM 收集标题，而不是解析源 Markdown

**选择**：`MarkdownPreview` 在 `react-markdown` 渲染完成后，从 `.markdown-body` 内查询 `h1, h2, h3, h4, h5, h6`，生成标题列表。每个标题记录层级、文本、顺序索引和对应 DOM 元素。

**理由**：

- 与实际预览结果天然一致，避免正则解析把 fenced code block 中的 `#` 误认为标题。
- 自动覆盖 `react-markdown` 支持的标题形式，不需要额外维护一套 Markdown 解析逻辑。
- 不引入新的 Markdown AST 或 slug 依赖，改动集中且可控。

**替代方案**：基于源 Markdown 正则扫描标题。否决原因是容易误判代码块、HTML、转义文本和 CommonMark 边界情况，且会与最终渲染结果出现偏差。

### 决策 2：标题树交互内聚在 `MarkdownPreview`

**选择**：标题收集、悬浮标题树展示和点击滚动都放在 `MarkdownPreview` 内部实现。`FilePreviewPanel` 继续只负责选择文件、加载内容、查找状态和 checkbox 写回编排。

**理由**：

- `MarkdownPreview` 最接近渲染后的 heading DOM 和滚动容器，适合做 DOM 查询与滚动定位。
- 避免把标题 DOM 细节提升到 `FilePreviewPanel`，降低预览路由层复杂度。
- 与现有查找逻辑类似，都是预览组件根据当前内容在自身 DOM 范围内完成导航。

**替代方案**：在 `FilePreviewPanel` 中解析标题并传给 `MarkdownPreview`。否决原因是上层拿不到实际 heading DOM，点击跳转仍需要回传到预览组件，状态流转更绕。

### 决策 3：使用悬浮 rail + 展开面板，不改变文档排版宽度

**选择**：在 Markdown 预览滚动容器左侧显示一个窄的悬浮入口；hover 或 keyboard focus 后展开为标题树面板。浮层使用绝对定位或 sticky 视觉，不参与 Markdown 正文布局，不改变正文宽度和换行。

**理由**：

- 满足“预览区域左侧一个悬浮、鼠标移动上去后拉出”的交互预期。
- 避免长文档因为标题树出现/消失而发生正文重排。
- 适合文件树可能收起后的窄预览区域，默认只占很小视觉空间。

**替代方案**：固定占位侧栏。否决原因是会持续占用预览宽度，且与已有文件树/预览内部分栏形成重复侧栏。

## Risks / Trade-offs

- [Risk] React render 后立即查询 DOM 时标题列表可能短暂为空 → 在 `content` 或 `filePath` 变化后通过 layout/effect 阶段收集，并在无标题时隐藏入口。
- [Risk] 标题文本很长导致浮层溢出或遮挡正文过多 → 标题项单行省略，面板设置最大宽度和最大高度，内部独立滚动。
- [Risk] 标题点击与预览查找滚动同时发生时互相覆盖 → 点击标题只执行一次显式滚动；查找仍由查找状态变化驱动，互不共享状态。
- [Risk] DOM 查询带来额外开销 → 查询范围限定在当前 Markdown 预览根节点内，且仅在内容变化后执行；标题数量通常远小于正文节点数量。
- [Trade-off] 不做当前章节高亮会降低导航反馈 → 先满足结构浏览和点击定位，后续如需要可通过滚动监听或 IntersectionObserver 增强。
