## Context

当前应用的文件预览面板（左栏右侧区域）仅包含一个 `MarkdownPreview` 组件，所有选中的文件内容都传递给 `react-markdown` 渲染。在全部文件模式下点击非 Markdown 文件时，源代码被错误地当作 Markdown 解析，输出混乱不可读。

项目已有 `highlight.js` v11.11.1 依赖（被 `rehype-highlight` 间接使用）。IPC 层的 `fs:readfile` 已支持读取任意文本文件（最大 1MB、UTF-8），无需后端改动。

## Goals / Non-Goals

**Goals:**
- 为前端开发常见的代码文件类型提供带语法高亮的预览
- 根据文件扩展名自动路由到正确的预览组件（Markdown 或 代码）
- 提供行号显示，方便定位代码位置
- 无法识别的文本文件以纯文本模式展示，确保所有文本文件都能正常阅读

**Non-Goals:**
- 不支持二进制文件预览（图片、PDF、音视频等）
- 不提供代码编辑功能（只读预览）
- 不添加代码折叠、搜索等高级 IDE 功能

## Decisions

### 1. 使用 `react-syntax-highlighter` 而非手写 highlight.js

**选择**：使用 `react-syntax-highlighter` 库，配合其 hljs（highlight.js）引擎模式。

**理由**：
- 行号显示、主题切换、语言检测开箱即用，无需手动实现 table 布局和 CSS
- 不需要 `dangerouslySetInnerHTML`，通过 React 渲染树输出，更安全
- 内部使用 `lowlight`（highlight.js 的 AST 封装），与项目现有 `highlight.js` 依赖和 `.hljs-*` 主题样式兼容
- npm 周下载量 ~4M，社区成熟、边界场景（特殊字符转义、超长行、大文件）经过充分验证

**替代方案**：
- 手写 highlight.js + table 行号布局 —— 否决，需要处理 `dangerouslySetInnerHTML`、行号对齐、特殊字符转义等边界场景
- Shiki —— 否决，WASM 加载、需自行实现行号、与现有 hljs 主题不兼容
- CodeMirror —— 否决，编辑器级别组件对只读预览过重

### 2. 使用 hljs 引擎而非 Prism 引擎

**选择**：从 `react-syntax-highlighter/dist/esm/styles/hljs` 导入样式，使用 hljs 风格组件。

**理由**：项目已有 `highlight.js` 和 `.hljs-*` 主题 CSS，使用 hljs 引擎可复用现有主题，保持与 Markdown 代码块高亮的视觉一致性。

**替代方案**：Prism 引擎 —— 否决，需引入新的 Prism 主题样式，与现有 `.hljs-*` 不兼容。

### 3. 使用 CSS 类名模式而非内联样式

**选择**：使用 `react-syntax-highlighter` 的 `useInlineStyles={false}` 模式，让高亮 token 输出 CSS 类名（`.hljs-keyword` 等）。

**理由**：项目 `index.css` 中已有完整的 `.hljs-*` 主题定义，使用类名模式可直接复用，无需引入额外的 JS 样式对象，保持与 Markdown 代码块的视觉一致性。

### 4. 新建 `CodePreview` 组件 vs. 扩展 `MarkdownPreview`

**选择**：新建独立的 `CodePreview` 组件。

**理由**：Markdown 渲染（react-markdown + remark/rehype 插件）和代码高亮渲染（react-syntax-highlighter）是完全不同的渲染管线。独立组件职责清晰，便于各自维护。

### 5. 文件类型路由放在 `FilePreviewPanel` 中

**选择**：在 `FilePreviewPanel` 中基于 `selectedFile` 的扩展名决定渲染 `MarkdownPreview` 或 `CodePreview`。

**理由**：`FilePreviewPanel` 已经是预览区域的编排组件，在此处增加类型路由是最小侵入的方式。

### 6. 语言检测策略：扩展名映射优先 + 纯文本兜底

**选择**：维护一个扩展名到 highlight.js 语言名的映射表。匹配到则指定语言高亮；未匹配到则以纯文本展示。

**理由**：扩展名映射准确率最高且性能最好。兜底策略确保所有文本文件都可查看。

## Risks / Trade-offs

- **[新增依赖]** → `react-syntax-highlighter` 是唯一新增的运行时依赖，体量适中（~200KB gzipped），对 Electron 应用影响可忽略
- **[大文件性能]** → react-syntax-highlighter 对大文件（>10000 行）高亮可能卡顿。现有 `fs:readfile` 已有 1MB 限制，可作为初步保护
- **[扩展名映射维护]** → 新文件类型需手动添加映射。风险低，前端常见类型有限且稳定
