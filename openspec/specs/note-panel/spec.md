# Capability: note-panel

## Purpose
笔记面板以 overlay 形式覆盖在主工作区之上，提供围绕当前 Vault Explorer 的单文档工作台、层级导航、新建/重命名/删除笔记与文件夹，以及基础右键菜单与拖拽移动能力。

## Requirements
### Requirement: 笔记面板 Overlay 交互
笔记面板 SHALL 以 overlay 形式呈现，覆盖在主工作区之上，通过标题栏按钮或快捷键触发显隐。笔记面板与浏览器面板、Git Diff 面板 SHALL 互斥，同一时间只能打开一个 overlay。

#### Scenario: 通过标题栏按钮打开笔记面板
- **WHEN** 用户点击标题栏的笔记按钮
- **THEN** 系统 SHALL 以柔和过渡动画展示笔记面板
- **THEN** 若当前有其他 overlay 面板（浏览器或 Git Diff）处于打开状态，系统 SHALL 先关闭该面板

#### Scenario: 通过标题栏按钮关闭笔记面板
- **WHEN** 笔记面板已打开，用户再次点击标题栏的笔记按钮
- **THEN** 系统 SHALL 以对应的退出动画隐藏笔记面板

#### Scenario: 面板始终挂载不重新创建
- **WHEN** 用户多次打开和关闭笔记面板
- **THEN** 系统 SHALL 保持面板组件始终挂载在 DOM 中，通过 CSS transform 或等效方式控制显隐
- **THEN** 面板内的当前文件夹、当前文档与编辑状态 SHALL 在关闭后保留

### Requirement: 笔记工作台布局
笔记面板 SHALL 在 overlay 内部提供完整的单文档笔记工作台布局，至少包含当前 Vault Explorer 与编辑区两个区域，使用户能够先切换当前 Vault，再在该 Vault 内完成目录定位、文件浏览和编辑。

#### Scenario: 打开笔记工作台
- **WHEN** 用户打开笔记面板
- **THEN** 系统 SHALL 在 overlay 中展示当前 Vault Explorer 与编辑区
- **THEN** 当前 Vault Explorer 顶部 SHALL 展示当前 Vault 切换器、搜索框、`新建笔记`、`新建文件夹` 与 `更多` 入口
- **THEN** 左侧导航区域 SHALL 保持紧凑，不得压过编辑区的主视觉优先级
- **THEN** 若存在当前文档，编辑区 SHALL 直接展示该文档内容；否则 SHALL 展示空状态，引导用户选择或新建笔记

### Requirement: 单文档编辑流
笔记面板 SHALL 使用单文档编辑模型，同一时间仅展示一个当前文档，不再维护多标签页编辑状态。

#### Scenario: 切换当前文档
- **WHEN** 用户从导航树中选择另一个笔记
- **THEN** 系统 SHALL 将该笔记切换为当前文档并替换编辑区内容
- **THEN** 系统 SHALL 在切换前 flush 上一个当前文档的未保存内容

#### Scenario: 当前文档为空
- **WHEN** 当前没有可编辑的笔记文档
- **THEN** 编辑区 SHALL 展示空状态
- **THEN** 空状态 SHALL 提供至少一个显式操作用于新建笔记

### Requirement: 合并导航树
笔记工作台 SHALL 使用单一导航树承载当前 Vault 内的目录定位与结果浏览，不再提供 `最近`、`收藏`、`全部` 这类独立导航模式。

#### Scenario: 展示当前 Vault 目录树
- **WHEN** 用户打开笔记面板或切换当前 Vault
- **THEN** 导航树 SHALL 以当前激活 Vault 的文件夹层级为主展示该 Vault 下的 `.md` 文件和文件夹
- **THEN** 用户展开文件夹后 SHALL 在同一棵树中看到对应笔记文件

#### Scenario: 文件夹单击只选中
- **WHEN** 用户单击某个文件夹节点
- **THEN** 系统 SHALL 仅更新当前选中文件夹
- **THEN** 系统 SHALL 不得因为该次单击自动展开或收起该文件夹

#### Scenario: 高亮当前文档
- **WHEN** 某个笔记被打开为当前文档
- **THEN** 导航树 SHALL 高亮对应的笔记文件项

#### Scenario: 文件双击不触发重命名
- **WHEN** 用户双击某个笔记文件节点
- **THEN** 系统 SHALL 不得进入该文件的重命名状态
- **THEN** 该交互 SHALL 继续保持为文档打开流的一部分，而不是改名入口

#### Scenario: 文件夹双击不触发重命名
- **WHEN** 用户双击某个文件夹节点
- **THEN** 系统 SHALL 不得进入该文件夹的重命名状态
- **THEN** 该交互 SHALL 继续保持为目录定位流的一部分，而不是改名入口

### Requirement: 笔记文件列表工具栏
笔记工作台 SHALL 在当前 Vault Explorer 顶部提供一组高频操作入口，既支持当前 Vault 切换，也支持在当前选中文件夹下快速创建内容。

#### Scenario: 展示 Explorer 顶部控制条
- **WHEN** 笔记工作台渲染
- **THEN** 系统 SHALL 展示包含当前 Vault 切换器、搜索入口、新建笔记、新建文件夹与 `更多` 入口的顶部控制条

### Requirement: 笔记文件列表
笔记工作台 SHALL 保留强文件夹层级入口，并在当前激活 Vault 的导航树中展示该 Vault 根目录下的 `.md` 文件和文件夹。

#### Scenario: 加载当前 Vault 导航树
- **WHEN** 笔记面板首次打开或当前激活 Vault 发生变化
- **THEN** 系统 SHALL 扫描当前 Vault 根目录下的所有 `.md` 文件和文件夹（含空文件夹）并展示为树形结构
- **THEN** 导航树 SHALL 保持可展开与可折叠

#### Scenario: 定位当前文档所在目录
- **WHEN** 用户打开某个笔记为当前文档
- **THEN** 导航树 SHALL 保持该文档所在路径可见
- **THEN** 当前文档对应的文件项 SHALL 保持高亮

#### Scenario: 文件夹树交互与文件系统树对齐
- **WHEN** 用户在笔记工作台中操作导航树
- **THEN** 展开/收起、选中反馈、层级缩进和悬停动作 SHALL 与文件系统模块的文件树保持一致的交互语法
- **THEN** 文件夹的展开与收起 SHALL 仅由箭头触发

### Requirement: 笔记文件树右键菜单
笔记工作台 SHALL 为当前 Vault 文件树提供面向笔记场景的基础右键菜单，不再依赖树行 hover 按钮承载危险操作。

#### Scenario: 在空白区域打开右键菜单
- **WHEN** 用户在当前 Vault 文件树的空白区域点击右键
- **THEN** 系统 SHALL 展示至少包含 `新建笔记` 与 `新建文件夹` 的菜单项

#### Scenario: 在文件夹节点打开右键菜单
- **WHEN** 用户在某个文件夹节点上点击右键
- **THEN** 系统 SHALL 展示 `新建笔记`、`新建文件夹`、`重命名`、`删除`、`在 Finder 中显示` 这些基础菜单项

#### Scenario: 在笔记节点打开右键菜单
- **WHEN** 用户在某个笔记节点上点击右键
- **THEN** 系统 SHALL 展示 `打开`、`重命名`、`删除`、`在 Finder 中显示` 这些基础菜单项

### Requirement: 文件树拖拽移动
笔记工作台 SHALL 支持在当前 Vault 内把文件或文件夹节点拖拽移动到其他文件夹下。

#### Scenario: 文件与文件夹节点可被拖起
- **WHEN** 用户尝试拖拽某个笔记文件节点或文件夹节点
- **THEN** 系统 SHALL 允许该节点进入可移动的拖拽状态
- **THEN** 该拖拽状态 SHALL 仅用于把节点移动到其他文件夹下

#### Scenario: 将文件拖到另一个文件夹
- **WHEN** 用户把某个笔记文件拖拽到另一个文件夹节点上并完成释放
- **THEN** 系统 SHALL 将该文件移动到目标文件夹下
- **THEN** 导航树 SHALL 刷新并展示移动后的新路径

#### Scenario: 将文件夹拖到另一个文件夹
- **WHEN** 用户把某个文件夹节点拖拽到另一个文件夹节点上并完成释放
- **THEN** 系统 SHALL 将该文件夹及其子内容移动到目标文件夹下
- **THEN** 若被移动目录包含当前文档，系统 SHALL 同步更新当前文档与相关上下文路径

#### Scenario: 拒绝非法拖拽目标
- **WHEN** 用户尝试把文件夹拖入其自身或任意后代目录
- **THEN** 系统 SHALL 拒绝该次移动
- **THEN** 当前树结构与文档状态 SHALL 保持不变

### Requirement: 笔记文件搜索
系统 SHALL 支持在笔记工作台中按笔记标题搜索和过滤当前激活 Vault 下的导航树结果。

#### Scenario: 展示搜索输入框
- **WHEN** 用户触发搜索入口
- **THEN** 系统 SHALL 展示搜索输入框并聚焦

#### Scenario: 按标题过滤当前 Vault 树
- **WHEN** 用户在搜索输入框中输入关键词
- **THEN** 导航树 SHALL 仅展示标题包含该关键词的笔记结果及其必要祖先路径
- **THEN** 匹配 SHALL 不区分大小写
- **THEN** 当前 Vault 的导航结构 SHALL 保持可用，不额外拆出第二列结果区

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索输入框
- **THEN** 导航树 SHALL 恢复展示当前激活 Vault 下的完整结果集

### Requirement: 新建笔记
系统 SHALL 支持在笔记工作台中快速新建笔记。

#### Scenario: 新建笔记
- **WHEN** 用户点击新建笔记按钮
- **THEN** 系统 SHALL 在当前选中文件夹下创建 `未命名.md` 文件；若当前未选中文件夹，则 SHALL 在当前 Vault 根目录创建
- **THEN** 系统 SHALL 将新文件直接打开为当前文档并聚焦编辑器

#### Scenario: 新建笔记时文件名冲突
- **WHEN** 目标目录下已存在 `未命名.md`
- **THEN** 系统 SHALL 自动递增命名为 `未命名-1.md`、`未命名-2.md`，以此类推

### Requirement: 新建文件夹
系统 SHALL 支持在笔记工作台中新建文件夹，用于组织笔记。

#### Scenario: 新建文件夹
- **WHEN** 用户点击新建文件夹按钮
- **THEN** 系统 SHALL 在当前选中文件夹下创建 `新建文件夹` 目录；若当前未选中文件夹，则 SHALL 在当前 Vault 根目录创建
- **THEN** 文件夹树 SHALL 刷新并展示新文件夹
- **THEN** 新文件夹 SHALL 自动进入 inline 重命名编辑状态

#### Scenario: 新建文件夹时名称冲突
- **WHEN** 目标目录下已存在 `新建文件夹`
- **THEN** 系统 SHALL 自动递增命名为 `新建文件夹-1`、`新建文件夹-2`，以此类推

### Requirement: 重命名笔记
系统 SHALL 支持通过显式重命名入口对笔记文件执行行内重命名，不得把文件双击作为重命名触发方式。

#### Scenario: 从显式入口触发文件重命名
- **WHEN** 用户在右键菜单或其他显式重命名入口中对某个笔记触发重命名
- **THEN** 该名称 SHALL 变为 inline input 编辑状态，显示当前文件名（不含 `.md` 后缀）

#### Scenario: 确认重命名
- **WHEN** 用户在 inline input 中输入新名称后按 Enter
- **THEN** 系统 SHALL 将文件重命名为新名称（自动补 `.md` 后缀）
- **THEN** 导航树 SHALL 刷新展示新文件名
- **THEN** 若该文件当前正在编辑，编辑区中的标题与 filePath SHALL 同步更新

#### Scenario: 取消重命名
- **WHEN** 用户在 inline input 中按 Escape
- **THEN** 系统 SHALL 取消重命名，恢复原名称显示

#### Scenario: 重命名冲突
- **WHEN** 用户输入的新名称与同目录下已有文件重名
- **THEN** 系统 SHALL 阻止重命名并提示名称已存在

### Requirement: 重命名文件夹
系统 SHALL 支持通过显式重命名入口对文件夹执行行内重命名，不得把文件夹双击作为重命名触发方式。

#### Scenario: 从显式入口触发文件夹重命名
- **WHEN** 用户在右键菜单或其他显式重命名入口中对某个文件夹触发重命名
- **THEN** 该名称 SHALL 变为 inline input 编辑状态

#### Scenario: 确认文件夹重命名
- **WHEN** 用户在 inline input 中输入新名称后按 Enter
- **THEN** 系统 SHALL 将文件夹重命名为新名称
- **THEN** 导航树 SHALL 刷新展示新文件夹名
- **THEN** 若文件夹内有当前文档，相关 filePath SHALL 同步更新

#### Scenario: 文件夹重命名名称校验
- **WHEN** 用户输入的文件夹名包含 `/` 或 `\`
- **THEN** 系统 SHALL 阻止重命名并提示名称不合法

### Requirement: 删除笔记
系统 SHALL 支持在笔记工作台中删除笔记。

#### Scenario: 删除笔记
- **WHEN** 用户对某个笔记执行删除操作
- **THEN** 系统 SHALL 弹出确认提示
- **THEN** 用户确认后，系统 SHALL 删除对应的 `.md` 文件
- **THEN** 若该笔记当前正在编辑，系统 SHALL 清空当前文档或切换到同一结果列表中的相邻笔记
