## MODIFIED Requirements

### Requirement: Tab 栏显示
终端面板 SHALL 在左侧显示一个双层导航区域，以 workspace 为一级节点、终端会话为二级节点；展开态导航 SHALL 使用紧凑的视觉密度，同时不得通过过度挤压标题文字来获得紧凑效果。

#### Scenario: 启动时默认显示一个 workspace 与一个二级终端
- **WHEN** 终端面板首次渲染且无持久化 tab 数据
- **THEN** 系统 SHALL 显示一个名为 `workspace_1` 的一级节点
- **THEN** 该一级节点 SHALL 默认展开，并包含一个活跃的二级终端节点

#### Scenario: 启动时从持久化数据恢复 tab 布局
- **WHEN** 终端面板首次渲染且存在有效的持久化 tab 数据
- **THEN** 系统 SHALL 恢复之前保存的 workspace 列表及其下属 session 结构
- **THEN** 每个 workspace 的展开/收起状态 SHALL 与保存时一致
- **THEN** 系统 SHALL 为持久化数据中的每个 session 创建新的 PTY 会话，并以保存的 cwd 作为该新 PTY 的初始目录
- **THEN** 之前的活跃 session 对应的新 PTY 会话 SHALL 被选为当前活跃终端
- **THEN** 用户手动重命名的 session 名称 SHALL 被映射到对应的新 PTY 会话并恢复
- **THEN** 侧边栏的收起/展开状态 SHALL 被恢复
- **THEN** 系统 SHALL NOT 期望或尝试恢复窗口关闭前已经终止的 PTY 进程、终端 scrollback 或正在运行的交互状态

#### Scenario: 持久化数据损坏时回退到默认行为
- **WHEN** 终端面板首次渲染且持久化 tab 数据存在但无法解析或校验失败
- **THEN** 系统 SHALL 静默忽略损坏数据
- **THEN** 系统 SHALL 回退到创建一个默认 `workspace_1` 与一个二级终端的行为

#### Scenario: 侧边双层结构布局
- **WHEN** 终端导航渲染时
- **THEN** 一级 workspace 节点 SHALL 垂直排列在左侧
- **THEN** 每个已展开的一级节点下方 SHALL 显示其所属的二级终端节点列表
- **THEN** 新建按钮 SHALL 显示在该侧边导航区域内，而非顶部横向 Tab 栏

#### Scenario: 展开态侧边 tab 紧凑显示
- **WHEN** terminal 侧边 tab 栏处于展开态
- **THEN** workspace 节点与二级终端节点 SHALL 使用比当前基线更小的行高、内边距和列表间距
- **THEN** header、footer、节点图标、关闭按钮、新增按钮和折叠按钮的视觉占位 SHALL 与紧凑行高协调
- **THEN** 相同侧边栏高度下 SHALL 能显示不少于当前基线数量的 workspace 与二级终端节点

#### Scenario: 二级 tab 行内间距紧凑
- **WHEN** terminal 侧边栏展开且处于 `Terminal` 模式
- **THEN** 二级 terminal tab 的状态点槽位、Command 序号槽位、名称和关闭按钮之间的固定横向间距 SHALL 小于当前基线实现
- **THEN** 状态点与 terminal tab 名称之间 SHALL 保持紧凑但不过度贴近的距离，不得出现明显空白段
- **THEN** 二级 terminal tab 名称起点 SHALL 与上方 workspace 名称起点纵向对齐
- **THEN** agent status 或 Command 序号显示/隐藏时，terminal tab 名称、关闭按钮和整体宽度 SHALL 保持稳定

#### Scenario: 展开态侧边栏占用宽度缩短
- **WHEN** terminal 侧边栏展开且处于 `Terminal` 模式
- **THEN** 展开态 terminal 侧边栏宽度 SHALL 小于当前基线实现
- **THEN** 右侧 terminal 内容区 SHALL 获得更多横向空间
- **THEN** 二级 terminal tab 仍 SHALL 使用单行省略展示超长名称，而不是撑破侧边布局

#### Scenario: 紧凑显示不缩小标题文字范围
- **WHEN** terminal 侧边 tab 栏处于展开态且节点标题较长
- **THEN** workspace 标题的可用文本显示宽度 SHALL NOT 小于当前基线实现
- **THEN** 二级终端标题的可用文本显示宽度 SHALL 优先通过压缩非文本视觉占位来保留
- **THEN** 系统 SHALL 优先压缩非文本视觉占位，而不是提前截断标题来获得紧凑效果

#### Scenario: 侧边栏支持整体收起与展开
- **WHEN** 用户触发 terminal 侧边 tab 栏的收起 / 展开控件
- **THEN** 系统 SHALL 在收起态与展开态之间切换该导航区域
- **THEN** 收起态 SHALL 为终端内容区释放更多横向空间

#### Scenario: 收起后保留导航状态
- **WHEN** 用户收起 terminal 侧边 tab 栏后再重新展开
- **THEN** 之前的 workspace 列表、workspace 展开状态与当前活跃二级终端 SHALL 被保留
- **THEN** 系统 SHALL 不因为收起 / 展开而销毁或重建已有 PTY 会话

#### Scenario: 一级与二级标题超长截断
- **WHEN** 一级或二级节点名称超出可用宽度
- **THEN** 节点文本 SHALL 保持单行显示
- **THEN** 超出部分 SHALL 以尾部省略号（`...`）截断，而不是撑破侧边布局

#### Scenario: 活跃终端高亮
- **WHEN** 某个二级终端节点对应当前活跃 session
- **THEN** 该二级节点 SHALL 显示活跃样式
- **THEN** 其所属一级 workspace SHALL 保持可见，便于用户识别当前终端归属
