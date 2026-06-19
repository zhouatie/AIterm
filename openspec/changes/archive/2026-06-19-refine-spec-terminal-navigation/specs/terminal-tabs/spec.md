## MODIFIED Requirements

### Requirement: Terminal tab 切换快捷键
terminal 面板 SHALL 支持通过当前配置的快捷键在二级 terminal tab 之间循环切换活跃终端。当 Terminal 侧边栏展开且处于 `Spec` 模式时，相同的上一个/下一个导航快捷键 SHALL 改为按可见 Spec change 卡片顺序切换卡片，并复用卡片主区域定位右侧 terminal 的行为。

#### Scenario: 快捷键切换到上一个 terminal tab
- **WHEN** Terminal 侧边栏收起或处于 `Terminal` 模式
- **AND** 用户按下“上一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按左侧导航从上到下的二级 terminal tab 顺序选择当前活跃 tab 的上一项
- **AND** 若当前活跃 tab 已经是第一项，系统 SHALL 循环选择最后一项

#### Scenario: 快捷键切换到下一个 terminal tab
- **WHEN** Terminal 侧边栏收起或处于 `Terminal` 模式
- **AND** 用户按下“下一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按左侧导航从上到下的二级 terminal tab 顺序选择当前活跃 tab 的下一项
- **AND** 若当前活跃 tab 已经是最后一项，系统 SHALL 循环选择第一项

#### Scenario: 单个 terminal tab 时保持当前状态
- **WHEN** Terminal 侧边栏收起或处于 `Terminal` 模式
- **AND** terminal 面板中只有一个二级 terminal tab
- **THEN** 用户按下“上一个 terminal tab”或“下一个 terminal tab”快捷键后，系统 SHALL 保持当前活跃 terminal tab 不变

#### Scenario: 切换时保持终端状态
- **WHEN** Terminal 侧边栏收起或处于 `Terminal` 模式
- **AND** 用户通过快捷键在多个二级 terminal tab 之间切换
- **THEN** 目标二级 terminal tab SHALL 成为活跃终端
- **AND** 目标终端 SHALL 获得键盘焦点，后续输入 SHALL 进入该终端
- **AND** 每个终端 SHALL 保留其输出历史、滚动位置和运行中的进程

#### Scenario: 折叠 workspace 内的 terminal tab 可通过快捷键切换
- **WHEN** Terminal 侧边栏收起或处于 `Terminal` 模式
- **AND** 目标二级 terminal tab 所属 workspace 当前处于折叠状态
- **THEN** 用户通过快捷键切换到该 terminal tab 后，目标终端内容 SHALL 显示在终端面板中
- **AND** 系统 SHALL 不因为快捷键切换而强制展开该 workspace

#### Scenario: Spec 模式下切换到上一张可见卡片
- **WHEN** Terminal 侧边栏展开且处于 `Spec` 模式
- **AND** Spec 模式存在两张或更多可见 Spec change 卡片
- **AND** 用户按下“上一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按当前可见 Spec change 卡片从上到下的顺序选择上一张卡片
- **AND** 若当前目标卡片已经是第一张，系统 SHALL 循环选择最后一张
- **AND** 系统 SHALL 复用该卡片主区域的 terminal 定位行为
- **AND** Terminal 侧边栏 SHALL 保持 `Spec` 模式

#### Scenario: Spec 模式下切换到下一张可见卡片
- **WHEN** Terminal 侧边栏展开且处于 `Spec` 模式
- **AND** Spec 模式存在两张或更多可见 Spec change 卡片
- **AND** 用户按下“下一个 terminal tab”快捷键
- **THEN** 系统 SHALL 按当前可见 Spec change 卡片从上到下的顺序选择下一张卡片
- **AND** 若当前目标卡片已经是最后一张，系统 SHALL 循环选择第一张
- **AND** 系统 SHALL 复用该卡片主区域的 terminal 定位行为
- **AND** Terminal 侧边栏 SHALL 保持 `Spec` 模式

#### Scenario: Spec 模式下目标卡片需要绑定
- **WHEN** Terminal 侧边栏展开且处于 `Spec` 模式
- **AND** 用户通过上一个或下一个快捷键选中的 Spec change 卡片尚未绑定 terminal
- **AND** 系统无法唯一判断目标 terminal session
- **THEN** 系统 SHALL 展示轻量 terminal 选择器
- **AND** 系统 SHALL NOT 在用户选择前切换右侧 terminal

### Requirement: Terminal 侧边栏模式切换
Terminal 侧边导航 SHALL 提供 `Terminal / Spec` 模式切换，使用户可以在现有 workspace/session 导航与 Spec change 导航之间切换。模式切换 SHALL 不销毁、不重建、不暂停任何已有 terminal session。系统 SHALL 支持通过当前配置的 `Terminal / Spec` 模式切换快捷键执行同等切换，默认绑定为 `Command + D`。

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

#### Scenario: 使用快捷键切换 Terminal 和 Spec 模式
- **WHEN** 用户按下 `Terminal / Spec` 模式切换快捷键
- **THEN** 系统 SHALL 在 `Terminal` 与 `Spec` 模式之间切换 Terminal 侧边栏模式
- **AND** 右侧当前活跃 terminal session SHALL 保持不变
- **AND** 系统 SHALL NOT 因切换到 `Spec` 模式自动定位第一张 Spec change 卡片

#### Scenario: 收起侧边栏不改变模式语义
- **WHEN** 用户收起 Terminal 侧边栏后再展开
- **THEN** 系统 SHALL 保留已有 terminal session 状态
- **AND** 系统 SHALL 不因为收起或展开而重新创建 Spec change 或 terminal session 数据

### Requirement: Spec change 卡片展示
Terminal 侧边栏 Spec 模式 SHALL 以紧凑卡片展示每个 active change 的 SDD 状态摘要，便于用户在 terminal tab 之间快速扫描。系统 SHALL 只为已存在 `specs/**/*.md` 的 active change 展示 Spec change 卡片；没有 specs artifact 的 active change SHALL 不显示卡片。

#### Scenario: 展示 OpenSpec change 卡片
- **WHEN** Spec 模式读取到 OpenSpec active change
- **AND** 该 change 下存在一个或多个 `specs/**/*.md`
- **THEN** 系统 SHALL 展示该 change 的名称
- **AND** 系统 SHALL 展示 workflow 来源为 OpenSpec
- **AND** 系统 SHALL 展示 `proposal`、`design`、`specs`、`tasks` 的存在状态或等效完整度摘要

#### Scenario: 展示 RavenSpec change 卡片
- **WHEN** Spec 模式读取到 RavenSpec active change
- **AND** 该 change 下存在一个或多个 `specs/**/*.md`
- **THEN** 系统 SHALL 展示该 change 的名称
- **AND** 系统 SHALL 展示 workflow 来源为 RavenSpec
- **AND** 系统 SHALL 展示 `PRD`、`DESIGN`、`specs`、`TASK` 的存在状态或等效完整度摘要

#### Scenario: 隐藏没有 specs artifact 的 change
- **WHEN** Spec 模式读取到 active change
- **AND** 该 change 不存在 `specs/**/*.md`
- **THEN** 系统 SHALL NOT 为该 change 展示 Spec change 卡片
- **AND** 系统 SHALL NOT 因隐藏该卡片修改该 change 的 artifact 文件或任务状态

#### Scenario: 过滤后没有可展示卡片
- **WHEN** 某个项目下 active changes 均不存在 `specs/**/*.md`
- **THEN** Spec 模式 SHALL NOT 展示该项目分组
- **AND** 系统 SHALL NOT 展示该项目的空状态卡片或误导性的 change 卡片

#### Scenario: 展示任务进度
- **WHEN** active change 的任务 artifact 中存在 GFM task checkbox
- **AND** 该 change 已通过 specs artifact 过滤并展示为卡片
- **THEN** Spec change 卡片 SHALL 展示任务总数和已完成数量
- **AND** 任务进度 SHALL 与对应 artifact 文件内容一致

#### Scenario: 展示推荐下一步
- **WHEN** workflow summary 能解析出 active change 的推荐下一步
- **AND** 该 change 已通过 specs artifact 过滤并展示为卡片
- **THEN** Spec change 卡片 SHALL 展示该推荐下一步状态
- **AND** 系统 SHALL NOT 因仅展示推荐下一步而向 terminal 写入命令或执行 skill

### Requirement: Spec change 卡片定位 terminal
用户点击 Spec change 卡片主区域时，系统 SHALL 定位到与该 change 绑定或选定的 terminal session，并 SHALL 保持 Terminal 侧边栏停留在当前 `Spec` 模式。系统 SHALL 支持以 `rootPath + workflow + changeName` 为键，将 Spec change 与具体 terminal session 建立运行期绑定。

#### Scenario: 点击 change 卡片切换右侧 terminal
- **WHEN** 用户点击某个 Spec change 卡片主区域
- **AND** 该 change 已绑定到仍存在的 terminal session
- **THEN** Terminal 侧边栏 SHALL 保持 `Spec` 模式
- **AND** 系统 SHALL 选中该 change 绑定的 terminal session
- **AND** 右侧 SHALL 显示该 terminal session 的终端内容
- **AND** 系统 SHALL NOT 自动切回 `Terminal` 模式

#### Scenario: 未绑定且只有一个 agent 候选
- **WHEN** 用户点击某个尚未绑定 terminal 的 Spec change 卡片主区域
- **AND** 该 change 所属项目下恰好只有一个 Codex、Claude Code 或 OpenCode agent 候选 terminal session
- **THEN** 系统 SHALL 将该 change 绑定到该 terminal session
- **AND** 系统 SHALL 选中该 terminal session
- **AND** 右侧 SHALL 显示该 terminal session 的终端内容
- **AND** Terminal 侧边栏 SHALL 保持 `Spec` 模式

#### Scenario: 未绑定且无法唯一判断目标 session
- **WHEN** 用户点击某个尚未绑定 terminal 的 Spec change 卡片主区域
- **AND** 该 change 所属项目下不存在唯一 agent 候选 terminal session
- **THEN** 系统 SHALL 展示轻量 terminal 选择器
- **AND** 选择器 SHALL 列出该项目下可用 terminal session
- **AND** 系统 SHALL NOT 在用户选择前切换右侧 terminal

#### Scenario: 用户选择绑定 terminal
- **WHEN** terminal 选择器已展示
- **AND** 用户选择某个 terminal session
- **THEN** 系统 SHALL 将该 Spec change 绑定到被选 session
- **AND** 系统 SHALL 选中该 terminal session
- **AND** 右侧 SHALL 显示该 terminal session 的终端内容
- **AND** Terminal 侧边栏 SHALL 保持 `Spec` 模式

#### Scenario: 用户修改已绑定 terminal
- **WHEN** 某个 Spec change 已绑定 terminal session
- **AND** 用户点击该 Spec change 卡片中的目标 terminal 入口
- **THEN** 系统 SHALL 展示轻量 terminal 选择器
- **AND** 用户选择新的 terminal session 后，系统 SHALL 用新 session 覆盖该 Spec change 的原有绑定
- **AND** 该入口 SHALL NOT 触发卡片主区域的 terminal 定位行为

#### Scenario: 下一步使用绑定 terminal
- **WHEN** 用户点击某个 Spec change 卡片的“下一步”入口
- **AND** 该 change 已绑定到仍存在的 terminal session
- **THEN** 系统 SHALL 将生成的 payload 发送到该绑定 terminal session
- **AND** 系统 SHALL NOT 因发送 payload 自动切换左侧侧边栏模式

#### Scenario: 目标 session 已关闭
- **WHEN** 用户点击 Spec change 卡片时其关联 terminal session 已不存在
- **THEN** 系统 SHALL NOT 创建新的 terminal session
- **AND** 系统 SHALL 清理失效绑定或忽略失效目标
- **AND** 系统 SHALL 以轻量反馈表达无法定位对应 terminal，或要求用户重新选择目标 terminal
