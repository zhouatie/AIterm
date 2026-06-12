## 1. 评论数据模型与持久化 API

- [x] 1.1 定义 Markdown 预览评论数据结构，包含 `id`、`filePath`、`anchor`、`body`、`createdAt`、`updatedAt` 和未定位状态所需字段。
- [x] 1.2 在主进程新增基于项目根目录 `.aiterm/markdown-preview-comments.json` 的评论 JSON 读取/保存逻辑，按项目相对文件路径分组保存评论。
- [x] 1.3 为评论持久化增加最小结构校验、单文件评论数量限制和评论正文长度限制，避免异常数据写入。
- [x] 1.4 在 preload 暴露独立的 `markdownCommentApi.load(rootPath, filePath)` 与 `markdownCommentApi.save(rootPath, filePath, comments)`。
- [x] 1.5 更新 `src/global.d.ts` 和相关 TypeScript 类型，使 renderer 能安全调用新 API。

## 2. 评论锚点与 Range 工具

- [x] 2.1 新增 Markdown 评论锚点工具，能从 `.markdown-body` 内的 DOM `Selection` 生成 `quote`、`prefix`、`suffix`、`startTextOffset` 和 `endTextOffset`。
- [x] 2.2 实现渲染文本索引构建逻辑，遍历 Markdown 正文文本节点并跳过 input、textarea、select、script、style 等不可批注节点。
- [x] 2.3 实现锚点恢复逻辑：优先校验 offset 与 `quote`，失败后通过 `quote` + 上下文重新定位。
- [x] 2.4 实现无法恢复锚点时的未定位结果，保留评论数据但不生成正文高亮 Range。
- [x] 2.5 实现基于恢复 Range 的评论标记坐标计算，支持滚动容器内绝对定位。

## 3. MarkdownPreview 交互与视觉

- [x] 3.1 扩展 `MarkdownPreview` props，接收评论列表、当前评论 ID、选区创建回调、评论选择回调和锚点定位结果回调。
- [x] 3.2 在 Markdown 预览正文内监听文本选择完成事件，只对完全位于 `.markdown-body` 内的非空选区显示添加评论入口。
- [x] 3.3 使用 CSS Custom Highlight API 为已定位评论绘制划线或等效批注高亮，并为当前评论使用独立视觉状态。
- [x] 3.4 渲染可点击的评论标记按钮，点击后通知上层选中对应评论。
- [x] 3.5 在内容变化、评论变化、滚动和窗口尺寸变化时重新计算评论 Range 与标记位置。
- [x] 3.6 确保评论视觉不改写 `react-markdown` 输出 DOM，不破坏 GFM checkbox、代码高亮、链接、表格和图片渲染。

## 4. FilePreviewPanel 评论编排

- [x] 4.1 在 `FilePreviewPanel` 中为当前 Markdown 文件加载评论，并在切换文件、切换根目录或无选中文件时重置评论状态。
- [x] 4.2 实现创建评论流程：接收 `MarkdownPreview` 的选区锚点，打开评论输入 UI，确认后新增评论并保存。
- [x] 4.3 实现查看、编辑和删除评论流程，并在每次变更后保存到持久化 API。
- [x] 4.4 显示评论保存失败或加载失败反馈，并保留当前内存中的评论内容以便用户重试。
- [x] 4.5 在评论未定位时展示可见状态，允许用户查看、编辑或删除该评论。
- [x] 4.6 确保非 Markdown 文件继续只渲染 `CodePreview`，不加载或展示 Markdown 评论控件。

## 5. 样式与可访问性

- [x] 5.1 在 `src/index.css` 中新增评论划线、高亮、评论标记、评论输入弹层和未定位状态样式，并适配 light/dark 主题变量。
- [x] 5.2 评论标记和评论操作按钮使用明确的 button 语义、title/aria-label 和键盘 focus 样式。
- [x] 5.3 评论输入 UI 支持保存、取消、编辑和删除操作，避免遮挡查找框、标题树入口和正文主要阅读区域。
- [x] 5.4 控制评论 UI 的固定尺寸和响应式约束，确保窄预览区域内文本和按钮不溢出。

## 6. 验证与回归

- [x] 6.1 运行 `npm run lint`，修复新增 TypeScript/ESLint 问题。
- [ ] 6.2 手动验证：在 Markdown 预览中选择普通段落文本创建评论，刷新/切换文件后评论划线和标记恢复。
- [ ] 6.3 手动验证：编辑和删除评论后，评论内容、划线和标记状态立即更新并在重新打开文件后保持。
- [ ] 6.4 手动验证：修改 Markdown 正文导致锚点轻微偏移时评论能重新定位；大幅删除文本时评论显示未定位且不丢失。
- [ ] 6.5 手动验证：预览查找、标题树导航、GFM checkbox 写回和普通滚动在存在评论时仍可用。
- [ ] 6.6 手动验证：非 Markdown 文件不显示评论控件，代码预览查找和语法高亮保持现状。
