## ADDED Requirements

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

## MODIFIED Requirements

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
