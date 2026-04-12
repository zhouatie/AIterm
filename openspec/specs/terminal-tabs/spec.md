# Capability: terminal-tabs

## Purpose
终端多 Tab 管理能力，提供 Tab 栏 UI、Tab 的创建/切换/关闭以及多终端实例的生命周期管理。

## Requirements

### Requirement: Tab 栏显示
终端面板 SHALL 在顶部显示一个 Tab 栏，展示所有已打开的终端会话标签。

#### Scenario: 启动时默认显示一个 Tab
- **WHEN** 终端面板首次渲染
- **THEN** Tab 栏 SHALL 显示一个名为 "Terminal 1" 的默认 Tab，且该 Tab 为活跃状态

#### Scenario: Tab 栏布局
- **WHEN** Tab 栏渲染时
- **THEN** Tab 栏 SHALL 水平排列所有 Tab 标签，右侧 SHALL 显示一个新建按钮（`Plus` 图标）
- **THEN** Tab 栏高度 SHALL 为 40px，Tab 栏与终端内容区之间 SHALL 无分隔线
- **THEN** 各 Tab 之间 SHALL 无分隔线，间距为 6px

#### Scenario: Tab 药丸造型
- **WHEN** Tab 标签渲染时
- **THEN** 每个 Tab SHALL 采用胶囊药丸造型（圆角 8px），高度 28px，垂直居中于 Tab 栏
- **THEN** Tab 内边距 SHALL 为 4px 12px

#### Scenario: 活跃 Tab 视觉区分
- **WHEN** 某个 Tab 为当前活跃 Tab
- **THEN** 该 Tab SHALL 显示填充背景色（`--color-bg-pill-active`）和柔和阴影（`box-shadow`）
- **THEN** 该 Tab 文字 SHALL 使用高亮文字色（`--color-text-primary`）

#### Scenario: 非激活 Tab 视觉
- **WHEN** 某个 Tab 为非激活状态且未被悬停
- **THEN** 该 Tab SHALL 背景透明，无阴影
- **THEN** 该 Tab 文字 SHALL 使用弱化文字色（`--color-text-muted`）

#### Scenario: Tab 悬停态
- **WHEN** 用户鼠标悬停在一个非激活 Tab 上
- **THEN** 该 Tab SHALL 显示半透明背景色（`--color-bg-pill-hover`）
- **THEN** 该 Tab 文字 SHALL 变亮为 `--color-text-tertiary`

#### Scenario: Tab 点击按压反馈
- **WHEN** 用户在 Tab 上按下鼠标
- **THEN** 该 Tab SHALL 缩放至 `scale(0.97)`
- **WHEN** 用户释放鼠标
- **THEN** 该 Tab SHALL 恢复至 `scale(1.0)`
- **THEN** 缩放过渡时长 SHALL 为 150ms

#### Scenario: Tab 溢出时横向滚动
- **WHEN** Tab 数量超出 Tab 栏可视宽度
- **THEN** Tab 列表容器 SHALL 支持横向滚动，用户可通过鼠标滚轮浏览所有 Tab
- **THEN** 横向滚动条 SHALL 被隐藏，不可见

#### Scenario: 鼠标滚轮横向滚动
- **WHEN** 用户在 Tab 列表区域使用鼠标纵向滚轮
- **THEN** 系统 SHALL 将纵向滚动量映射为横向滚动，实现 Tab 栏横向移动
- **THEN** 系统 SHALL 阻止该区域的默认纵向滚动行为

### Requirement: 新建终端 Tab
用户 SHALL 能够通过点击新建按钮创建新的终端 Tab。

#### Scenario: 点击新建按钮
- **WHEN** 用户点击 Tab 栏的 `+` 按钮
- **THEN** 系统 SHALL 创建一个新的终端 Tab 和对应的 PTY 会话，Tab 名为 "Terminal N"（N 为递增编号），新 Tab SHALL 自动成为活跃 Tab

#### Scenario: 新终端独立工作目录
- **WHEN** 新的终端 Tab 被创建
- **THEN** 新终端 SHALL 启动一个独立的 shell 进程，工作目录为用户 HOME 目录

### Requirement: Tab 切换
用户 SHALL 能够通过点击 Tab 标签切换到对应的终端会话。

#### Scenario: 点击非活跃 Tab
- **WHEN** 用户点击一个非活跃的 Tab 标签
- **THEN** 该 Tab SHALL 成为活跃 Tab，对应的终端内容 SHALL 显示在面板中

#### Scenario: 切换时保留终端状态
- **WHEN** 用户从 Tab A 切换到 Tab B，再切回 Tab A
- **THEN** Tab A 的终端 SHALL 完整保留之前的输出历史、滚动位置和运行中的进程

#### Scenario: 切换后终端尺寸适配
- **WHEN** 用户切换到一个之前处于隐藏状态的 Tab
- **THEN** 该终端 SHALL 自动重新适配当前面板尺寸

### Requirement: 关闭终端 Tab
用户 SHALL 能够关闭终端 Tab，关闭时销毁对应的 PTY 会话。

#### Scenario: 关闭按钮造型
- **WHEN** 关闭按钮渲染时
- **THEN** 关闭按钮 SHALL 使用 `X` 图标（lucide-react），圆形造型（`border-radius: 50%`），尺寸 18x18px

#### Scenario: 激活 Tab 的关闭按钮
- **WHEN** 某个 Tab 为当前活跃 Tab
- **THEN** 该 Tab 的关闭按钮 SHALL 始终可见（`opacity: 1`）

#### Scenario: 非激活 Tab 的关闭按钮
- **WHEN** 某个 Tab 为非激活状态且未被悬停
- **THEN** 该 Tab 的关闭按钮 SHALL 隐藏（`opacity: 0`），且 SHALL 不可点击（`pointer-events: none`）

#### Scenario: 悬停 Tab 时关闭按钮显现
- **WHEN** 用户鼠标悬停在一个非激活 Tab 上
- **THEN** 该 Tab 的关闭按钮 SHALL 淡入显示（`opacity: 1`），过渡时长 120ms
- **THEN** 关闭按钮 SHALL 变为可点击（`pointer-events: auto`）

#### Scenario: 关闭按钮悬停高亮
- **WHEN** 用户鼠标悬停在关闭按钮上
- **THEN** 关闭按钮 SHALL 显示圆形背景高亮（`--color-bg-hover`）

#### Scenario: 点击关闭按钮
- **WHEN** 用户点击某个 Tab 上的关闭按钮
- **THEN** 系统 SHALL 销毁该 Tab 对应的 PTY 进程并释放资源，从 Tab 栏中移除该 Tab

#### Scenario: 关闭活跃 Tab 后自动切换
- **WHEN** 用户关闭当前活跃的 Tab，且还有其他 Tab 存在
- **THEN** 系统 SHALL 自动切换到相邻的 Tab（优先切换到右侧，右侧没有则切换到左侧）

#### Scenario: 关闭最后一个 Tab
- **WHEN** 用户关闭最后一个 Tab
- **THEN** 系统 SHALL 自动创建一个新的终端 Tab，保证终端面板始终至少有一个可用的终端

### Requirement: 终端实例生命周期管理
每个 Tab 对应的终端实例 SHALL 独立管理自己的 xterm.js 和 PTY 生命周期。

#### Scenario: 终端实例挂载
- **WHEN** 一个新的 Tab 被创建
- **THEN** 系统 SHALL 创建一个独立的 xterm.js 实例并绑定到独立的 PTY 会话

#### Scenario: 非活跃终端保持连接
- **WHEN** 一个终端 Tab 处于非活跃状态
- **THEN** 其 PTY 进程 SHALL 继续运行，xterm.js 实例 SHALL 保持挂载（但不可见）

#### Scenario: Tab 关闭时清理资源
- **WHEN** 一个终端 Tab 被关闭
- **THEN** 系统 SHALL 销毁对应的 xterm.js 实例并通过 IPC 销毁 PTY 会话

### Requirement: 新建按钮样式
新建按钮 SHALL 与药丸风格视觉统一。

#### Scenario: 新建按钮渲染
- **WHEN** 新建按钮渲染时
- **THEN** 新建按钮 SHALL 使用 `Plus` 图标（lucide-react），尺寸 28x28px，圆角 8px
- **THEN** 新建按钮背景 SHALL 为透明

#### Scenario: 新建按钮悬停
- **WHEN** 用户鼠标悬停在新建按钮上
- **THEN** 新建按钮 SHALL 显示背景高亮（`--color-bg-hover`）

### Requirement: Tab 自动滚动到可视区域
当新建或切换 Tab 时，系统 SHALL 自动将目标 Tab 滚动到可视区域内。

#### Scenario: 新建 Tab 后自动滚动
- **WHEN** 用户新建一个 Tab
- **THEN** Tab 列表 SHALL 自动滚动到最右侧，确保新建的 Tab 可见

#### Scenario: 切换到不可见 Tab 时自动滚动
- **WHEN** 用户点击或通过其他方式切换到一个当前不在可视区域内的 Tab
- **THEN** 系统 SHALL 将目标 Tab 平滑滚动到可视区域内
- **THEN** 若目标 Tab 已在可视区域内，SHALL 不产生滚动
