## ADDED Requirements

### Requirement: Markdown 代码块一键复制
系统 SHALL 在 Markdown 文件预览中为 fenced code block 提供一键复制控件，使用户可以将代码块内容写入系统剪贴板。复制内容 SHALL 仅包含代码正文，不包含 Markdown fence、语言标识或复制控件文本。

#### Scenario: 显示代码块复制控件
- **WHEN** 用户预览的 Markdown 文件包含 fenced code block
- **THEN** 系统 SHALL 在该代码块中显示一键复制控件
- **AND** 该控件 SHALL 不改变代码块正文的高亮渲染结果

#### Scenario: 行内代码不显示复制控件
- **WHEN** 用户预览的 Markdown 文件包含行内代码
- **THEN** 系统 SHALL 使用现有行内代码样式渲染该内容
- **AND** 系统 SHALL NOT 为行内代码显示代码块复制控件

#### Scenario: 复制带语言标识的代码块
- **WHEN** Markdown 文件包含带语言标识的 fenced code block
- **AND** 用户点击该代码块的复制控件
- **THEN** 系统 SHALL 将该代码块的代码正文写入系统剪贴板
- **AND** 剪贴板内容 SHALL NOT 包含 Markdown fence 或语言标识

#### Scenario: 保留代码正文空白
- **WHEN** 代码块正文包含缩进、空行或多行内容
- **AND** 用户点击该代码块的复制控件
- **THEN** 系统 SHALL 在剪贴板内容中保留代码正文的换行、缩进和空行

#### Scenario: 复制控件不干扰 Markdown 预览交互
- **WHEN** Markdown 文件同时包含 fenced code block、GFM 任务 checkbox、标题、评论选区或预览查找匹配
- **THEN** 系统 SHALL 保持 GFM checkbox 写回、标题树导航、评论选区创建和预览查找行为可用
- **AND** 系统 SHALL NOT 因复制控件修改 Markdown 源文件或评论持久化数据
