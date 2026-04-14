## MODIFIED Requirements

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法和代码高亮。仅当选中文件的扩展名为 `.md` 时才使用此渲染模式。Markdown 预览中的 GFM 任务列表 checkbox SHALL 支持点击切换状态，并将变更写回源 Markdown 文件。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 点击任务 checkbox 勾选
- **WHEN** 用户点击 Markdown 预览中由 `- [ ]`、`* [ ]` 或 `+ [ ]` 渲染出的未完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为已完成状态 `[x]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为勾选状态

#### Scenario: 点击任务 checkbox 取消勾选
- **WHEN** 用户点击 Markdown 预览中由 `[x]` 或 `[X]` 渲染出的已完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为未完成状态 `[ ]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为未勾选状态

#### Scenario: 嵌套任务 checkbox 写回
- **WHEN** Markdown 文件包含缩进的嵌套 GFM 任务列表，且用户点击其中一个任务 checkbox
- **THEN** 系统 SHALL 按任务项在源文件中的出现顺序定位对应 marker
- **AND** 系统 SHALL 只切换该 marker 的状态，不改变该行缩进或正文内容

#### Scenario: checkbox 写回失败
- **WHEN** 用户点击任务 checkbox 但源文件写入失败
- **THEN** 系统 SHALL 保持当前预览内容与写入前一致
- **AND** 系统 SHALL 向用户展示写入失败反馈

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容

### Requirement: 文件系统 IPC 通道
主进程 SHALL 提供文件系统读取与受控写入相关的 IPC 通道，渲染进程通过 preload 暴露的 API 调用。扫描结果的每个节点 SHALL 包含修改时间信息。

#### Scenario: 读取目录内容
- **WHEN** 渲染进程调用 `fileApi.readDir(path)` 
- **THEN** 主进程 SHALL 读取指定路径的目录内容，返回条目列表（包含名称和类型信息）

#### Scenario: 按需读取树节点
- **WHEN** 渲染进程调用 `fileApi.readTreeDirectory(path)`
- **THEN** 主进程 SHALL 只读取指定目录的直接子节点，并返回包含 `name`、`path`、`isDirectory`、`mtime` 的树节点列表

#### Scenario: 读取文件内容
- **WHEN** 渲染进程调用 `fileApi.readFile(path)` 
- **THEN** 主进程 SHALL 读取指定文件的文本内容并返回

#### Scenario: 写入文件内容
- **WHEN** 渲染进程调用 `fileApi.writeFile(path, content)`
- **THEN** 主进程 SHALL 将 `content` 作为 UTF-8 文本写入指定文件，并返回成功或错误结果

#### Scenario: 文件大小限制
- **WHEN** 请求读取或写入的文件内容大小超过 1MB
- **THEN** 主进程 SHALL 返回错误提示，而非读取或写入完整内容

#### Scenario: 路径安全校验
- **WHEN** 渲染进程请求的路径包含 `..` 路径遍历
- **THEN** 主进程 SHALL 对路径做 resolve 后校验，拒绝明显的路径越界请求

#### Scenario: 扫描节点携带修改时间
- **WHEN** 主进程通过任意扫描方式（fd 或 Node.js 回退）构建文件树
- **THEN** 返回的每个 `ScanTreeNode` SHALL 包含 `mtime` 字段（Unix 毫秒时间戳），表示该文件或目录的最后修改时间
