## ADDED Requirements

### Requirement: Milkdown 所见即所得编辑
笔记编辑器 SHALL 使用 Milkdown（@milkdown/kit + @milkdown/react）提供所见即所得的 Markdown 编辑体验，用户输入的 Markdown 语法 SHALL 实时渲染为格式化内容。

#### Scenario: 加载笔记内容
- **WHEN** 用户打开一个笔记文件
- **THEN** 编辑器 SHALL 读取 .md 文件的原始 Markdown 内容并以所见即所得形式渲染
- **THEN** 编辑器 SHALL 支持 CommonMark 和 GFM 语法（标题、列表、代码块、引用、表格、任务列表、删除线）

#### Scenario: 编辑内容
- **WHEN** 用户在编辑器中修改内容
- **THEN** 编辑器 SHALL 实时更新渲染效果
- **THEN** 编辑器 SHALL 通过回调输出标准 Markdown 字符串

#### Scenario: 撤销与重做
- **WHEN** 用户按下 `Cmd+Z` 或 `Cmd+Shift+Z`
- **THEN** 编辑器 SHALL 执行撤销或重做操作

### Requirement: 编辑器主题适配
编辑器 SHALL 适配应用的 light/dark/system 三种主题模式，视觉上与应用其他部分保持一致。

#### Scenario: 跟随应用主题切换
- **WHEN** 用户切换应用主题（浅色/深色/跟随系统）
- **THEN** 编辑器的背景色、文字色、代码块样式、引用块样式 SHALL 随主题变化
- **THEN** 编辑器 SHALL 使用应用现有的 CSS variables（如 `--color-bg-primary`、`--color-text-primary`）

#### Scenario: Headless 模式样式控制
- **WHEN** 编辑器初始化
- **THEN** 系统 SHALL 不使用 Milkdown 预设主题包
- **THEN** 编辑器内元素的样式 SHALL 通过 `.milkdown` 作用域 CSS 自定义实现

### Requirement: 编辑器内容变更通知
编辑器 SHALL 在内容变更时通过回调通知外部，以触发自动保存流程。

#### Scenario: 内容变更回调
- **WHEN** 用户在编辑器中修改任何内容（打字、删除、粘贴、格式变更等）
- **THEN** 编辑器 SHALL 通过 `markdownUpdated` 回调将最新的 Markdown 字符串传递给外部
