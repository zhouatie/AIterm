## Why

当前文件预览面板仅支持渲染 Markdown 文件，但在全部文件模式下点击源代码文件（如 `.ts`、`.tsx`、`.css`、`.json` 等）时，内容被当作 Markdown 错误渲染，完全不可读。项目已经依赖了 `highlight.js`，具备语法高亮的基础设施，需要扩展预览能力以支持前端开发常见的代码文件类型，提供带语法高亮的代码预览。

## What Changes

- 新增代码文件预览组件，使用 `react-syntax-highlighter`（基于 highlight.js 引擎）对源代码文件进行语法高亮渲染
- 在 `FilePreviewPanel` 中根据文件扩展名自动路由到对应的预览组件（Markdown 预览 或 代码预览）
- 支持的文件类型包括：`.js`、`.jsx`、`.ts`、`.tsx`、`.css`、`.scss`、`.less`、`.html`、`.json`、`.yaml`/`.yml`、`.vue`、`.svelte`、`.sh`、`.bash`、`.xml`、`.sql`、`.graphql`、`.toml` 等前端开发常见文件
- 代码预览组件提供行号显示（react-syntax-highlighter 内置支持）
- 对于无法识别的文本文件，以纯文本模式展示

## Capabilities

### New Capabilities
- `code-file-preview`: 代码文件语法高亮预览能力，包括文件类型检测、语法高亮渲染、行号显示和纯文本回退

### Modified Capabilities
- `file-preview`: 预览区不再只支持 Markdown，需根据文件扩展名路由到不同预览组件（Markdown 预览或代码预览）

## Impact

- **组件变更**：`FilePreviewPanel.tsx` 需增加文件类型判断和预览路由逻辑；新增 `CodePreview` 组件
- **样式变更**：`index.css` 需新增代码预览区域的样式（行号、容器布局）
- **依赖**：新增 `react-syntax-highlighter`（及其类型包 `@types/react-syntax-highlighter`），内部基于项目已有的 `highlight.js` 引擎
- **IPC 层**：无变更，现有 `fs:readfile` 已支持读取任意文本文件
