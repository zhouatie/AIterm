## MODIFIED Requirements

### Requirement: Tab 栏显示
终端面板 SHALL 在左侧显示一个双层导航区域，以 workspace 为一级节点、终端会话为二级节点。

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
