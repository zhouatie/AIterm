# Capability: terminal-tabs

## Purpose
终端分组导航能力，提供基于 workspace / 终端会话的侧边双层结构、终端会话切换与关闭、以及围绕当前终端上下文自动更新标签名称的交互。
## Requirements
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

### Requirement: 新建终端 Tab
用户 SHALL 能够创建新的 workspace 或在现有 workspace 下创建新的终端会话。

#### Scenario: 点击新建按钮创建新的 workspace
- **WHEN** 用户点击终端导航上的 `+` 按钮
- **THEN** 系统 SHALL 创建一个新的一级节点，名称为下一个递增的 `workspace_{index}`
- **THEN** 系统 SHALL 在该一级节点下创建一个新的二级终端节点及其对应的 PTY 会话
- **THEN** 新创建的 workspace 与其二级终端节点 SHALL 自动成为当前可见焦点

#### Scenario: 从 workspace 菜单新增二级终端
- **WHEN** 用户在某个一级 workspace 节点的右键菜单中点击 `New Tab`
- **THEN** 系统 SHALL 在该 workspace 下创建一个新的二级终端节点和对应 PTY 会话
- **THEN** 新二级终端的初始工作目录 SHALL 继承该 workspace 当前绑定的路径；若无有效路径则回退到用户 HOME 目录

#### Scenario: 从一级节点悬停按钮新增二级终端
- **WHEN** 用户鼠标悬停某个一级 workspace 节点，点击其右侧显示的 `+` 按钮
- **THEN** 系统 SHALL 在该 workspace 下创建一个新的二级终端节点和对应 PTY 会话
- **THEN** 该行为 SHALL 与一级 workspace 右键菜单中的 `New Tab` 保持一致

#### Scenario: 快捷键在当前激活 workspace 下新增二级终端
- **WHEN** 用户按下“当前激活 workspace 下新增 terminal tab”快捷键
- **THEN** 系统 SHALL 在包含当前活跃 terminal 的 workspace 下创建一个新的二级终端节点和对应 PTY 会话
- **THEN** 新二级终端的初始工作目录 SHALL 继承该 workspace 当前绑定的路径；若无有效路径则回退到用户 HOME 目录
- **THEN** 该行为 SHALL 与当前激活 workspace 节点右侧的 `+` 按钮保持一致

#### Scenario: workspace 编号不回填
- **WHEN** 用户删除了较早创建的 workspace 后再次点击 `+`
- **THEN** 新 workspace 的 `{index}` SHALL 继续按递增计数生成
- **THEN** 系统 SHALL 不为了补洞而重命名现有 workspace

### Requirement: Tab 切换
用户 SHALL 能够通过二级终端节点切换终端会话，并通过一级 workspace 管理节点展开状态。切换到某个二级终端会话后，该会话的右侧 terminal viewport SHALL 默认滚动到 xterm.js 普通 buffer 底部，以展示最新输出。

#### Scenario: 点击二级终端节点切换会话
- **WHEN** 用户点击一个非活跃的二级终端节点
- **THEN** 该节点对应的终端会话 SHALL 成为活跃终端
- **AND** 对应终端内容 SHALL 显示在终端面板中
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 快捷键切换会话后滚动到底部
- **WHEN** 用户通过上一/下一 terminal tab 快捷键或编号快捷键切换到另一个二级终端
- **THEN** 目标终端会话 SHALL 成为活跃终端
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 外部入口激活会话后滚动到底部
- **WHEN** 用户通过 Agent Inbox、系统通知或 Spec Dashboard 激活某个 terminal session
- **THEN** 目标终端会话 SHALL 成为活跃终端
- **AND** 对应终端 viewport SHALL 自动滚动到普通 buffer 底部

#### Scenario: 切换时保留终端状态但不保留历史 viewport
- **WHEN** 用户在多个二级终端之间来回切换
- **THEN** 每个终端 SHALL 完整保留其输出历史和运行中的进程
- **AND** 系统 SHALL NOT 因切换向 PTY stdin 写入任何内容
- **AND** 重新激活的终端 SHALL 不保留切换前的历史 viewport 位置，而是显示普通 buffer 底部

#### Scenario: 当前活跃终端内手动回看仍可用
- **WHEN** 用户在当前活跃 terminal 中手动滚动回看历史输出
- **AND** 用户未切换到其他 terminal session
- **THEN** 系统 SHALL 保留用户当前查看的 viewport
- **AND** 用户 SHALL 仍可使用滚动到最上、滚动到最下控件或鼠标滚轮进行回看

#### Scenario: 点击一级 workspace 节点切换展开状态
- **WHEN** 用户点击某个一级 workspace 节点
- **THEN** 系统 SHALL 切换该 workspace 的展开 / 收起状态
- **AND** 此操作 SHALL 不直接切换当前活跃终端会话
- **AND** 此操作 SHALL NOT 改变当前活跃终端 viewport 位置

#### Scenario: 切换到隐藏后再显示的终端
- **WHEN** 用户切换到一个之前处于隐藏状态的二级终端
- **THEN** 该终端 SHALL 自动重新适配当前面板尺寸
- **AND** 该终端 SHALL 在尺寸适配与待消费输出写入完成后滚动到普通 buffer 底部

### Requirement: 关闭终端 Tab
用户 SHALL 能够关闭二级终端节点，关闭时销毁对应 PTY 会话并维护 workspace 结构完整性。

#### Scenario: 关闭二级终端
- **WHEN** 用户关闭某个二级终端节点
- **THEN** 系统 SHALL 销毁该节点对应的 PTY 进程并释放资源
- **THEN** 该二级节点 SHALL 从其所属 workspace 中移除

#### Scenario: 关闭活跃二级终端后自动切换
- **WHEN** 用户关闭当前活跃的二级终端，且其所属 workspace 中还有其他二级节点
- **THEN** 系统 SHALL 自动切换到同一 workspace 中相邻的二级终端

#### Scenario: workspace 在最后一个子节点关闭后自动移除
- **WHEN** 某个一级 workspace 的最后一个二级终端被关闭
- **THEN** 该一级 workspace SHALL 一并从侧边导航中移除

#### Scenario: 关闭最后一个终端后自动补回默认 workspace
- **WHEN** 用户关闭应用内最后一个剩余的二级终端
- **THEN** 系统 SHALL 自动创建一个新的 `workspace_{index}` 与其首个二级终端，保证终端面板始终至少有一个可用终端

#### Scenario: 快捷键关闭当前二级终端
- **WHEN** 用户按下“关闭当前二级 terminal tab”快捷键
- **THEN** 系统 SHALL 关闭当前活跃的二级终端节点
- **THEN** 该行为 SHALL 与点击当前活跃 terminal tab 右侧关闭按钮保持一致

#### Scenario: 快捷键关闭当前 workspace
- **WHEN** 用户按下“关闭当前 workspace”快捷键
- **THEN** 系统 SHALL 关闭当前 workspace 下的所有二级终端节点，并销毁其对应 PTY 会话
- **THEN** 当前 workspace SHALL 从侧边导航中移除
- **THEN** 若关闭后应用内已无任何 workspace，系统 SHALL 自动创建一个新的 `workspace_{index}` 与其首个二级终端

### Requirement: 终端实例生命周期管理
每个二级终端节点对应的终端实例 SHALL 独立管理自己的 xterm.js 和 PTY 生命周期。

#### Scenario: 终端实例挂载
- **WHEN** 一个新的二级终端被创建
- **THEN** 系统 SHALL 创建一个独立的 xterm.js 实例并绑定到独立的 PTY 会话

#### Scenario: 非活跃终端保持连接
- **WHEN** 一个二级终端处于非活跃状态
- **THEN** 其 PTY 进程 SHALL 继续运行，xterm.js 实例 SHALL 保持挂载但不可见

#### Scenario: 终端切换或侧边栏宽度变化时适配尺寸
- **WHEN** 用户切换活跃终端或收起 / 展开侧边导航导致终端内容区宽度变化
- **THEN** 当前活跃终端 SHALL 自动重新适配当前面板尺寸

#### Scenario: 节点关闭时清理资源
- **WHEN** 一个二级终端节点被关闭
- **THEN** 系统 SHALL 销毁对应的 xterm.js 实例并通过 IPC 销毁 PTY 会话

### Requirement: Workspace 右键菜单
terminal tab SHALL 提供与文件树一致的右键菜单能力；一级 workspace 在通用路径菜单基础上额外提供 workspace 级操作。

#### Scenario: 一级 workspace 菜单包含额外操作
- **WHEN** 用户在一级 workspace 节点上点击右键
- **THEN** 菜单 SHALL 包含文件树已有的通用路径动作
- **THEN** 菜单 SHALL 额外包含 `New Tab` 与 `Rename`

#### Scenario: 二级终端菜单复用通用路径动作
- **WHEN** 用户在二级终端节点上点击右键
- **THEN** 菜单 SHALL 复用文件树右键菜单的通用路径动作
- **THEN** 菜单 SHALL 保持与文件树右键菜单一致的视觉样式与交互方式

#### Scenario: 通过菜单重命名 workspace
- **WHEN** 用户在一级 workspace 菜单中点击 `Rename`
- **THEN** 该一级节点 SHALL 进入可编辑状态，允许用户修改展示名称
- **THEN** 重命名结果 SHALL 保留，直到用户再次手动修改

### Requirement: 终端上下文驱动二级标签名称
系统 SHALL 根据终端当前上下文自动维护二级标签名称，同时允许用户手动重命名二级标签覆盖自动命名，并保持一级 workspace 名称稳定。

#### Scenario: git 仓库中显示分支名
- **WHEN** 某个二级终端当前目录位于 git 仓库内，且能够解析到当前分支名
- **THEN** 该二级节点名称 SHALL 显示该分支名

#### Scenario: 非 git 目录显示路径最后一级名称
- **WHEN** 某个二级终端当前目录不在 git 仓库内
- **THEN** 该二级节点名称 SHALL 显示当前目录路径的最后一级名称

#### Scenario: cwd 变化驱动二级名称同步
- **WHEN** 某个终端会话的 cwd 发生变化，且新的 git / 路径上下文与之前不同
- **THEN** 该二级节点名称 SHALL 自动更新为新的显示值

#### Scenario: 手动重命名当前二级 terminal tab
- **WHEN** 用户触发“重命名当前二级 terminal tab”快捷键
- **THEN** 当前活跃的二级 terminal tab SHALL 进入可编辑状态，允许用户修改展示名称
- **THEN** 用户提交后的名称 SHALL 覆盖自动基于 cwd / git 分支生成的标签名称

#### Scenario: 手动名称覆盖自动上下文更新
- **WHEN** 某个已手动重命名的二级 terminal tab 后续 cwd 或 git 分支发生变化
- **THEN** 系统 SHALL 保持该二级 terminal tab 的手动名称不变

#### Scenario: 一级 workspace 名称不随 cwd 自动变化
- **WHEN** 某个 workspace 下任意终端会话的 cwd 发生变化
- **THEN** 该 workspace 的一级名称 SHALL 保持不变
- **THEN** 系统 SHALL 仅更新其路径上下文与受影响的二级节点名称

### Requirement: Tab 自动滚动到可视区域
当新建、切换或展开 workspace 时，系统 SHALL 自动保证目标节点位于侧边导航的可视区域内。

#### Scenario: 新建 workspace 后自动滚动
- **WHEN** 用户点击 `+` 新建一个 workspace
- **THEN** 侧边导航 SHALL 自动滚动到目标位置，确保新建的一组节点可见

#### Scenario: 切换到不可见的二级终端时自动滚动
- **WHEN** 用户切换到一个当前不在可视区域内的二级终端节点
- **THEN** 系统 SHALL 将该节点平滑滚动到可视区域内

#### Scenario: 展开 workspace 后显示其活跃子节点
- **WHEN** 用户展开一个当前被折叠的 workspace，且其活跃二级节点不在可视区域内
- **THEN** 系统 SHALL 自动滚动，使该活跃二级节点进入可视区域

#### Scenario: 侧边栏重新展开后保持目标节点可见
- **WHEN** 用户重新展开 terminal 侧边 tab 栏，且当前活跃二级终端节点不在可视区域内
- **THEN** 系统 SHALL 自动滚动，使当前活跃节点进入可视区域

### Requirement: terminal 导航快捷键
terminal 面板 SHALL 支持通过当前配置的快捷键触发导航区域显隐、workspace / terminal tab 的创建、重命名与关闭动作。

#### Scenario: 快捷键切换 terminal 侧边栏展示状态
- **WHEN** 用户按下“terminal tab 侧边栏展示/收起”快捷键
- **THEN** 系统 SHALL 在 terminal 侧边导航的收起态与展开态之间切换

#### Scenario: 快捷键新增 workspace
- **WHEN** 用户按下“新增 workspace”快捷键
- **THEN** 系统 SHALL 创建一个新的 `workspace_{index}` 及其首个二级终端
- **THEN** 新创建的 workspace SHALL 自动成为当前活跃上下文

#### Scenario: 快捷键在当前激活 workspace 下新增 terminal tab
- **WHEN** 用户按下“当前激活 workspace 下新增 terminal tab”快捷键
- **THEN** 系统 SHALL 在包含当前活跃 terminal 的 workspace 下创建新的二级 terminal tab
- **THEN** 新创建的 terminal tab SHALL 自动成为当前活跃终端

#### Scenario: 快捷键重命名当前 workspace
- **WHEN** 用户按下“重命名当前 workspace”快捷键
- **THEN** 包含当前活跃 terminal 的 workspace SHALL 进入可编辑状态，允许用户修改其名称

#### Scenario: 快捷键重命名当前二级 terminal tab
- **WHEN** 用户按下“重命名当前二级 terminal tab”快捷键
- **THEN** 当前活跃的二级 terminal tab SHALL 进入可编辑状态，允许用户修改其名称

#### Scenario: 快捷键关闭当前二级 terminal tab
- **WHEN** 用户按下“关闭当前二级 terminal tab”快捷键
- **THEN** 系统 SHALL 关闭当前活跃的二级 terminal tab

#### Scenario: 快捷键关闭当前 workspace
- **WHEN** 用户按下“关闭当前 workspace”快捷键
- **THEN** 系统 SHALL 关闭包含当前活跃 terminal 的整个 workspace

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

### Requirement: 侧边栏切换控件布局
系统 SHALL 在不遮挡 terminal 内容区的前提下展示 terminal 侧边 tab 栏的收起 / 展开控件。

#### Scenario: 展开态将控件放入 tab 面板内侧
- **WHEN** terminal 侧边 tab 栏处于展开状态
- **THEN** 收起控件 SHALL 显示在 terminal tab 面板自身的可视边界内
- **THEN** 该控件 SHALL 不悬浮在 terminal 内容区之上

#### Scenario: 收起态保留稳定的展开入口
- **WHEN** terminal 侧边 tab 栏处于收起状态
- **THEN** 系统 SHALL 保留一个稳定可点击的展开入口
- **THEN** 该入口 SHALL 不遮挡 terminal 内容区的主要可视区域

#### Scenario: 切换控件不额外压缩终端内容
- **WHEN** 用户在 terminal 中查看普通输出或运行 TUI 应用时切换侧边 tab 栏
- **THEN** terminal 可见区域 SHALL 只受侧边栏本身宽度变化影响
- **THEN** 系统 SHALL 不因为切换控件的悬浮定位而额外覆盖终端内容

### Requirement: Terminal 侧边导航视觉层级
terminal 侧边导航 SHALL 以毛玻璃导航表面呈现 workspace 与二级 terminal tab，活跃 tab SHALL 以"卡片化浮起"效果脱离列表，非活跃 tab SHALL 大幅弱化存在感，两者之间形成显而易见的视觉层次差。

#### Scenario: 活跃 terminal tab 卡片化浮起
- **WHEN** 某个二级 terminal tab 对应当前活跃 session
- **THEN** 该节点 SHALL 使用三层外阴影（接触 + 中距 + 远距）营造"浮在侧边栏之上"的深度效果
- **THEN** 该节点 SHALL 使用顶部 inset 高光模拟顶部光源
- **THEN** 该节点 SHALL 使用独立的 `backdrop-filter` 毛玻璃效果，与侧边栏整体模糊叠加
- **THEN** 该节点背景 SHALL 使用高不透明度半透明色（light ≥ 0.90，dark ≥ 0.96），使卡片比侧边栏背景更"实"
- **THEN** 该节点 SHALL 通过 box-shadow 的视觉扩展与统一的上下 margin 共同营造与相邻非活跃 tab 的视觉间距感（视觉间距 ≥ 3px）

#### Scenario: Tab 切换零布局抖动
- **WHEN** 用户在二级 terminal tab 之间切换活跃状态
- **THEN** 所有 tab 行的总垂直占位（height + marginTop + marginBottom）SHALL 保持恒定，不因活跃状态变化而改变
- **THEN** 列表中未参与切换的 tab 行位置 SHALL 不发生任何位移

#### Scenario: 非活跃 terminal tab 大幅弱化
- **WHEN** 某个二级 terminal tab 不是当前活跃 session
- **THEN** 该节点文字 SHALL 使用大幅降低不透明度的颜色（原色的约 50-60%），通过 CSS 自定义属性定义
- **THEN** 该节点左侧指示点 SHALL 使用同等弱化的颜色
- **THEN** 该节点 SHALL 不使用外阴影、内发光或独立毛玻璃
- **THEN** 该节点背景 SHALL 保持透明

#### Scenario: 悬停非活跃 tab 提供预示性阴影反馈
- **WHEN** 用户悬停一个非活跃的二级 terminal tab
- **THEN** 该节点 SHALL 显示两层柔和阴影（弱于活跃态阴影）
- **THEN** 该节点背景 SHALL 提亮至 hover 状态色
- **THEN** 过渡动效 SHALL 使用约 200ms ease-out
- **THEN** 行内操作按钮的出现 SHALL 不导致列表文本跳动或节点宽度突变

#### Scenario: workspace 与 terminal tab 具有清晰层级
- **WHEN** terminal 侧边导航处于展开状态
- **THEN** 一级 workspace 节点 SHALL 通过更稳的字重、图标和表面层级与二级 terminal tab 区分
- **THEN** 二级 terminal tab SHALL 保持更轻的密度与更弱的背景存在感，避免与一级节点争抢视觉重点

#### Scenario: 侧边栏毛玻璃通透感
- **WHEN** terminal 侧边导航渲染
- **THEN** 侧边栏背景 SHALL 使用足够低的不透明度（light ≤ 0.60, dark ≤ 0.70）使背后 terminal 内容隐约可见
- **THEN** 侧边栏 SHALL 使用 ≥ 24px 的 blur 值和 ≥ 180% 的 saturate 值增强毛玻璃质感
- **THEN** 侧边栏顶部 SHALL 有 inset 高光线增加"玻璃板"边缘感

### Requirement: Terminal 导航状态提示协调
terminal 导航中的激活态、agent status 提示与收起 / 展开入口 SHALL 使用协调一致的视觉语言，不得相互争抢用户注意力。

#### Scenario: agent status 提示独立于活跃态
- **WHEN** 某个终端存在 agent status 提示，且该终端不是当前活跃项
- **THEN** agent status 提示 SHALL 以独立但克制的方式可见
- **THEN** 该提示 SHALL 不覆盖或替代活跃 terminal tab 的焦点表达规则

#### Scenario: 收起展开入口与侧边导航风格统一
- **WHEN** terminal 侧边导航处于展开或收起状态
- **THEN** 对应的收起 / 展开入口 SHALL 与导航表面使用一致的描边、背景与 hover 规则
- **THEN** 该入口 SHALL 看起来属于终端工作台界面的一部分，而不是额外悬浮的小部件

#### Scenario: agent status 状态变化不造成 tab 抖动
- **WHEN** terminal tab 的 agent status 在 `running`、`completed`、`needs_user`、`error` 或无状态之间变化
- **THEN** terminal tab 的文本、关闭按钮和整体宽度 SHALL 保持稳定
- **THEN** 状态标识 SHALL 使用固定尺寸的视觉槽位呈现

### Requirement: Terminal tab agent status 标识
terminal 二级 tab SHALL 在固定位置展示 agent 当前状态标识，让用户在执行中、执行完成、待确认和错误状态之间建立清晰区分。

#### Scenario: running 状态展示低干扰动效
- **WHEN** terminal session 的 agent status 为 `running`
- **THEN** 对应二级 tab SHALL 展示执行中的标识
- **THEN** 该标识 SHALL 使用低干扰动画或呼吸效果表示 agent 正在工作

#### Scenario: completed 状态展示完成反馈
- **WHEN** terminal session 的 agent status 为 `completed`
- **THEN** 对应二级 tab SHALL 展示完成标识
- **THEN** 该标识 SHALL 与错误和待确认状态有明确视觉区分

#### Scenario: needs_user 状态展示待确认反馈
- **WHEN** terminal session 的 agent status 为 `needs_user`
- **THEN** 对应二级 tab SHALL 展示需要用户介入的标识
- **THEN** 该标识 SHALL 在多个状态中拥有最高视觉优先级

#### Scenario: error 状态展示错误反馈
- **WHEN** terminal session 的 agent status 为 `error`
- **THEN** 对应二级 tab SHALL 展示错误标识
- **THEN** 该标识 SHALL 与 completed 状态有明确视觉区分

#### Scenario: 无状态保持原有 tab 表达
- **WHEN** terminal session 没有 agent status 或状态被清除
- **THEN** 对应二级 tab SHALL 保持原有活跃 / 非活跃视觉语义

### Requirement: Agent status 详情展示
terminal tab SHALL 在不增加常驻文本噪音的前提下提供 agent status 详情。

#### Scenario: 悬停状态标识显示详情
- **WHEN** 用户悬停 terminal tab 上的 agent status 标识
- **THEN** 系统 SHALL 显示包含 agent 名称和状态消息的 tooltip 或等效轻量提示

#### Scenario: tab 主体不常驻展示 agent 名称
- **WHEN** terminal tab 存在 agent status
- **THEN** tab 主体 SHALL NOT 常驻显示 Codex、Claude Code 或 OpenCode 名称文本
- **THEN** tab 主体 SHALL 保持 terminal 名称为主要文本内容

### Requirement: 收起侧边栏聚合状态提示
terminal 侧边栏收起时 SHALL 在展开入口上展示可见的聚合 agent status 提示。

#### Scenario: 收起时存在待确认状态
- **WHEN** terminal 侧边栏处于收起状态且任一 session 具有 `needs_user` 状态
- **THEN** 展开入口 SHALL 展示待确认聚合标识

#### Scenario: 收起时存在错误状态
- **WHEN** terminal 侧边栏处于收起状态且任一 session 具有 `error` 状态，且没有 `needs_user` 状态
- **THEN** 展开入口 SHALL 展示错误聚合标识

#### Scenario: 收起时存在运行状态
- **WHEN** terminal 侧边栏处于收起状态且任一 session 具有 `running` 状态，且没有 `needs_user` 或 `error` 状态
- **THEN** 展开入口 SHALL 展示执行中聚合标识

#### Scenario: 收起时存在完成状态
- **WHEN** terminal 侧边栏处于收起状态且任一 session 具有 `completed` 状态，且没有更高优先级状态
- **THEN** 展开入口 SHALL 展示完成聚合标识

#### Scenario: 展开侧边栏不清除状态
- **WHEN** 用户通过展开入口展开 terminal 侧边栏
- **THEN** 系统 SHALL 保留各 terminal tab 上的 agent status
- **THEN** 系统 SHALL NOT 仅因展开侧边栏而清除状态

### Requirement: Agent status 视觉优先级
terminal 导航 SHALL 使用统一优先级决定同一入口上的 agent status 表达。

#### Scenario: 多状态聚合时按优先级选择
- **WHEN** 一个聚合入口需要代表多个 terminal session 的 agent status
- **THEN** 系统 SHALL 按 `needs_user`、`error`、`running`、`completed`、`idle` 的顺序选择展示状态

#### Scenario: active 与 needs_user 同时存在
- **WHEN** 当前活跃 terminal tab 收到 `needs_user` 状态
- **THEN** terminal tab SHALL 同时保留活跃态表达和待确认状态标识
- **THEN** 待确认状态标识 SHALL 不被活跃态背景吞没

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

### Requirement: Terminal tab 编号直跳快捷键
terminal 面板 SHALL 支持通过编号快捷键直接跳转到指定位置的二级 terminal tab。

#### Scenario: 按编号跳转到对应 terminal tab
- **WHEN** 用户按下编号跳转快捷键（`Command + 1` 至 `Command + 8`）
- **THEN** 系统 SHALL 以侧边导航从上到下展开后的扁平顺序为序号基准
- **THEN** 系统 SHALL 将对应序号位置（1-based）的二级 terminal tab 设为活跃终端
- **THEN** 若该序号超出当前 tab 总数，系统 SHALL 静默不执行任何操作

#### Scenario: Command + 9 跳转到最后一个 terminal tab
- **WHEN** 用户按下 `Command + 9`
- **THEN** 系统 SHALL 将最后一个二级 terminal tab（无论总数量）设为活跃终端
- **THEN** 若当前只有一个 terminal tab，系统 SHALL 保持该 tab 为活跃状态

#### Scenario: 折叠 workspace 内的 tab 参与编号计数
- **WHEN** 某个 workspace 处于折叠状态
- **THEN** 该 workspace 下的二级 terminal tab SHALL 仍按侧边导航中的视觉顺序参与编号
- **THEN** 按编号快捷键跳转到折叠 workspace 内的 tab 时，系统 SHALL 切换到该终端
- **THEN** 系统 SHALL 不因为快捷键跳转而强制展开该 workspace

#### Scenario: 跳转时保持终端状态
- **WHEN** 用户通过编号快捷键跳转到某个二级 terminal tab
- **THEN** 目标终端 SHALL 获得键盘焦点，后续输入 SHALL 进入该终端
- **THEN** 目标终端 SHALL 保留其输出历史、滚动位置和运行中的进程

### Requirement: 按住 Command 时显示 tab 跳转序号
按住 `Command` 键期间，terminal 侧边导航 SHALL 在每个二级 terminal tab 节点前临时显示其对应的跳转序号，以辅助用户定位目标 tab 后使用编号快捷键直跳。

#### Scenario: 按住 Command 时序号出现
- **WHEN** 用户按下并持续按住 `Command` 键
- **THEN** 侧边导航中每个二级 terminal tab 节点前 SHALL 显示其跳转序号
- **THEN** 序号 SHALL 与 `select-terminal-tab-1…9` 快捷键的目标位置完全对应：第 1–8 个 tab 显示 `1`–`8`，最后一个 tab 显示 `9`
- **THEN** 超出前 8 个且不是最后一个的 tab SHALL 不显示序号
- **THEN** 序号 SHALL 使用克制的视觉样式（muted 色、等宽字体），不遮挡或替代 tab 名称

#### Scenario: 松开 Command 时序号消失
- **WHEN** 用户松开 `Command` 键
- **THEN** 所有 tab 序号 SHALL 立即消失，侧边栏恢复默认视图

#### Scenario: 窗口失焦时序号自动隐藏
- **WHEN** 应用窗口失去焦点（如用户通过 `Cmd+Tab` 切换到其他应用）
- **THEN** 系统 SHALL 重置按键状态，侧边栏序号 SHALL 消失
- **THEN** 用户返回应用后，侧边栏 SHALL 处于无序号的默认视图

#### Scenario: 序号区域固定宽度不引起布局抖动
- **WHEN** 序号在显示与隐藏之间切换
- **THEN** tab 名称文字的横向位置 SHALL 保持稳定，不因序号出现或消失而发生偏移

#### Scenario: 侧边栏收起时不受影响
- **WHEN** terminal 侧边栏处于收起状态，用户按住 `Command` 键
- **THEN** 系统 SHALL 不做任何特殊处理（侧边栏不可见，序号无从显示）
- **THEN** `Command` 键的其他快捷键功能 SHALL 正常工作

### Requirement: Terminal 侧边 tab 栏收起/展开动画无 layout reflow
Terminal 侧边 tab 栏的收起与展开动画 SHALL 使用 compositor-only CSS 属性驱动，不得触发浏览器 layout reflow，以保证动画过程中不出现可感知的卡顿或帧率下降。

#### Scenario: 收起动画使用 compositor-only 属性
- **WHEN** 用户触发 terminal 侧边 tab 栏收起
- **THEN** 侧边栏内容 SHALL 通过 CSS `transform` 属性滑出视口
- **THEN** 动画进行期间（约 180ms）侧边栏容器的 `width` SHALL 保持不变，不得提前归零
- **THEN** 动画完成后侧边栏容器 SHALL 将 `width` 瞬间切换为 0，释放布局空间

#### Scenario: 展开动画从正确起点滑入
- **WHEN** 用户触发 terminal 侧边 tab 栏展开
- **THEN** 侧边栏容器 SHALL 立即恢复目标宽度
- **THEN** 侧边栏内容 SHALL 通过 CSS `transform` 属性从隐藏位置平滑滑入

#### Scenario: 收起动画期间不触发子组件级联重渲染
- **WHEN** terminal 侧边 tab 栏收起动画正在进行
- **THEN** 动画期间内层组件的 ResizeObserver 回调 SHALL NOT 被触发
- **THEN** 动画期间 SHALL NOT 因布局属性变化导致 React 级联重渲染

#### Scenario: 动画一致性
- **WHEN** terminal 侧边 tab 栏执行收起或展开动画
- **THEN** 动画时长 SHALL 约为 180ms
- **THEN** 动画缓动函数 SHALL 使用 ease
- **THEN** 动画表现 SHALL 与文件预览面板的收起/展开动画保持一致的流畅度

### Requirement: terminal tab 拖动排序
terminal 面板 SHALL 支持通过拖动二级 terminal tab 调整其在所属 workspace 内的显示顺序，且排序完成后保持原会话可用。

#### Scenario: 在同一 workspace 内向前重排 terminal tab
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到同一 workspace 中另一个 terminal tab 之前
- **THEN** 系统 SHALL 按放置结果更新该 workspace 下二级 terminal tab 的顺序
- **THEN** 被移动 terminal tab 对应的 PTY 会话 SHALL 继续运行，不得被销毁或重建

#### Scenario: 在同一 workspace 内向后重排 terminal tab
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到同一 workspace 中另一个 terminal tab 之后
- **THEN** 系统 SHALL 以放置后的顺序重排该 workspace 下的二级 terminal tab
- **THEN** 当前活跃 terminal 会话 SHALL 保持原样，除非用户主动切换

#### Scenario: 取消拖动后顺序不变
- **WHEN** 用户开始拖动某个二级 terminal tab，但在未命中有效放置目标时取消拖动
- **THEN** 系统 SHALL 保持原有 workspace 结构和二级 terminal tab 顺序不变

### Requirement: terminal tab 跨 workspace 拖动
terminal 面板 SHALL 支持将二级 terminal tab 拖动到其他已有 workspace，并在放置后维护 workspace 结构与活跃态一致性。

#### Scenario: 将 terminal tab 移动到另一个 workspace
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到另一个已有 workspace 的 session 列表中
- **THEN** 系统 SHALL 将该 terminal tab 从源 workspace 移除并插入目标 workspace 的放置位置
- **THEN** 该 terminal tab 对应的 PTY 会话 SHALL 继续运行，不得被销毁或重建

#### Scenario: 拖动活跃 terminal tab 到其他 workspace
- **WHEN** 用户将当前活跃的二级 terminal tab 拖动到另一个已有 workspace
- **THEN** 系统 SHALL 保持该 terminal tab 仍为当前活跃终端
- **THEN** 系统 SHALL 使其移动后的所属 workspace 保持可见，便于用户识别新的归属

#### Scenario: 源 workspace 因移动而为空时自动移除
- **WHEN** 用户将某个 workspace 中最后一个剩余的二级 terminal tab 拖动到其他 workspace
- **THEN** 系统 SHALL 自动移除已无任何二级 terminal tab 的源 workspace
- **THEN** 若应用内仍存在其他 workspace，系统 SHALL 不额外创建新的默认 workspace

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
