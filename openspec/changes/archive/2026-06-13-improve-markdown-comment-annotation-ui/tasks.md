## 1. 坐标模型与状态拆分

- [x] 1.1 将当前评论按钮坐标模型拆分为 selection toolbar position 与 gutter marker position。
- [x] 1.2 为 selection toolbar 计算 `top`、`left` 和上/下方 placement，确保位置 clamp 在 Markdown 滚动容器可视范围内。
- [x] 1.3 为已有评论 marker 计算 gutter 内固定横向位置，只用 Range rect 决定纵向对齐。
- [x] 1.4 在滚动、窗口 resize、内容变化和评论变化时同时刷新 toolbar 与 gutter marker 坐标。

## 2. MarkdownPreview 交互调整

- [x] 2.1 将选中文本后的添加评论按钮改为 selection toolbar，不再复用已有评论 marker 样式和行尾坐标。
- [x] 2.2 点击 toolbar 的添加评论按钮后保持现有创建评论流程：传递 anchor、打开评论输入、清空选区。
- [x] 2.3 将已有评论按钮渲染到右侧 annotation gutter，点击后仍选中对应评论并打开评论面板。
- [x] 2.4 当预览宽度不足或右侧空间被评论面板占用时隐藏 gutter marker，保留评论划线和右上角评论入口。
- [x] 2.5 确保 selection toolbar 和 gutter marker 不遮挡查找框、标题树入口、评论面板和正文主要阅读内容。
- [x] 2.6 选中已定位评论时，将 Markdown 预览滚动到对应评论锚点位置；未定位评论不触发滚动。

## 3. 样式与响应式布局

- [x] 3.1 在 Markdown 预览滚动容器中预留右侧 gutter 空间，并限制 gutter 在 Markdown 模式内生效。
- [x] 3.2 新增 selection toolbar 样式，使用紧凑尺寸、明确 focus 状态和主题变量。
- [x] 3.3 调整已有评论 marker 样式，使其适配 gutter 内垂直排列和 active 状态。
- [x] 3.4 增加窄布局规则，隐藏 gutter marker 时不影响正文高亮和评论面板入口。
- [x] 3.5 检查 light/dark 主题下 toolbar、marker、划线高亮的对比度和层级。

## 4. 回归验证

- [x] 4.1 手动验证：在段落中间选择文本后，添加评论 toolbar 不遮挡选区和后续正文。
- [x] 4.2 手动验证：已有评论 marker 显示在右侧 gutter，滚动时与对应划线文本保持纵向对齐。
- [x] 4.3 手动验证：窄预览区域或评论面板打开时，正文不被 marker 遮挡，仍可通过评论入口查看评论。
- [x] 4.4 手动验证：创建、查看、编辑、删除评论后，评论数据和高亮状态保持现有行为。
- [x] 4.5 手动验证：预览查找、标题树导航、GFM checkbox 写回和普通滚动在存在评论时仍可用。
- [x] 4.6 运行项目现有校验命令，确认 TypeScript/构建不引入回归。
- [x] 4.7 手动验证：点击 gutter marker、评论列表项或等效入口后，预览区滚动到对应评论划线位置。
