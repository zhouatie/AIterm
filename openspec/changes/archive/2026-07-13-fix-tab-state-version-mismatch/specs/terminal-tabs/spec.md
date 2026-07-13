## MODIFIED Requirements

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

#### Scenario: 持久化数据使用当前 schema 版本
- **WHEN** 系统写入持久化 tab 数据时
- **THEN** 数据 SHALL 包含 `version` 字段用于标识 schema 版本
- **THEN** 写入的 `version` SHALL 与读取端认可的当前 schema 版本一致
- **THEN** 保存端与读取端 SHALL 使用同一个当前版本定义

#### Scenario: 持久化存储使用主进程文件
- **WHEN** 系统保存 tab 状态时
- **THEN** 系统 SHALL 通过 IPC 通道将数据发送到主进程
- **THEN** 主进程 SHALL 将数据同步写入 `<userData>/tab-state.json` 文件

### Requirement: Tab 状态恢复
系统 SHALL 在应用启动时尝试从持久化存储中恢复之前的 tab 布局。

#### Scenario: 恢复当前版本的 tab 状态
- **WHEN** 应用启动时存在字段完整且 `version` 等于当前 schema 版本的持久化数据
- **THEN** 系统 SHALL 恢复其中的 workspace/session 树结构
- **THEN** 系统 SHALL 恢复保存时的活跃 session 标识、用户重命名和侧边栏状态

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

#### Scenario: 非当前版本数据不参与恢复
- **WHEN** 应用启动时持久化数据的 `version` 与当前 schema 版本不一致
- **THEN** 系统 SHALL 将该数据视为无效状态
- **THEN** 系统 SHALL NOT 对该数据执行兼容转换或迁移
- **THEN** 系统 SHALL 创建一个默认 workspace 与一个终端

#### Scenario: 无持久化数据时使用默认行为
- **WHEN** 应用启动时持久化文件不存在或为空
- **THEN** 系统 SHALL 创建一个默认 workspace 与一个终端（与当前行为一致）
