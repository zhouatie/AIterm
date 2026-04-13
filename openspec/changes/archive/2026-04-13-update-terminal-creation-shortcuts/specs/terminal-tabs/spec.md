## MODIFIED Requirements

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
