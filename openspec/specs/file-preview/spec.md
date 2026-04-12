# Capability: file-preview

## Purpose
文件预览系统，包含文件树浏览、Markdown 渲染、工作目录同步和文件系统 IPC 通道。
## Requirements
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

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法和代码高亮。仅当选中文件的扩展名为 `.md` 时才使用此渲染模式。

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
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个文件以预览"）

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
文件树的根目录 SHALL 在终端 Tab 切换时与当前激活终端的工作目录同步，且在终端工作目录发生变化时自动更新，但仅在左栏展开时生效。系统不再使用定时轮询检测 CWD 变化。

#### Scenario: 初始同步
- **WHEN** 文件预览面板首次加载且左栏处于展开状态
- **THEN** 文件树根目录 SHALL 设置为当前激活终端 Tab 的初始工作目录

#### Scenario: 切换终端 Tab 时同步
- **WHEN** 用户在右侧切换到另一个终端 Tab 且左栏处于展开状态
- **THEN** 系统 SHALL 获取新激活终端的工作目录并更新文件树根目录

#### Scenario: 终端 CWD 变化时自动同步
- **WHEN** 当前激活终端的工作目录因用户执行 `cd` 等命令发生变化，且左栏处于展开状态
- **THEN** 系统 SHALL 自动检测到 CWD 变化并更新文件树根目录，无需用户手动刷新

#### Scenario: 左栏收起时不同步
- **WHEN** 用户在右侧切换终端 Tab 或终端 CWD 变化，且左栏处于收起状态
- **THEN** 系统 SHALL 不更新文件树根目录，不发起目录读取请求

#### Scenario: 左栏展开时恢复同步
- **WHEN** 左栏从收起状态切换为展开状态
- **THEN** 系统 SHALL 立即获取当前激活终端 Tab 的工作目录并更新文件树根目录

#### Scenario: 不使用定时轮询
- **WHEN** 文件树模块处于任何状态
- **THEN** 系统 SHALL 不使用定时器轮询终端工作目录变化

#### Scenario: CWD 变化检测机制
- **WHEN** PTY 进程产生输出数据
- **THEN** 主进程 SHALL 以节流方式（不超过每秒一次）检测 PTY 的实际工作目录，若发生变化则推送事件到渲染进程

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

### Requirement: 文件树手动刷新
系统 SHALL 提供一个手动刷新按钮，允许用户主动刷新文件树内容。刷新 SHALL 通过独立的 refreshKey 机制触发，确保即使工作目录未变化也能可靠地重新扫描目录内容。

#### Scenario: 刷新按钮位置
- **WHEN** 文件树模块处于展开状态
- **THEN** 文件树工具栏 SHALL 在 toggle icon 旁显示一个刷新按钮

#### Scenario: 点击刷新（CWD 未变化）
- **WHEN** 用户点击刷新按钮且终端工作目录与当前文件树根目录相同
- **THEN** 系统 SHALL 递增 refreshKey 触发文件树重新扫描，不依赖路径清空/恢复的中间状态，刷新期间 SHALL 显示 loading 状态

#### Scenario: 点击刷新（CWD 已变化）
- **WHEN** 用户点击刷新按钮且终端工作目录已发生变化
- **THEN** 系统 SHALL 更新文件树根目录为新的工作目录，清除选中文件和文件内容，并重新扫描

#### Scenario: 收起状态不显示刷新按钮
- **WHEN** 文件树模块处于收起状态
- **THEN** 刷新按钮 SHALL 不显示

#### Scenario: 刷新过程中显示加载状态
- **WHEN** 刷新触发文件树重新扫描
- **THEN** 文件树 SHALL 显示 loading 指示器，直到扫描完成或失败

#### Scenario: 扫描失败时恢复
- **WHEN** 文件树扫描 IPC 调用失败（如目录已删除、权限不足）
- **THEN** 系统 SHALL 将 loading 状态设为 false，显示空树或保留上次结果，不产生未捕获错误

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

### Requirement: 文件类型过滤切换
系统 SHALL 提供一个切换控件，允许用户在"仅 Markdown 文件"和"全部文件"两种文件树显示模式之间切换。

#### Scenario: 切换按钮位置
- **WHEN** 文件树工具栏渲染时
- **THEN** 刷新按钮左侧 SHALL 显示一个文件类型过滤切换图标按钮

#### Scenario: 默认显示 Markdown 文件
- **WHEN** 应用首次启动且无持久化偏好
- **THEN** 文件树 SHALL 以 Markdown-only 模式显示，仅展示 `.md` 文件和包含 `.md` 文件的目录

#### Scenario: 切换到全部文件模式
- **WHEN** 用户点击过滤切换按钮且当前为 Markdown-only 模式
- **THEN** 文件树 SHALL 重新加载并显示根目录下的所有文件（排除隐藏文件和常见大目录如 `node_modules`、`.git`），图标 SHALL 切换为"全部文件"语义图标

#### Scenario: 切换回 Markdown-only 模式
- **WHEN** 用户点击过滤切换按钮且当前为全部文件模式
- **THEN** 文件树 SHALL 重新加载并仅显示 `.md` 文件，图标 SHALL 切换为"Markdown 文件"语义图标

#### Scenario: 过滤偏好持久化
- **WHEN** 用户切换文件类型过滤模式
- **THEN** 系统 SHALL 将当前模式保存到 `localStorage`，下次应用启动时恢复

#### Scenario: 全部文件扫描排除策略
- **WHEN** 文件树以全部文件模式扫描目录
- **THEN** 系统 SHALL 排除 `node_modules`、`.git`、`dist`、`build`、`out`、`.next` 等常见大目录，排除隐藏文件（以 `.` 开头），并尊重 `.gitignore` 规则

### Requirement: 全部文件扫描 IPC 通道
系统 SHALL 提供扫描全部文件的 IPC 通道，支持返回指定目录下所有非隐藏文件的树结构。

#### Scenario: 使用 fd 扫描全部文件
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd --type f --no-hidden` 并排除常见大目录，将结果解析为树结构返回

#### Scenario: fd 不可用时回退
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到 Node.js 递归遍历方案，排除隐藏文件、gitignore 文件和常见大目录

### Requirement: 右键菜单复制文件名
文件树节点右键菜单 SHALL 支持"复制文件名"操作。

#### Scenario: 菜单项显示
- **WHEN** 用户在文件树节点上右键点击
- **THEN** 上下文菜单 SHALL 包含"复制文件名"选项，位于"复制相对路径"之前

#### Scenario: 复制文件名
- **WHEN** 用户选择"复制文件名"菜单项
- **THEN** 系统 SHALL 将该节点的文件名（不含路径，例如 `readme.md`）复制到系统剪贴板

### Requirement: 右键菜单在访达中显示
文件树节点右键菜单 SHALL 支持"在访达中显示"操作，在系统文件管理器中定位该文件或目录。

#### Scenario: 菜单项显示
- **WHEN** 用户在文件树节点上右键点击
- **THEN** 上下文菜单 SHALL 包含"在访达中显示"选项，位于菜单末尾

#### Scenario: 在访达中显示文件
- **WHEN** 用户选择"在访达中显示"菜单项
- **THEN** 系统 SHALL 通过 IPC 调用 Electron 的 `shell.showItemInFolder` 打开系统文件管理器并选中该文件或目录

#### Scenario: IPC 通道
- **WHEN** 渲染进程请求在访达中显示某路径
- **THEN** 主进程 SHALL 提供 `fs:show-in-folder` IPC handler，调用 `shell.showItemInFolder(path)` 执行操作

### Requirement: 文件类型预览路由
文件预览面板 SHALL 根据选中文件的扩展名自动选择对应的预览组件进行渲染。

#### Scenario: Markdown 文件路由到 Markdown 预览
- **WHEN** 用户选中一个 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `MarkdownPreview` 组件渲染文件内容

#### Scenario: 代码文件路由到代码预览
- **WHEN** 用户选中一个非 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `CodePreview` 组件渲染文件内容，提供语法高亮

#### Scenario: 切换文件类型时预览组件切换
- **WHEN** 用户先选中一个 `.md` 文件，再选中一个 `.ts` 文件
- **THEN** 预览区 SHALL 从 Markdown 渲染模式无缝切换到代码高亮模式

