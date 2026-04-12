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

#### Scenario: Tab 溢出时横向滚动
- **WHEN** Tab 数量超出 Tab 栏可视宽度
- **THEN** Tab 列表容器 SHALL 支持横向滚动，用户可通过鼠标滚轮浏览所有 Tab
- **THEN** 横向滚动条 SHALL 被隐藏，不可见

#### Scenario: 鼠标滚轮横向滚动
- **WHEN** 用户在 Tab 列表区域使用鼠标纵向滚轮
- **THEN** 系统 SHALL 将纵向滚动量映射为横向滚动，实现 Tab 栏横向移动
- **THEN** 系统 SHALL 阻止该区域的默认纵向滚动行为

## ADDED Requirements

### Requirement: Tab 自动滚动到可视区域
当新建或切换 Tab 时，系统 SHALL 自动将目标 Tab 滚动到可视区域内。

#### Scenario: 新建 Tab 后自动滚动
- **WHEN** 用户新建一个 Tab
- **THEN** Tab 列表 SHALL 自动滚动到最右侧，确保新建的 Tab 可见

#### Scenario: 切换到不可见 Tab 时自动滚动
- **WHEN** 用户点击或通过其他方式切换到一个当前不在可视区域内的 Tab
- **THEN** 系统 SHALL 将目标 Tab 平滑滚动到可视区域内
- **THEN** 若目标 Tab 已在可视区域内，SHALL 不产生滚动
