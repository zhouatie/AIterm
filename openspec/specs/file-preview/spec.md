# Capability: file-preview

## Purpose
文件预览系统，包含文件树浏览、Markdown 渲染、工作目录同步和文件系统 IPC 通道。
## Requirements
### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 只读取根目录的第一层内容并以缩进树形结构展示，目录在前、文件在后，同组内按修改时间倒序排列（最近修改的排在最上面），修改时间相同时按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 按需读取该目录的第一层子节点并展开显示；若为展开状态，SHALL 折叠隐藏其后代节点

#### Scenario: 默认显示全部文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 显示目录和非隐藏文件，并复用系统目录、Home 目录、项目噪音目录与 `.gitignore` 排除策略

#### Scenario: 选中文件高亮
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮状态，高亮颜色 SHALL 使用主题变量而非硬编码值

### Requirement: 文件树虚拟化渲染
系统 SHALL 基于当前展开状态生成文件树可见行，并使用固定行高虚拟列表限制实际挂载的节点数量。

#### Scenario: 折叠目录不挂载后代节点
- **WHEN** 文件树已加载树结果且某个目录处于折叠状态
- **THEN** 该目录的后代节点 SHALL 不进入当前可见行列表，也 SHALL 不挂载到 React 渲染树中

#### Scenario: 大量可见节点滚动
- **WHEN** 当前展开状态产生的可见节点数量超过文件树视口可显示数量
- **THEN** 文件树 SHALL 只挂载视口附近的可见行，并 SHALL 通过占位高度保持滚动条表示完整可见行列表

#### Scenario: 展开全部虚拟化
- **WHEN** 用户点击展开全部按钮
- **THEN** 文件树 SHALL 将当前完整树中的目录视为展开状态，并 SHALL 继续只挂载虚拟窗口范围内的可见行

#### Scenario: 虚拟行交互保持一致
- **WHEN** 用户对虚拟列表中的文件或目录行执行点击、右键、hover 或选中操作
- **THEN** 文件树 SHALL 保持现有展开折叠、文件预览、选中高亮和上下文菜单行为不变

### Requirement: 文件树按需加载与展开全部
系统 SHALL 初次只加载根目录第一层，并 SHALL 根据根目录层级决定是否提供展开全部入口。

#### Scenario: 初次只加载第一层
- **WHEN** 文件树根目录发生变化或用户手动刷新
- **THEN** 系统 SHALL 只请求该根目录的直接子节点，不 SHALL 扫描完整子树

#### Scenario: 展开目录加载下一层
- **WHEN** 用户展开一个尚未加载过子节点的目录
- **THEN** 系统 SHALL 只请求该目录的直接子节点，并 SHALL 将结果缓存到该目录节点下

#### Scenario: 高层目录隐藏展开全部
- **WHEN** 文件树根目录是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 不显示展开全部按钮

#### Scenario: 非高层目录显示展开全部
- **WHEN** 文件树根目录不是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 显示展开全部按钮

#### Scenario: 非高层目录展开全部
- **WHEN** 用户在非高层目录点击展开全部按钮
- **THEN** 系统 SHALL 扫描该根目录完整文件树，替换当前树数据，并展开所有目录

### Requirement: 文件树搜索
系统 SHALL 在文件树工具栏提供搜索框，用于过滤当前已加载的树节点。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在文件树搜索框输入关键词
- **THEN** 文件树 SHALL 只展示当前已加载树中名称或路径匹配关键词的节点及其必要父节点

#### Scenario: 清空搜索关键词
- **WHEN** 用户清空搜索框
- **THEN** 文件树 SHALL 恢复按当前展开状态展示可见节点

### Requirement: 文件树 Spec 模式
系统 SHALL 提供 spec 模式切换按钮，用于只加载配置的 spec 目录名对应的目录树。

#### Scenario: 开启 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为关闭状态
- **THEN** 文件树 SHALL 重新加载 spec tree，并只访问当前根目录下配置的 spec 目录路径，不 SHALL 先读取当前根目录的所有 entry 再过滤

#### Scenario: 关闭 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为开启状态
- **THEN** 文件树 SHALL 重新加载根目录第一层，并恢复普通全部文件展示

#### Scenario: spec 模式按钮显示
- **WHEN** 文件树工具栏渲染 spec 模式按钮
- **THEN** 按钮内容 SHALL 显示 `spec` 文本而非图形 icon

#### Scenario: spec 模式继续按需展开
- **WHEN** 用户在 spec 模式下展开已展示的 spec 目录
- **THEN** 文件树 SHALL 按需加载该目录下一层内容

#### Scenario: spec 模式展开全部
- **WHEN** 用户在 spec 模式下点击展开全部按钮
- **THEN** 系统 SHALL 只扫描配置的 spec 目录树并展开结果，不 SHALL 扫描或展开非 spec 目录

#### Scenario: 移除 Markdown 过滤切换
- **WHEN** 文件树工具栏渲染
- **THEN** 文件树 SHALL 不显示 Markdown-only / 全部文件切换按钮

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

#### Scenario: 按需读取树节点
- **WHEN** 渲染进程调用 `fileApi.readTreeDirectory(path)`
- **THEN** 主进程 SHALL 只读取指定目录的直接子节点，并返回包含 `name`、`path`、`isDirectory`、`mtime` 的树节点列表

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

### Requirement: 文件树全量扫描性能优化
系统 SHALL 在需要全量扫描时优先使用 `fd` 命令，并在不可用时回退到 Node.js 遍历方案。

#### Scenario: 使用 fd 扫描 Markdown 文件
- **WHEN** 文件树需要扫描 Markdown 文件且系统检测到 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd -e md --type f` 扫描目录，将输出的文件路径列表解析为树结构返回

#### Scenario: fd 不可用时回退
- **WHEN** 文件树需要执行全量扫描且系统检测到 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到现有的 Node.js 递归遍历方案，功能不受影响

#### Scenario: 自动遵守 gitignore
- **WHEN** 使用 `fd` 扫描文件
- **THEN** 扫描结果 SHALL 自动排除 `.gitignore` 中指定的文件和目录（`fd` 默认行为）

### Requirement: 全部文件扫描 IPC 通道
系统 SHALL 提供扫描全部文件的 IPC 通道，支持返回指定目录下所有非隐藏文件的树结构。

#### Scenario: 使用 fd 扫描全部文件
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd --type f --no-hidden` 并排除常见大目录，将结果解析为树结构返回

#### Scenario: fd 不可用时回退
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到 Node.js 递归遍历方案，排除隐藏文件、gitignore 文件和常见大目录

#### Scenario: spec 模式限定全量扫描范围
- **WHEN** 渲染进程以 spec 模式请求扫描全部文件并提供 spec 目录配置
- **THEN** 主进程 SHALL 只扫描配置的 spec 目录树，并返回对应的完整树结果

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

### Requirement: 文件树内部分栏拖拽即时反馈
文件预览面板内部的文件树与预览区分栏 SHALL 在拖拽过程中即时更新宽度，不得让宽度或分隔条位置过渡动画造成拖拽滞后。

#### Scenario: 拖拽文件树分隔条时取消布局动画
- **WHEN** 用户按住文件树与文件预览区之间的分隔条并移动鼠标
- **THEN** 文件树宽度 SHALL 立即跟随鼠标位置更新
- **THEN** 文件树宽度、分隔条宽度和分隔条 margin SHALL 不应用 CSS transition

#### Scenario: 拖拽结束后恢复非拖拽态动画
- **WHEN** 用户释放文件树分隔条结束拖拽
- **THEN** 系统 SHALL 退出拖拽状态
- **THEN** 后续非拖拽的文件树展开 / 收起布局变化 MAY 继续使用短过渡动画

### Requirement: 文件树内部分栏比例持久化
文件预览面板 SHALL 保存用户拖拽后的文件树宽度比例，并在下次打开应用时恢复。

#### Scenario: 保存文件树宽度比例
- **WHEN** 用户拖拽文件树与文件预览区之间的分隔条并释放鼠标
- **THEN** 系统 SHALL 将调整后的文件树宽度比例保存到本地持久化缓存

#### Scenario: 恢复文件树宽度比例
- **WHEN** 用户已经调整过文件树宽度后重新打开应用
- **THEN** 文件预览面板 SHALL 使用上次保存的比例渲染文件树与预览区
- **THEN** 系统 SHALL 仍应用最小宽度约束，避免文件树或预览区恢复到不可用宽度

#### Scenario: 无缓存时使用默认文件树比例
- **WHEN** 用户首次打开应用且本地没有保存过文件树宽度比例
- **THEN** 文件预览面板 SHALL 使用当前内部分栏配置的默认比例

### Requirement: 文件树面板单独收起
文件预览面板 SHALL 支持通过 icon 单独收起文件树面板，使左侧文件预览模块只保留文件预览区域。内部文件树面板收起 SHALL 不注册快捷键，不复用用于收起整个文件系统模块的快捷键。

#### Scenario: 通过 icon 收起文件树面板
- **WHEN** 文件树面板处于展开状态，且用户点击文件树收起 icon
- **THEN** 文件树面板 SHALL 收起到零宽或近似零宽
- **THEN** 文件预览区域 SHALL 继续显示当前选中文件的预览内容

#### Scenario: 通过 icon 展开文件树面板
- **WHEN** 文件树面板处于收起状态，且用户点击文件树展开 icon
- **THEN** 文件树面板 SHALL 重新展开
- **THEN** 文件树面板 SHALL 恢复到收起前或本地缓存中的宽度比例

#### Scenario: 不通过快捷键切换内部文件树面板
- **WHEN** 用户按下用于收起整个文件系统模块的快捷键
- **THEN** 文件预览面板内部的文件树面板 SHALL 不单独响应该快捷键
- **THEN** 内部文件树面板的展开 / 收起状态 SHALL 只由文件预览面板内的 icon 切换

#### Scenario: 文件树收起时保留预览状态
- **WHEN** 用户收起文件树面板
- **THEN** 当前选中文件、文件内容和预览滚动区域 SHALL 不因文件树收起而被清空或重建

#### Scenario: 文件树收起时暂停目录读取
- **WHEN** 文件树面板处于收起状态
- **THEN** 系统 SHALL 不因终端 CWD 变化或 terminal tab 切换发起新的文件树目录读取请求

#### Scenario: 文件树展开时恢复 CWD 同步
- **WHEN** 文件树面板从收起状态重新展开
- **THEN** 系统 SHALL 获取当前活跃终端的工作目录
- **THEN** 文件树 SHALL 使用当前活跃终端工作目录恢复展示

#### Scenario: 文件树收起状态持久化
- **WHEN** 用户切换文件树面板展开 / 收起状态
- **THEN** 系统 SHALL 将当前状态保存到本地持久化缓存
- **THEN** 用户下次打开应用时，文件树面板 SHALL 恢复上次的展开 / 收起状态

