## 1. 标题树命中区域实现

- [x] 1.1 检查 `MarkdownPreview` 当前标题树 DOM 结构、`outlineExpanded` 状态和 hover/focus 事件绑定，确认收起态父容器尺寸和隐藏 panel 命中来源
- [x] 1.2 调整 `MarkdownPreview` 标题树容器的展开/收起尺寸或状态 class，使收起态容器实际命中区域只覆盖可见 rail 入口
- [x] 1.3 保持展开态鼠标位于 rail 或标题树 panel 上时面板不收起，并确保从 rail 移动到 panel 不出现闪烁
- [x] 1.4 保持键盘 focus 展开标题树、标题项可聚焦、失焦到标题树外部后收起的行为

## 2. 样式与布局调整

- [x] 2.1 更新 `.markdown-heading-outline`、`.markdown-heading-outline-rail` 和 `.markdown-heading-outline-panel` 样式，使隐藏 panel 不再撑高收起态父容器或接收 pointer 事件
- [x] 2.2 保持展开 panel 的最大宽度、高度、滚动和层级样式稳定，避免窄预览区溢出或遮挡关键控件
- [x] 2.3 确认标题树浮层仍不改变 Markdown 正文布局宽度、正文换行和滚动容器 padding

## 3. 验证

- [x] 3.1 手动验证包含多个标题的 Markdown 文件：收起态鼠标经过入口外的左侧正文区域不会弹出标题树
- [x] 3.2 手动验证鼠标 hover 可见入口会展开标题树，移动到展开 panel 后标题项可点击并能滚动到对应标题
- [x] 3.3 手动验证键盘 focus 标题树入口可展开面板，标题项保持可聚焦
- [x] 3.4 手动验证选中文本、评论 selection toolbar、评论标记和预览查找不会被标题树触发区域回归影响
- [x] 3.5 运行项目现有静态检查或类型检查，确认改动没有引入 TypeScript 或样式构建错误
