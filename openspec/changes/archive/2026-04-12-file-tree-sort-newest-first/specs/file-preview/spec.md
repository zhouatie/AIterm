## MODIFIED Requirements

### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 读取根目录内容并以缩进树形结构展示，目录在前、文件在后，同组内按修改时间倒序排列（最近修改的排在最上面），修改时间相同时按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 展开并懒加载其子目录内容；若为展开状态，SHALL 折叠隐藏子节点

#### Scenario: 默认过滤 Markdown 文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 只显示 `.md` 文件和包含 `.md` 文件（或包含子目录）的目录，隐藏其他文件类型

#### Scenario: 选中文件高亮
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮状态，高亮颜色 SHALL 使用主题变量而非硬编码值

### Requirement: 文件系统 IPC 通道
主进程 SHALL 提供文件系统读取相关的 IPC 通道，渲染进程通过 preload 暴露的 API 调用。扫描结果的每个节点 SHALL 包含修改时间信息。

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

#### Scenario: 扫描节点携带修改时间
- **WHEN** 主进程通过任意扫描方式（fd 或 Node.js 回退）构建文件树
- **THEN** 返回的每个 `ScanTreeNode` SHALL 包含 `mtime` 字段（Unix 毫秒时间戳），表示该文件或目录的最后修改时间
