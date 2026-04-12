## ADDED Requirements

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

## MODIFIED Requirements

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
