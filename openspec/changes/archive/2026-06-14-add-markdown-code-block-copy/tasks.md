## 1. Markdown 代码块复制实现

- [x] 1.1 在 `MarkdownPreview` 中增加代码块复制组件或 helper，用于从渲染后的代码块 children 提取纯代码文本并调用 `navigator.clipboard.writeText()`
- [x] 1.2 为 `ReactMarkdown` 增加自定义 `pre` renderer，只包裹 fenced code block，不改变 inline code 渲染
- [x] 1.3 为复制按钮增加局部成功反馈状态，并确保按钮点击不会触发评论选区创建或其他父级鼠标事件

## 2. 样式与交互

- [x] 2.1 在 `src/index.css` 中为 Markdown 代码块 wrapper 和复制图标按钮增加样式，保留现有代码块背景、圆角、换行和高亮效果
- [x] 2.2 确认复制按钮在浅色/深色主题下 hover、focus-visible 和成功状态清晰可见
- [x] 2.3 确认复制按钮不会把可见文字注入 Markdown 正文，避免干扰预览查找结果和代码块复制内容

## 3. 验证

- [x] 3.1 手动验证包含带语言标识 fenced code block 的 Markdown 文件：点击复制后剪贴板只包含代码正文，不包含 fence、语言标识或按钮文本
- [x] 3.2 手动验证包含缩进、空行和多行内容的代码块：复制结果保留原有换行、缩进和空行
- [x] 3.3 手动验证行内代码不显示复制控件，Markdown 代码高亮、GFM checkbox 写回、标题树导航、评论选区创建和预览查找保持可用
- [x] 3.4 运行 `npm run lint`，确认 TypeScript/ESLint 检查通过
