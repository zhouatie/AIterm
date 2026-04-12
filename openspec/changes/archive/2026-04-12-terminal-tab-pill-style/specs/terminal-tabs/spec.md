## MODIFIED Requirements

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

### Requirement: 新建按钮样式
新建按钮 SHALL 与药丸风格视觉统一。

#### Scenario: 新建按钮渲染
- **WHEN** 新建按钮渲染时
- **THEN** 新建按钮 SHALL 使用 `Plus` 图标（lucide-react），尺寸 28x28px，圆角 8px
- **THEN** 新建按钮背景 SHALL 为透明

#### Scenario: 新建按钮悬停
- **WHEN** 用户鼠标悬停在新建按钮上
- **THEN** 新建按钮 SHALL 显示背景高亮（`--color-bg-hover`）
