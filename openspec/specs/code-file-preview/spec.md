# code-file-preview Specification

## Purpose
TBD - created by archiving change add-code-file-preview. Update Purpose after archive.
## Requirements
### Requirement: 代码文件语法高亮渲染
系统 SHALL 提供一个 `CodePreview` 组件，使用 `react-syntax-highlighter` 对源代码文件内容进行语法高亮渲染并展示。

#### Scenario: 已知语言的代码文件高亮
- **WHEN** 用户选中一个扩展名在支持列表中的文件（如 `.ts`、`.tsx`、`.js`、`.jsx`、`.css`、`.json`、`.html` 等）
- **THEN** 系统 SHALL 根据扩展名确定语言，使用 `react-syntax-highlighter` 的指定语言模式进行语法高亮渲染

#### Scenario: 未知扩展名的文本文件
- **WHEN** 用户选中一个扩展名不在支持列表中的文本文件
- **THEN** 系统 SHALL 以纯文本模式展示文件内容，不进行语法高亮

#### Scenario: 高亮渲染使用 CSS 类名模式
- **WHEN** `react-syntax-highlighter` 渲染代码高亮
- **THEN** 系统 SHALL 使用 `useInlineStyles={false}` 模式输出 CSS 类名（`.hljs-*`），复用项目已有的 highlight.js 主题样式

### Requirement: 代码行号显示
代码预览组件 SHALL 在代码左侧显示行号，行号与代码行一一对应。

#### Scenario: 行号渲染
- **WHEN** 代码文件内容被加载并渲染
- **THEN** 系统 SHALL 通过 `react-syntax-highlighter` 的 `showLineNumbers` 属性在每行代码左侧显示从 1 开始递增的行号

#### Scenario: 行号与代码对齐
- **WHEN** 代码中存在长行导致换行显示
- **THEN** 行号 SHALL 与对应代码行的首行保持垂直对齐

#### Scenario: 行号样式
- **WHEN** 行号显示时
- **THEN** 行号 SHALL 使用较浅的颜色（与代码内容区分）、不可选中（`user-select: none`）

### Requirement: 代码预览区滚动
代码预览组件 SHALL 支持大文件内容的滚动浏览。

#### Scenario: 垂直滚动
- **WHEN** 代码内容高度超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整代码

#### Scenario: 水平滚动
- **WHEN** 代码行宽度超过预览区可视宽度
- **THEN** 预览区 SHALL 支持水平滚动查看完整行内容，不自动换行

### Requirement: 支持的文件类型列表
系统 SHALL 维护一个文件扩展名到语言名称的映射表，覆盖前端开发常见文件类型。

#### Scenario: JavaScript 及变体
- **WHEN** 用户选中 `.js`、`.jsx`、`.mjs`、`.cjs` 文件
- **THEN** 系统 SHALL 以 JavaScript 语言模式进行高亮

#### Scenario: TypeScript 及变体
- **WHEN** 用户选中 `.ts`、`.tsx`、`.mts`、`.cts` 文件
- **THEN** 系统 SHALL 以 TypeScript 语言模式进行高亮

#### Scenario: 样式文件
- **WHEN** 用户选中 `.css`、`.scss`、`.less` 文件
- **THEN** 系统 SHALL 以对应的样式语言模式进行高亮

#### Scenario: 标记语言文件
- **WHEN** 用户选中 `.html`、`.xml`、`.svg` 文件
- **THEN** 系统 SHALL 以 XML/HTML 语言模式进行高亮

#### Scenario: 数据格式文件
- **WHEN** 用户选中 `.json`、`.yaml`、`.yml`、`.toml` 文件
- **THEN** 系统 SHALL 以对应的数据格式语言模式进行高亮

#### Scenario: Shell 脚本
- **WHEN** 用户选中 `.sh`、`.bash`、`.zsh` 文件
- **THEN** 系统 SHALL 以 Bash/Shell 语言模式进行高亮

#### Scenario: 其他支持类型
- **WHEN** 用户选中 `.vue`、`.svelte`、`.sql`、`.graphql`、`.gql`、`.py`、`.rb`、`.go`、`.rs`、`.java`、`.kt`、`.swift`、`.c`、`.cpp`、`.h` 文件
- **THEN** 系统 SHALL 以对应的语言模式进行高亮

### Requirement: 代码预览占位状态
当未选中任何文件时，代码预览区 SHALL 显示引导性占位提示。

#### Scenario: 未选中文件
- **WHEN** 预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示居中的占位提示文本（如"选择一个文件以预览"）

