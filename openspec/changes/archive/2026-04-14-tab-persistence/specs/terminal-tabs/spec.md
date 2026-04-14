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
- **THEN** 之前的活跃 session SHALL 被重新选为当前活跃终端
- **THEN** 用户手动重命名的 session 名称 SHALL 被恢复
- **THEN** 侧边栏的收起/展开状态 SHALL 被恢复

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

## ADDED Requirements

### Requirement: Tab 状态持久化
系统 SHALL 在应用退出时自动保存当前 workspace/session 树结构及关键 UI 状态，以便下次启动时恢复。

#### Scenario: 应用退出时保存 tab 状态
- **WHEN** 用户关闭应用窗口
- **THEN** 系统 SHALL 将当前完整的 workspace/session 树结构序列化为 JSON
- **THEN** 持久化数据 SHALL 包含每个 workspace 的 ID、名称、展开状态及其下属 session 列表
- **THEN** 持久化数据 SHALL 包含每个 session 的工作目录（cwd）
- **THEN** 持久化数据 SHALL 包含当前活跃 session 的标识
- **THEN** 持久化数据 SHALL 包含所有用户手动重命名的 session 名称
- **THEN** 持久化数据 SHALL 包含侧边栏的收起/展开状态

#### Scenario: 持久化数据带有版本号
- **WHEN** 系统写入持久化 tab 数据时
- **THEN** 数据 SHALL 包含 `version` 字段用于未来 schema 迁移

#### Scenario: 持久化存储使用主进程文件
- **WHEN** 系统保存 tab 状态时
- **THEN** 系统 SHALL 通过 IPC 通道将数据发送到主进程
- **THEN** 主进程 SHALL 将数据同步写入 `<userData>/tab-state.json` 文件

### Requirement: Tab 状态恢复
系统 SHALL 在应用启动时尝试从持久化存储中恢复之前的 tab 布局。

#### Scenario: 恢复时重建 PTY 会话
- **WHEN** 系统从持久化数据恢复 session 列表
- **THEN** 系统 SHALL 为每个 session 在其保存的 cwd 下创建新的 PTY 进程
- **THEN** 恢复后的终端 SHALL 处于干净的初始状态（不恢复终端输出历史）

#### Scenario: 恢复时 cwd 目录已不存在
- **WHEN** 系统尝试在某个 session 保存的 cwd 下创建 PTY，但该目录已不存在
- **THEN** 系统 SHALL 回退到用户 HOME 目录创建该 PTY
- **THEN** 该 session 的 workspace 结构 SHALL 仍然被保留

#### Scenario: 恢复时正确映射 session 标识
- **WHEN** 系统恢复 tab 布局并创建新的 PTY 会话
- **THEN** 系统 SHALL 建立旧 session ID 到新 session ID 的映射
- **THEN** 活跃 session 标识 SHALL 通过该映射正确指向恢复后的 session
- **THEN** 用户手动重命名的 session 名称 SHALL 通过该映射正确关联到恢复后的 session

#### Scenario: 无持久化数据时使用默认行为
- **WHEN** 应用启动时持久化文件不存在或为空
- **THEN** 系统 SHALL 创建一个默认 workspace 与一个终端（与当前行为一致）
