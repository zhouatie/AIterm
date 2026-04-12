## 1. 依赖安装

- [x] 1.1 安装 `react-syntax-highlighter` 和 `@types/react-syntax-highlighter`

## 2. 文件类型工具模块

- [x] 2.1 新建 `src/utils/file-types.ts`，定义扩展名到语言名称的映射表（覆盖 JS/TS/CSS/HTML/JSON/YAML/Shell/Vue/Svelte/SQL/GraphQL/Python/Go/Rust/Java/C/C++ 等）
- [x] 2.2 导出 `getLanguageByExtension(filePath: string): string | null` 工具函数，根据文件路径提取扩展名并返回对应语言名称
- [x] 2.3 导出 `isMarkdownFile(filePath: string): boolean` 工具函数，判断文件是否为 Markdown

## 3. CodePreview 组件

- [x] 3.1 新建 `src/components/CodePreview.tsx`，接收 `content: string | null` 和 `filePath: string | null` 两个 props
- [x] 3.2 使用 `react-syntax-highlighter` 的 hljs 风格组件（从 `react-syntax-highlighter/dist/esm/light` 导入），配置 `useInlineStyles={false}` 以复用现有 `.hljs-*` 主题
- [x] 3.3 启用 `showLineNumbers` 属性显示行号，配置行号样式（浅色、不可选中）
- [x] 3.4 根据 `getLanguageByExtension` 返回值设置 `language` prop；未匹配时不指定语言（纯文本展示）
- [x] 3.5 实现占位状态：当 `content` 或 `filePath` 为 null 时显示居中提示"选择一个文件以预览"
- [x] 3.6 容器样式：全高、overflow auto 支持垂直和水平滚动、代码不自动换行

## 4. FilePreviewPanel 路由集成

- [x] 4.1 在 `FilePreviewPanel.tsx` 中导入 `CodePreview` 组件和 `isMarkdownFile` 工具函数
- [x] 4.2 修改预览区渲染逻辑：根据 `selectedFile` 的扩展名条件渲染 —— `.md` 使用 `MarkdownPreview`，其他文件使用 `CodePreview`
- [x] 4.3 更新 `MarkdownPreview` 的占位文本从"Select a Markdown file to preview" 改为"选择一个文件以预览"，与 `CodePreview` 保持一致

## 5. 验证与测试

- [x] 5.1 启动应用，切换到全部文件模式，分别点击 `.ts`、`.tsx`、`.css`、`.json`、`.html` 文件验证语法高亮正确
- [x] 5.2 验证点击 `.md` 文件仍使用 Markdown 渲染模式
- [x] 5.3 验证行号显示正确（从 1 开始、与代码行对齐、浅色不可选中）
- [x] 5.4 验证大文件的滚动和长行的水平滚动
- [x] 5.5 验证未知扩展名文件以纯文本模式正常展示
