## ADDED Requirements

### Requirement: Terminal 侧边栏模式切换
Terminal 侧边导航 SHALL 提供 `Terminal / Spec` 模式切换，使用户可以在现有 workspace/session 导航与 Spec change 导航之间切换。模式切换 SHALL 不销毁、不重建、不暂停任何已有 terminal session。

#### Scenario: 默认显示 Terminal 模式
- **WHEN** Terminal 面板首次渲染
- **THEN** Terminal 侧边栏 SHALL 默认处于 `Terminal` 模式
- **AND** 系统 SHALL 展示现有 workspace / terminal session 双层导航

#### Scenario: 切换到 Spec 模式
- **WHEN** 用户在 Terminal 侧边栏点击 `Spec` 模式入口
- **THEN** Terminal 侧边栏 SHALL 切换为 Spec change 导航
- **AND** 右侧当前活跃 terminal session SHALL 保持不变
- **AND** 已有 PTY 会话 SHALL 继续运行

#### Scenario: 切回 Terminal 模式
- **WHEN** 用户在 Terminal 侧边栏点击 `Terminal` 模式入口
- **THEN** Terminal 侧边栏 SHALL 恢复现有 workspace / terminal session 双层导航
- **AND** 切换前的 workspace、session、展开状态和活跃 session SHALL 保持不变

#### Scenario: 收起侧边栏不改变模式语义
- **WHEN** 用户收起 Terminal 侧边栏后再展开
- **THEN** 系统 SHALL 保留已有 terminal session 状态
- **AND** 系统 SHALL 不因为收起或展开而重新创建 Spec change 或 terminal session 数据

### Requirement: Spec 模式数据加载
Terminal 侧边栏 Spec 模式 SHALL 基于已打开 terminal session 的项目根目录加载 SDD workflow 数据。受支持 workflow SHALL 包括 OpenSpec 与 RavenSpec。

#### Scenario: 按已打开项目目录读取 Spec 数据
- **WHEN** Terminal 侧边栏处于 `Spec` 模式
- **AND** 已打开 terminal session 的项目根目录下存在 `openspec/changes` 或 `ravenspec/changes`
- **THEN** 系统 SHALL 读取这些目录下的 active changes
- **AND** 系统 SHALL 不把 `archive` 目录下的 archived changes 展示为 active changes

#### Scenario: 多个 session 位于同一项目
- **WHEN** 多个 terminal session 对应同一个项目根目录
- **THEN** 系统 SHALL 对该项目根目录只展示一组 Spec change 结果
- **AND** 系统 SHALL 仍保留从该组结果定位到对应 terminal session 的能力

#### Scenario: 多个项目同时打开
- **WHEN** terminal 面板中存在多个不同项目根目录的 session
- **THEN** Spec 模式 SHALL 按项目根目录分组展示各自的 OpenSpec/RavenSpec active changes
- **AND** 一个项目读取失败 SHALL NOT 阻止其他项目的 Spec change 展示

#### Scenario: 当前项目没有 active changes
- **WHEN** 某个已打开项目目录下不存在 OpenSpec 或 RavenSpec active changes
- **THEN** Spec 模式 SHALL 为该项目显示空状态或不展示 change 卡片
- **AND** 系统 SHALL NOT 展示误导性的 change 数据

#### Scenario: session 项目根目录变化
- **WHEN** 某个 terminal session 的项目根目录发生变化
- **AND** Terminal 侧边栏处于 `Spec` 模式
- **THEN** 系统 SHALL 基于新的项目根目录刷新对应的 Spec change 数据

### Requirement: Spec change 卡片展示
Terminal 侧边栏 Spec 模式 SHALL 以紧凑卡片展示每个 active change 的 SDD 状态摘要，便于用户在 terminal tab 之间快速扫描。

#### Scenario: 展示 OpenSpec change 卡片
- **WHEN** Spec 模式读取到 OpenSpec active change
- **THEN** 系统 SHALL 展示该 change 的名称
- **AND** 系统 SHALL 展示 workflow 来源为 OpenSpec
- **AND** 系统 SHALL 展示 `proposal`、`design`、`specs`、`tasks` 的存在状态或等效完整度摘要

#### Scenario: 展示 RavenSpec change 卡片
- **WHEN** Spec 模式读取到 RavenSpec active change
- **THEN** 系统 SHALL 展示该 change 的名称
- **AND** 系统 SHALL 展示 workflow 来源为 RavenSpec
- **AND** 系统 SHALL 展示 `PRD`、`DESIGN`、`specs`、`TASK` 的存在状态或等效完整度摘要

#### Scenario: 展示任务进度
- **WHEN** active change 的任务 artifact 中存在 GFM task checkbox
- **THEN** Spec change 卡片 SHALL 展示任务总数和已完成数量
- **AND** 任务进度 SHALL 与对应 artifact 文件内容一致

#### Scenario: 展示推荐下一步
- **WHEN** workflow summary 能解析出 active change 的推荐下一步
- **THEN** Spec change 卡片 SHALL 展示该推荐下一步状态
- **AND** 系统 SHALL NOT 因仅展示推荐下一步而向 terminal 写入命令或执行 skill

### Requirement: Spec change 卡片定位 terminal
用户点击 Spec change 卡片主区域时，系统 SHALL 切回 `Terminal` 模式并定位到与该 change 所属项目关联的 terminal session。

#### Scenario: 点击 change 卡片定位到对应 terminal
- **WHEN** 用户点击某个 Spec change 卡片主区域
- **THEN** Terminal 侧边栏 SHALL 切回 `Terminal` 模式
- **AND** 系统 SHALL 选中该 change 所属项目关联的 terminal session
- **AND** 右侧 SHALL 显示该 terminal session 的终端内容
- **AND** 被选中的 terminal session 节点 SHALL 滚动到侧边导航可视区域内

#### Scenario: 多个 session 对应同一 change 项目
- **WHEN** 某个 Spec change 所属项目关联多个 terminal session
- **THEN** 系统 SHALL 选择当前活跃或最近活跃的同项目 terminal session
- **AND** 若没有可用的最近活跃信息，系统 SHALL 选择该项目下第一个可用 terminal session

#### Scenario: 目标 session 已关闭
- **WHEN** 用户点击 Spec change 卡片时其关联 terminal session 已不存在
- **THEN** 系统 SHALL NOT 创建新的 terminal session
- **AND** 系统 SHALL 以轻量反馈表达无法定位对应 terminal

### Requirement: Spec artifact 入口打开预览
Spec change 卡片 SHALL 提供已存在 artifact 的打开入口，并复用现有文件预览能力展示 Markdown artifact。点击 artifact 入口 SHALL NOT 自动切换或执行 terminal 命令。

#### Scenario: 打开已存在 artifact
- **WHEN** 用户点击 Spec change 卡片中已存在的 artifact 入口
- **THEN** 系统 SHALL 打开该 artifact 文件到现有文件预览区
- **AND** Markdown artifact SHALL 使用现有 Markdown 预览能力渲染
- **AND** 系统 SHALL NOT 因点击 artifact 入口向 terminal session 写入命令

#### Scenario: 点击缺失 artifact
- **WHEN** 用户点击或尝试打开缺失 artifact
- **THEN** 系统 SHALL NOT 尝试打开不存在的文件
- **AND** 缺失 artifact SHALL 以禁用状态或等效轻量提示展示

#### Scenario: artifact 打开不改变 terminal 活跃会话
- **WHEN** 用户点击 artifact 入口
- **THEN** 当前活跃 terminal session SHALL 保持不变
- **AND** Terminal 侧边栏当前模式 SHALL 保持不变

### Requirement: Spec change 卡片下一步 Skill 选择
Spec change 卡片 SHALL 提供“下一步”入口，使用户可以从卡片打开 Skill 选择弹窗，并从当前 change 所处阶段及之后的 OpenSpec/RavenSpec Skill 中选择要执行的下一步。系统 SHALL 将选定 Skill 绑定到 change 所属项目关联的目标 terminal session，并 SHALL 复用 SDD Command Router 生成 OpenSpec/RavenSpec skill payload。

#### Scenario: 展示下一步入口
- **WHEN** Spec 模式展示 active change 卡片
- **THEN** 卡片 SHALL 展示“下一步”入口
- **AND** “下一步”入口 SHALL 与卡片主区域定位行为、artifact 打开入口在视觉和点击区域上可区分

#### Scenario: 打开 Skill 选择弹窗
- **WHEN** 用户点击某个 Spec change 卡片的“下一步”入口
- **THEN** 系统 SHALL 展示 Skill 选择弹窗
- **AND** 弹窗 SHALL 展示目标 workflow、change 和 terminal session
- **AND** 系统 SHALL NOT 因打开弹窗向 terminal session 写入 payload

#### Scenario: Skill 候选项只包含当前阶段及之后流程
- **WHEN** 系统展示 Skill 选择弹窗
- **AND** 该 change 的推荐下一步已处于某个 SDD 流程阶段
- **THEN** 弹窗 SHALL 只展示当前阶段及之后的可执行 Skill
- **AND** 弹窗 SHALL NOT 展示早于当前阶段的 Skill
- **AND** 当当前阶段为 Apply 时，弹窗 SHALL NOT 展示 Explore 或 Propose

#### Scenario: 选择低风险 Skill
- **WHEN** 用户在 Skill 选择弹窗中选择某个低风险 Skill
- **AND** 该 Skill 不需要额外确认
- **THEN** 系统 SHALL 通过 SDD Command Router 为该 workflow、change 和 action 生成 payload
- **AND** 系统 SHALL 将 payload 写入该 change 所属项目关联的目标 terminal session 并执行
- **AND** 系统 SHALL NOT 将 payload 写入无关项目或无关 terminal session

#### Scenario: 选择高风险 Skill 先确认
- **WHEN** 用户在 Skill 选择弹窗中选择某个高风险 Skill
- **OR** 该 Skill 需要确认
- **OR** 该 Skill 包含跳过门禁的 action
- **THEN** 系统 SHALL 展示确认界面
- **AND** 确认界面 SHALL 展示目标 workflow、change、action 和 terminal session
- **AND** 系统 SHALL NOT 在用户确认前向任何 terminal session 写入 payload

#### Scenario: 确认后执行高风险 Skill
- **WHEN** 用户在确认界面确认执行
- **THEN** 系统 SHALL 将确认后的 payload 写入该 change 所属项目关联的目标 terminal session 并执行
- **AND** 系统 SHALL 清除本次确认状态

#### Scenario: 取消 Skill 选择或确认
- **WHEN** 用户在 Skill 选择弹窗或确认界面取消
- **THEN** 系统 SHALL 清除本次确认状态
- **AND** 系统 SHALL NOT 向 terminal session 写入 payload

#### Scenario: 目标 terminal 不可用
- **WHEN** 用户点击“下一步”入口或选择 Skill
- **AND** 该 change 所属项目没有可用的目标 terminal session
- **THEN** 系统 SHALL NOT 创建新的 terminal session
- **AND** 系统 SHALL NOT 向任何 terminal session 写入 payload
- **AND** 系统 SHALL 以轻量反馈表达无法执行下一步操作
