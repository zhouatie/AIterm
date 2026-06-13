## Context

当前 `MarkdownPreview` 通过 `getMarkdownCommentMarkerPosition(container, range)` 为评论按钮计算绝对定位。该函数取评论 Range 的第一个可见 rect，把按钮放在 `rect.right + 8px`，并用容器宽度做 clamp。选区或评论文本如果位于一行中间，按钮会落在同一行后续正文上方，造成遮挡。

评论系统已有两层 UI：

- 正文层：CSS Custom Highlight API 绘制评论划线和当前评论高亮。
- 交互层：绝对定位按钮用于添加评论或选中已有评论。

本次优化只调整交互层布局，不改变评论数据、锚点恢复或持久化 API。

## Goals / Non-Goals

**Goals:**

- 添加评论入口不遮挡选中文本或相邻正文。
- 已有评论标记位于正文排版流之外，并与评论锚点纵向对齐。
- 点击评论标记、评论列表项或等效入口时，预览区滚动到该评论锚点。
- 窄预览区域内仍能通过高亮文本和评论面板查看评论。
- 保持现有评论 CRUD、锚点恢复和持久化数据兼容。
- 保持预览查找、标题树导航、GFM checkbox 写回和普通滚动稳定。

**Non-Goals:**

- 不重新设计评论面板的信息架构。
- 不改变评论 JSON 数据结构或迁移已有评论。
- 不新增线程回复、解决状态、评论导出或协作能力。
- 不把评论写入 Markdown 源文件。

## Decisions

### 决策 1：创建入口使用 selection toolbar

**选择**：用户在 Markdown 正文内选中非空文本后，`MarkdownPreview` 显示一个小型 selection toolbar，优先浮在选区第一行上方；上方空间不足时显示在选区下方。toolbar 中提供“添加评论”按钮。

**理由**：

- 添加评论是针对当前选区的一次性操作，语义上更接近文本选择工具，而不是已有批注标记。
- toolbar 脱离正文行尾，不会覆盖选区后面的文案。
- 上/下方 fallback 可以处理选区靠近容器顶部的情况。

**替代方案**：继续把按钮放在选区右侧但增加偏移。否决原因是偏移无法保证不遮挡多行文本、窄栏和长标题，仍然依赖局部空间偶然足够。

### 决策 2：已有评论标记使用右侧 annotation gutter

**选择**：为 Markdown 预览滚动容器预留右侧 gutter，已定位评论的 icon 按 Range 首个可见 rect 的纵向位置对齐到 gutter 中。横向位置固定在 gutter 内，不再取 `rect.right`。

**理由**：

- 已有评论是阅读时的旁注入口，固定边栏比贴在正文末尾更符合批注模型。
- 纵向对齐保留“这个评论对应这里”的感知，横向固定避免遮挡正文。
- 多个评论在接近位置时可以后续叠放或聚合，本阶段至少避免侵入正文。

**替代方案**：点击高亮文本直接打开评论，不显示行旁标记。该方案最简洁，但可发现性下降；保留 gutter marker 能让用户快速扫到文档中的评论密度和位置。

### 决策 3：窄布局隐藏 gutter marker，保留等效入口

**选择**：当预览容器宽度不足以同时容纳正文和 gutter，或评论面板/查找框占用右侧空间时，隐藏 gutter marker；正文仍显示评论划线，右上角评论按钮和评论面板列表作为查看入口。

**理由**：

- 窄布局下强行显示 gutter 会重新压缩正文或遮挡工具按钮。
- 当前评论面板已经提供按评论列表查看、编辑和删除的能力，可以作为等效入口。
- 划线高亮保留了正文内的评论位置提示。

**替代方案**：在窄布局中把 marker 放到左侧。否决原因是左侧已有标题树入口，且列表缩进、引用块、任务 checkbox 容易与左侧标记冲突。

### 决策 4：坐标计算拆分为 toolbar position 和 gutter marker position

**选择**：将当前单一的 marker position 计算拆成两个用途：

- selection toolbar position：基于选区 `getBoundingClientRect()` 或首个 rect，计算容器内居中位置和上/下方 placement。
- gutter marker position：只使用 Range 的 top/height 计算纵向位置，left 固定由容器宽度、scrollbar 和 gutter 宽度决定。

**理由**：

- 创建入口和已有评论入口的空间模型不同，单一 `rect.right + 8px` 会把两类交互混在一起。
- 拆分后更容易做边界 clamp、响应式隐藏和后续聚合。

### 决策 5：不改评论持久化与锚点恢复

**选择**：保持 `MarkdownPreviewComment`、`MarkdownCommentAnchor`、IPC API 和 `.aiterm/markdown-preview-comments.json` 格式不变。

**理由**：

- 当前问题是视觉和交互位置，不是数据模型问题。
- 不迁移数据可以保证已有评论继续加载和恢复。

### 决策 6：选中评论时由 MarkdownPreview 滚动到已恢复 Range

**选择**：当用户通过 gutter marker、评论面板列表或等效入口选中一条已定位评论时，`FilePreviewPanel` 继续维护 `activeCommentId`，`MarkdownPreview` 在已恢复该评论 Range 后负责把 Range 滚动到 Markdown 预览容器可视区域内，并保留当前评论高亮状态。若评论未定位，则不滚动，只保持评论面板中的未定位反馈。

**理由**：

- `MarkdownPreview` 最接近 `.markdown-body`、滚动容器和恢复后的 DOM `Range`，可以基于实际渲染位置执行精确滚动。
- `FilePreviewPanel` 不需要理解 DOM Range，只负责选择评论和展示面板，边界更清晰。
- 对 marker、列表项和窄布局等效入口使用同一个 `activeCommentId` 路径，可以避免多处实现滚动逻辑。

**替代方案**：在 `FilePreviewPanel` 中维护每条评论的坐标并直接滚动。否决原因是上层组件拿不到可靠的渲染后 Range，容易与 Markdown 重新渲染、锚点恢复和滚动容器状态脱节。

## Risks / Trade-offs

- [Risk] selection toolbar 可能被容器顶部、查找框或评论面板遮挡 → Mitigation: 按容器可视区域 clamp，优先上方、不足时下方，并让 toolbar z-index 低于评论面板和查找框。
- [Risk] gutter 占用右侧空间导致正文可用宽度变小 → Mitigation: 使用小宽度 gutter，并只在 Markdown 模式启用；窄布局隐藏 gutter marker。
- [Risk] 多个评论锚点位置接近时 marker 重叠 → Mitigation: 本阶段允许最小纵向错位或叠放 active marker；后续可单独做聚合计数。
- [Risk] 滚动、resize、字体加载后坐标过期 → Mitigation: 沿用现有内容变化、评论变化、滚动和 resize 后重新计算逻辑，并覆盖 toolbar/gutter 两类位置。
- [Risk] 点击高亮文本作为等效入口可能需要额外 DOM 事件支持 → Mitigation: 第一阶段窄布局主要依赖右上角评论入口和评论列表，不要求 CSS Highlight 可点击。
- [Risk] 评论列表点击后立即滚动时 Range 尚未恢复或内容尚未完成渲染 → Mitigation: 将滚动逻辑放在 `MarkdownPreview` 的布局阶段，基于当前 `activeCommentId` 与恢复结果执行，并在未定位时跳过滚动。

## Migration Plan

1. 不迁移评论数据。
2. 实现新的 toolbar/gutter 坐标计算后，已有评论在重新渲染时自动使用新标记位置。
3. 若用户在窄布局中打开已有评论，继续通过评论面板列表选择评论。

## Open Questions

- 是否需要在本阶段实现相邻 marker 的聚合计数？默认不做，只保证不遮挡正文。
