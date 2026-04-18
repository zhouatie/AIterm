## ADDED Requirements

### Requirement: 笔记工作台布局
笔记面板 SHALL 在 overlay 内部提供完整的单文档笔记工作台布局，至少包含 icon 视图栏、合并导航树和编辑区三个区域，使用户能够在同一空间内完成视图切换、层级定位、结果浏览和编辑。

#### Scenario: 打开笔记工作台
- **WHEN** 用户打开笔记面板
- **THEN** 系统 SHALL 在 overlay 中展示 icon 视图栏、合并导航树和编辑区
- **THEN** 视图栏 SHALL 提供 `最近`、`收藏`、`全部` 三个入口，并以 icon 形式呈现
- **THEN** 左侧导航区域 SHALL 保持紧凑，不得压过编辑区的主视觉优先级
- **THEN** 若存在当前文档，编辑区 SHALL 直接展示该文档内容；否则 SHALL 展示空状态，引导用户选择或新建笔记

### Requirement: 单文档编辑流
笔记面板 SHALL 使用单文档编辑模型，同一时间仅展示一个当前文档，不再维护多标签页编辑状态。

#### Scenario: 切换当前文档
- **WHEN** 用户从文件夹树或笔记列表中选择另一个笔记
- **THEN** 系统 SHALL 将该笔记切换为当前文档并替换编辑区内容
- **THEN** 系统 SHALL 在切换前 flush 上一个当前文档的未保存内容

#### Scenario: 当前文档为空
- **WHEN** 当前没有可编辑的笔记文档
- **THEN** 编辑区 SHALL 展示空状态
- **THEN** 空状态 SHALL 提供至少一个显式操作用于新建笔记

### Requirement: 合并导航树
笔记工作台 SHALL 使用单一导航树承载目录定位与结果浏览，不再拆分独立的文件夹树与笔记列表区域。

#### Scenario: 全部视图展示目录树
- **WHEN** 用户处于 `全部` 视图
- **THEN** 导航树 SHALL 以文件夹层级为主展示笔记目录下的 `.md` 文件和文件夹
- **THEN** 用户展开文件夹后 SHALL 在同一棵树中看到对应笔记文件

#### Scenario: 最近或收藏视图切换导航树结果
- **WHEN** 用户切换到 `最近` 或 `收藏` 视图
- **THEN** 导航树 SHALL 切换为对应结果集的单一树状或扁平结果表现
- **THEN** 系统 SHALL 不再额外展示独立的笔记列表列

#### Scenario: 高亮当前文档
- **WHEN** 某个笔记被打开为当前文档
- **THEN** 导航树 SHALL 高亮对应的笔记文件项

## MODIFIED Requirements

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
- **THEN** 面板内的当前视图、当前文件夹、当前文档与编辑状态 SHALL 在关闭后保留

### Requirement: 笔记文件列表工具栏
笔记工作台 SHALL 在导航区域提供一组高频操作入口，操作风格与现有工作区保持一致。

#### Scenario: 展示导航工具栏
- **WHEN** 笔记工作台渲染
- **THEN** 系统 SHALL 展示包含新建笔记、新建文件夹和搜索入口的工具栏

### Requirement: 笔记文件列表
笔记工作台 SHALL 保留强文件夹层级入口，并在导航树中展示笔记目录下的 `.md` 文件和文件夹。

#### Scenario: 加载导航树
- **WHEN** 笔记面板首次打开或笔记目录路径变更
- **THEN** 系统 SHALL 扫描笔记目录下的所有 `.md` 文件和文件夹（含空文件夹）并展示为树形结构
- **THEN** 导航树 SHALL 保持可展开与可折叠

#### Scenario: 定位当前文档所在目录
- **WHEN** 用户打开某个笔记为当前文档
- **THEN** 导航树 SHALL 保持该文档所在路径可见
- **THEN** 当前文档对应的文件项 SHALL 保持高亮

#### Scenario: 文件夹树交互与文件系统树对齐
- **WHEN** 用户在笔记工作台中操作导航树
- **THEN** 展开/收起、选中反馈、层级缩进和悬停动作 SHALL 与文件系统模块的文件树保持一致的交互语法
- **THEN** 导航树中的快捷操作 SHALL 继续服务于笔记场景，但显隐与触发方式 SHALL 对齐文件系统文件树的交互习惯

### Requirement: 笔记文件搜索
系统 SHALL 支持在笔记工作台中按笔记标题搜索和过滤当前视图下的导航树结果。

#### Scenario: 展示搜索输入框
- **WHEN** 用户触发搜索入口
- **THEN** 系统 SHALL 展示搜索输入框并聚焦

#### Scenario: 按标题过滤当前列表
- **WHEN** 用户在搜索输入框中输入关键词
- **THEN** 导航树 SHALL 仅展示标题包含该关键词的笔记结果
- **THEN** 匹配 SHALL 不区分大小写
- **THEN** 当前视图的导航结构 SHALL 保持可用，不额外拆出第二列结果区

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索输入框
- **THEN** 导航树 SHALL 恢复展示当前视图下的完整结果集

### Requirement: 新建笔记
系统 SHALL 支持在笔记工作台中快速新建笔记。

#### Scenario: 新建笔记
- **WHEN** 用户点击新建笔记按钮
- **THEN** 系统 SHALL 在当前选中文件夹下创建 `未命名.md` 文件；若当前未选中文件夹，则 SHALL 在笔记根目录创建
- **THEN** 系统 SHALL 将新文件直接打开为当前文档并聚焦编辑器

#### Scenario: 新建笔记时文件名冲突
- **WHEN** 目标目录下已存在 `未命名.md`
- **THEN** 系统 SHALL 自动递增命名为 `未命名-1.md`、`未命名-2.md`，以此类推

### Requirement: 新建文件夹
系统 SHALL 支持在笔记工作台中新建文件夹，用于组织笔记。

#### Scenario: 新建文件夹
- **WHEN** 用户点击新建文件夹按钮
- **THEN** 系统 SHALL 在当前选中文件夹下创建 `新建文件夹` 目录；若当前未选中文件夹，则 SHALL 在笔记根目录创建
- **THEN** 文件夹树 SHALL 刷新并展示新文件夹
- **THEN** 新文件夹 SHALL 自动进入 inline 重命名编辑状态

#### Scenario: 新建文件夹时名称冲突
- **WHEN** 目标目录下已存在 `新建文件夹`
- **THEN** 系统 SHALL 自动递增命名为 `新建文件夹-1`、`新建文件夹-2`，以此类推

### Requirement: 重命名笔记
系统 SHALL 支持通过行内编辑方式重命名笔记文件。

#### Scenario: 触发重命名
- **WHEN** 用户在文件夹树或笔记列表中对某个笔记触发重命名
- **THEN** 该名称 SHALL 变为 inline input 编辑状态，显示当前文件名（不含 `.md` 后缀）

#### Scenario: 确认重命名
- **WHEN** 用户在 inline input 中输入新名称后按 Enter
- **THEN** 系统 SHALL 将文件重命名为新名称（自动补 `.md` 后缀）
- **THEN** 文件夹树与笔记列表 SHALL 刷新展示新文件名
- **THEN** 若该文件当前正在编辑，编辑区中的标题与 filePath SHALL 同步更新

#### Scenario: 取消重命名
- **WHEN** 用户在 inline input 中按 Escape
- **THEN** 系统 SHALL 取消重命名，恢复原名称显示

#### Scenario: 重命名冲突
- **WHEN** 用户输入的新名称与同目录下已有文件重名
- **THEN** 系统 SHALL 阻止重命名并提示名称已存在

### Requirement: 删除笔记
系统 SHALL 支持在笔记工作台中删除笔记。

#### Scenario: 删除笔记
- **WHEN** 用户对某个笔记执行删除操作
- **THEN** 系统 SHALL 弹出确认提示
- **THEN** 用户确认后，系统 SHALL 删除对应的 `.md` 文件
- **THEN** 若该笔记当前正在编辑，系统 SHALL 清空当前文档或切换到同一结果列表中的相邻笔记

## REMOVED Requirements

### Requirement: 笔记 Tab 管理
**Reason**: 第一阶段改为单文档编辑模型，避免多标签页带来的状态复杂度与交互噪音。
**Migration**: 用户通过文件夹树或笔记列表切换当前文档；切换文档前系统需自动保存上一份文档的未保存内容。
**Migration**: 用户通过导航树切换当前文档；切换文档前系统需自动保存上一份文档的未保存内容。
