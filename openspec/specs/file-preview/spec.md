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
文件树的根目录 SHALL 在终端 Tab 切换时与当前激活终端的工作目录同步，但仅在左栏展开时生效。系统不再使用定时轮询检测 CWD 变化。

#### Scenario: 初始同步
- **WHEN** 文件预览面板首次加载且左栏处于展开状态
- **THEN** 文件树根目录 SHALL 设置为当前激活终端 Tab 的初始工作目录

#### Scenario: 切换终端 Tab 时同步
- **WHEN** 用户在右侧切换到另一个终端 Tab 且左栏处于展开状态

#### Scenario: 左栏收起时不同步
- **WHEN** 用户在右侧切换终端 Tab 且左栏处于收起状态

#### Scenario: 左栏展开时恢复同步
- **WHEN** 左栏从收起状态切换为展开状态
- **THEN** 系统 SHALL 立即获取当前激活终端 Tab 的工作目录并更新文件树根目录

#### Scenario: 不使用定时轮询
- **WHEN** 文件树模块处于任何状态
- **THEN** 系统 SHALL 不使用定时器轮询终端工作目录变化

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

### Requirement: 文件树手动刷新
系统 SHALL 提供一个手动刷新按钮，替代自动轮询机制，允许用户主动刷新文件树内容。

#### Scenario: 刷新按钮位置
- **WHEN** 文件树模块处于展开状态
- **THEN** 文件树工具栏 SHALL 在 toggle icon 旁显示一个刷新按钮

#### Scenario: 点击刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 系统 SHALL 重新获取当前终端工作目录并刷新文件树内容

#### Scenario: 收起状态不显示刷新按钮
- **WHEN** 文件树模块处于收起状态
- **THEN** 刷新按钮 SHALL 不显示

### Requirement: 侧边栏展开/收起切换
系统 SHALL 提供一个 toggle 控件，允许用户展开或收起整个左栏（文件树+Markdown 预览）。

#### Scenario: 默认展开状态
- **WHEN** 应用首次启动且无持久化状态
- **THEN** 左栏 SHALL 处于展开状态，正常显示文件树和 Markdown 预览的分栏布局

#### Scenario: 收起左栏
- **WHEN** 用户点击 toggle icon 且左栏当前为展开状态
- **THEN** 左栏 SHALL 收起（宽度变为 0），终端面板占满全宽，左栏内的组件保持 DOM 挂载但不执行后台操作

#### Scenario: 展开左栏
- **WHEN** 用户点击 toggle icon 且左栏当前为收起状态
- **THEN** 左栏 SHALL 展开，恢复文件树与 Markdown 预览的分栏布局，并重新获取当前终端工作目录加载文件树

#### Scenario: Toggle icon 位置
- **WHEN** 应用渲染时（无论展开或收起状态）
- **THEN** toggle icon SHALL 使用绝对定位显示在应用顶部（macOS traffic lights 右侧），始终可见，使用面板展开/收起语义的图标

#### Scenario: 展开/收起状态持久化
- **WHEN** 用户切换展开/收起状态
- **THEN** 系统 SHALL 将当前状态保存到 `localStorage`，下次应用启动时恢复上次的状态

#### Scenario: 收起时保持 DOM 挂载
- **WHEN** 左栏收起
- **THEN** 左栏和右栏的子组件 SHALL 保持 DOM 挂载（不被卸载重建），避免终端重绘

### Requirement: 左栏收起时暂停资源消耗
当左栏处于收起状态时，系统 SHALL 停止所有与文件树相关的后台操作以节省资源。

#### Scenario: 不跟随终端目录变化
- **WHEN** 左栏处于收起状态且用户切换终端 Tab
- **THEN** 系统 SHALL 不更新文件树根目录，不发起目录读取请求

#### Scenario: 不读取目录内容
- **WHEN** 左栏处于收起状态
- **THEN** 系统 SHALL 不通过 IPC 发起任何目录读取操作

### Requirement: 文件树节点右键上下文菜单
系统 SHALL 为文件树中的文件和目录节点提供右键上下文菜单。

#### Scenario: 触发右键菜单
- **WHEN** 用户在文件树的某个文件或目录节点上右键点击
- **THEN** 系统 SHALL 在鼠标位置弹出一个上下文菜单

#### Scenario: 复制相对路径
- **WHEN** 用户在右键菜单中选择"复制相对路径"
- **THEN** 系统 SHALL 将该节点相对于文件树根目录的路径复制到剪贴板

#### Scenario: 复制绝对路径
- **WHEN** 用户在右键菜单中选择"复制绝对路径"
- **THEN** 系统 SHALL 将该节点的绝对路径复制到剪贴板

#### Scenario: 关闭右键菜单
- **WHEN** 右键菜单已显示，用户点击菜单外区域或选择了菜单项
- **THEN** 右键菜单 SHALL 立即关闭

#### Scenario: 菜单定位不超出视口
- **WHEN** 右键点击位置接近视口边缘
- **THEN** 菜单 SHALL 调整弹出方向，确保完整显示在可视区域内

### Requirement: 文件树加载性能优化
系统 SHALL 使用 `fd` 命令一次性扫描目录下所有 Markdown 文件，替代逐目录递归遍历，以提升加载性能。

#### Scenario: 使用 fd 扫描
- **WHEN** 文件树需要加载目录内容且系统检测到 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd -e md --type f` 扫描根目录，将输出的文件路径列表解析为完整的树结构一次性返回

#### Scenario: fd 不可用时回退
- **WHEN** 文件树需要加载目录内容且系统检测到 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到现有的 Node.js 递归遍历方案，功能不受影响

#### Scenario: 自动遵守 gitignore
- **WHEN** 使用 `fd` 扫描文件
- **THEN** 扫描结果 SHALL 自动排除 `.gitignore` 中指定的文件和目录（`fd` 默认行为）

