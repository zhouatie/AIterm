# Capability: file-preview

## Purpose
文件预览系统，包含文件树浏览、Markdown 渲染、工作目录同步和文件系统 IPC 通道。

## Requirements

### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 读取根目录内容并以缩进树形结构展示，目录在前、文件在后，按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 展开并懒加载其子目录内容；若为展开状态，SHALL 折叠隐藏子节点

#### Scenario: 默认过滤 Markdown 文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 只显示 `.md` 文件和包含 `.md` 文件（或包含子目录）的目录，隐藏其他文件类型

#### Scenario: 选中文件高亮
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮状态，且触发 Markdown 预览加载

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法和代码高亮。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个 Markdown 文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容

### Requirement: 文件预览面板布局
文件预览面板内部 SHALL 采用上下布局，上方为文件树，下方为 Markdown 预览区。

#### Scenario: 上下分区
- **WHEN** 文件预览面板渲染时
- **THEN** 上方 SHALL 显示文件树区域，下方 SHALL 显示 Markdown 预览区域，预览区占据剩余空间

#### Scenario: 面板标题
- **WHEN** 文件预览面板渲染时
- **THEN** 文件树区域顶部 SHALL 显示当前根目录路径作为标题

### Requirement: 工作目录同步
文件树的根目录 SHALL 与右侧当前激活终端 Tab 的工作目录保持一致。

#### Scenario: 初始同步
- **WHEN** 文件预览面板首次加载
- **THEN** 文件树根目录 SHALL 设置为当前激活终端 Tab 的初始工作目录

#### Scenario: 切换终端 Tab 时同步
- **WHEN** 用户在右侧切换到另一个终端 Tab
- **THEN** 文件树根目录 SHALL 更新为新激活终端 Tab 的工作目录

### Requirement: 文件系统 IPC 通道
主进程 SHALL 提供文件系统读取相关的 IPC 通道，渲染进程通过 preload 暴露的 API 调用。

#### Scenario: 读取目录内容
- **WHEN** 渲染进程调用 `fileApi.readDir(path)` 
- **THEN** 主进程 SHALL 读取指定路径的目录内容，返回条目列表（包含名称和类型信息）

#### Scenario: 读取文件内容
- **WHEN** 渲染进程调用 `fileApi.readFile(path)` 
- **THEN** 主进程 SHALL 读取指定文件的文本内容并返回

#### Scenario: 文件大小限制
- **WHEN** 请求读取的文件大小超过 1MB
- **THEN** 主进程 SHALL 返回错误提示，而非加载完整内容

#### Scenario: 路径安全校验
- **WHEN** 渲染进程请求的路径包含 `..` 路径遍历
- **THEN** 主进程 SHALL 对路径做 resolve 后校验，拒绝明显的路径越界请求
