## MODIFIED Requirements

### Requirement: Markdown 所见即所得编辑
笔记编辑器 SHALL 使用 Vditor 提供所见即所得的 Markdown 编辑体验，用户输入的 Markdown 语法 SHALL 实时渲染为格式化内容。标准 GFM 任务列表语法在编辑器中 SHALL 呈现为可见的 checkbox 任务项，而不是仅显示原始标记文本。

#### Scenario: 加载笔记内容
- **WHEN** 用户打开一个笔记文件
- **THEN** 编辑器 SHALL 读取 .md 文件的原始 Markdown 内容并以所见即所得形式渲染
- **THEN** 编辑器 SHALL 支持 CommonMark 和 GFM 语法（标题、列表、代码块、引用、表格、任务列表、删除线）
- **THEN** 源内容中由 `- [ ]`、`* [ ]`、`+ [ ]`、`- [x]`、`- [X]` 等标准 GFM 任务列表标记表示的任务项 SHALL 渲染为带 checkbox 的可见任务列表样式

#### Scenario: 编辑内容
- **WHEN** 用户在编辑器中修改内容
- **THEN** 编辑器 SHALL 实时更新渲染效果
- **THEN** 编辑器 SHALL 通过回调输出标准 Markdown 字符串

#### Scenario: 输入未完成任务项
- **WHEN** 用户在新行输入 `- [ ] `、`* [ ] ` 或 `+ [ ] `
- **THEN** 编辑器 SHALL 将该行渲染为带未勾选 checkbox 的任务项
- **THEN** 用户继续输入的文本 SHALL 作为该任务项内容显示在 checkbox 后方

#### Scenario: 输入已完成任务项
- **WHEN** 用户在新行输入 `- [x] `、`* [x] `、`+ [x] `、`- [X] `、`* [X] ` 或 `+ [X] `
- **THEN** 编辑器 SHALL 将该行渲染为带已勾选 checkbox 的任务项
- **THEN** 该任务项 SHALL 继续保持任务列表语义，而不是退回为普通段落文本

#### Scenario: 撤销与重做
- **WHEN** 用户按下 `Cmd+Z` 或 `Cmd+Shift+Z`
- **THEN** 编辑器 SHALL 执行撤销或重做操作
