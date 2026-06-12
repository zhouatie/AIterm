## Context

当前文件预览模块由 `FilePreviewPanel` 负责文件选择、内容读取、预览路由、查找状态和 Markdown checkbox 写回编排。Markdown 文件由 `MarkdownPreview` 使用 `react-markdown + remark-gfm + rehype-highlight` 渲染；组件内部已经基于渲染后的 DOM 收集标题，并通过 CSS Custom Highlight API 对预览查找结果做高亮和滚动定位。

划线评论需要同时处理渲染层选区、评论 UI、持久化和锚点恢复。浏览器 `Range` 只能在当前 DOM 生命周期内使用，不能直接保存；Markdown 重新渲染、文件切换或应用重启后必须把评论锚点从持久化数据恢复为新的 DOM `Range`。

## Goals / Non-Goals

**Goals:**

- 支持用户在 Markdown 预览正文中选择文本并创建评论。
- 在已评论文本上显示划线或等效批注高亮，并提供可点击的评论标记。
- 支持查看、编辑、删除当前文件评论。
- 将评论保存到当前项目根目录的 `.aiterm/markdown-preview-comments.json`，应用重启或文件重新打开后恢复。
- 在文件内容轻微变化后尽量通过文本 quote 和上下文重新定位评论；无法定位时保留评论并展示未定位状态。
- 保持现有 Markdown 渲染、标题树导航、预览查找、GFM checkbox 写回和非 Markdown 代码预览稳定。

**Non-Goals:**

- 不把评论写入源 Markdown 正文，也不引入 Markdown 内联批注语法。
- 不实现多人协作、云同步、线程回复、解决状态工作流或评论导出。
- 不为非 Markdown 代码预览增加评论能力。
- 不引入完整 Markdown 编辑器或 ProseMirror/Milkdown 等编辑器依赖。
- 不保证在正文大幅重写后自动无损迁移所有评论锚点。

## Decisions

### 决策 1：评论作为项目旁路数据保存，不写入 Markdown 源文件

**选择**：新增独立的评论持久化通道，把评论数据保存到当前项目根目录的 `.aiterm/markdown-preview-comments.json`。数据按项目相对文件路径分组，源 Markdown 文件不被评论功能改写。若项目目录不可写或保存失败，系统只展示错误反馈，不 fallback 到 Electron `userData`。

**理由**：

- 划线评论属于阅读批注，不应污染项目源文件或改变 git diff。
- 当前预览模块已经有 checkbox 写回能力，但那是用户显式修改 Markdown 任务状态；评论是附加元数据，语义不同。
- 项目旁路 JSON 让评论跟随项目目录迁移，避免 AIterm 卸载或应用数据清理导致评论丢失。
- 相对路径索引可以降低项目根目录移动后评论失效的概率。
- JSON 存储足够覆盖个人阅读批注场景，避免新增数据库或外部依赖。

**替代方案**：把评论写成 Markdown HTML comment 或自定义语法。否决原因是会修改用户文档、影响跨工具兼容性，并且容易和 Markdown 格式化工具产生冲突。

**替代方案**：保存到 Electron `userData`。否决原因是评论与项目内容强绑定，应用卸载、数据清理或未来应用数据膨胀都会提高数据丢失和管理成本。

### 决策 2：状态边界沿用现有预览分层

**选择**：`FilePreviewPanel` 持有当前文件的评论列表、加载/保存状态、选中评论和错误反馈；`MarkdownPreview` 负责文本选区捕获、锚点恢复为 DOM `Range`、划线视觉和标记定位；主进程/preload 只提供受控读取和保存评论数据的 API。

**理由**：

- `FilePreviewPanel` 已拥有 `selectedFile`、`fileContent` 和文件切换生命周期，适合决定何时加载、清空或保存评论。
- `MarkdownPreview` 最接近 `.markdown-body`、滚动容器和渲染后文本节点，适合处理 DOM `Selection`、`Range` 和坐标。
- 主进程不需要理解 Markdown AST 或 DOM，只负责持久化 JSON，安全边界清晰。

**替代方案**：让 `MarkdownPreview` 直接调用 IPC 保存评论。否决原因是会让渲染组件耦合持久化细节，不利于文件切换、错误反馈和后续复用。

### 决策 3：锚点保存渲染文本位置与文本上下文，而不是 DOM Range

**选择**：创建评论时，将当前选区转换为当前 `.markdown-body` 的渲染文本偏移，并保存：

- `quote`：用户实际选中的渲染文本。
- `prefix` / `suffix`：选区前后固定长度的上下文文本。
- `startTextOffset` / `endTextOffset`：在当前渲染文本流中的偏移。
- 可选的 `sourcePosition`：如果 `react-markdown` 传入的 hast node position 在实现中可靠，可作为调试或增强信息，但不是唯一锚点。

重新渲染时先检查 offset 位置是否仍匹配 `quote`；不匹配时在渲染文本中按 `quote + prefix/suffix` 进行重新定位；仍失败则标记为未定位。

**理由**：

- DOM `Range`、文本节点引用和元素坐标在 React 重新渲染后都会失效。
- 仅保存 offset 对文件轻微插入/删除很脆弱，增加 quote 和上下文可以恢复更多常见修改。
- 基于渲染文本与用户看到的内容一致，避免 Markdown 源语法、GFM 表格、链接文本和代码高亮 token 拆分带来的偏差。

**替代方案**：只保存 Markdown 源文件行列。否决原因是预览选区对应的是渲染文本，链接、强调、表格、HTML 和代码高亮会让源位置与可见文本不完全等价。

### 决策 4：CSS Highlight 负责划线视觉，DOM 标记负责交互

**选择**：复用 CSS Custom Highlight API 为所有已定位评论 Range 绘制划线或淡色批注高亮；另行渲染绝对定位的评论标记按钮，基于 Range 的 `getClientRects()` 贴近选区首行或右侧边缘。点击标记或评论列表项打开评论详情/编辑弹层。

**理由**：

- CSS Highlight 不改写 Markdown DOM，能避免破坏 `react-markdown` 输出、GFM checkbox 和代码高亮结构。
- CSS Highlight 本身不是可点击元素；使用独立 DOM 标记可以提供可访问的按钮、focus 状态和 tooltip。
- 现有预览查找已经使用 CSS Highlight，项目对这类视觉层有基础样式和兼容经验。

**替代方案**：把被评论文本包成 `<mark>` 或 `<span>`。否决原因是需要改造 Markdown 渲染树或后处理 DOM，容易影响现有交互和 React 渲染稳定性。

### 决策 5：新增独立 preload API，而不是复用源文件写入 API

**选择**：新增类似 `markdownCommentApi.load(rootPath, filePath)`、`markdownCommentApi.save(rootPath, filePath, comments)` 的 preload API，并在 `global.d.ts` 中声明。主进程读取/写入项目根目录下的 `.aiterm/markdown-preview-comments.json`，保存时校验文件位于项目根目录内，将文件路径规范化为项目相对路径，对 JSON 结构做最小校验，并限制单文件评论数量和正文长度以避免异常数据膨胀。

**理由**：

- 评论数据不是源文件内容，独立 API 可以避免与 `fileApi.writeFile` 语义混淆。
- `tabStateApi` 已经说明 renderer `localStorage` 在 Electron 退出时并不总是可靠；评论数据应使用主进程文件持久化。
- 将限制和结构校验放在 IPC 边界可以降低渲染进程传入异常数据导致的持久化问题。

**替代方案**：使用 renderer `localStorage`。否决原因是评论属于用户数据，可靠性要求高于普通 UI 偏好，而且当前代码已经对 Electron localStorage 的落盘可靠性有保守判断。

## Risks / Trade-offs

- [Risk] 评论锚点在文档大幅修改后无法恢复 → 保留评论数据并显示未定位状态，不静默删除。
- [Risk] CSS Highlight 和查找高亮视觉冲突 → 使用独立 highlight 名称和更低视觉强度；当前评论可使用更明显的标记而不是覆盖查找当前项。
- [Risk] Range 坐标在滚动、窗口缩放或字体加载后变化 → 在内容变化、评论变化、滚动容器滚动和窗口 resize 后重新计算评论标记位置。
- [Risk] 用户选择跨越复杂块元素的文本 → 允许同一 `.markdown-body` 内的跨元素文本选区，但拒绝空选区、跨出 Markdown 根节点的选区和只包含空白的选区。
- [Risk] 评论保存失败造成 UI 与磁盘不一致 → 保存失败时保留内存状态但显示错误反馈，并允许用户重试；切换文件前应完成或明确处理待保存状态。
- [Trade-off] 项目旁路文件可能被误提交 → 使用 `.aiterm/` 目录明确标识应用数据，是否通过项目或全局 gitignore 忽略由用户控制。

## Migration Plan

这是新增能力，不需要迁移既有数据。首次加载评论时如果项目根目录下的 `.aiterm/markdown-preview-comments.json` 不存在，主进程返回空评论集合。若持久化 JSON 解析失败，系统应返回错误并避免覆盖原文件，用户仍可继续阅读 Markdown。

## Open Questions

- 暂无阻塞实现的问题。第一版默认采用项目根目录旁路文件持久化；是否提交或忽略 `.aiterm/` 由用户通过仓库或全局 gitignore 决定。
