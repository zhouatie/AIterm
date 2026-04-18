## ADDED Requirements

### Requirement: 笔记面板 Overlay 交互
笔记面板 SHALL 以 overlay 形式呈现，覆盖在主工作区之上，通过标题栏按钮或快捷键触发显隐。笔记面板与浏览器面板、Git Diff 面板 SHALL 互斥，同一时间只能打开一个 overlay。

#### Scenario: 通过标题栏按钮打开笔记面板
- **WHEN** 用户点击标题栏的笔记按钮
- **THEN** 系统 SHALL 以从顶部滑入的动画展示笔记面板
- **THEN** 若当前有其他 overlay 面板（浏览器或 Git Diff）处于打开状态，系统 SHALL 先关闭该面板

#### Scenario: 通过标题栏按钮关闭笔记面板
- **WHEN** 笔记面板已打开，用户再次点击标题栏的笔记按钮
- **THEN** 系统 SHALL 以向上滑出的动画隐藏笔记面板

#### Scenario: 面板始终挂载不重新创建
- **WHEN** 用户多次打开和关闭笔记面板
- **THEN** 系统 SHALL 保持面板组件始终挂载在 DOM 中，通过 CSS transform 控制显隐
- **THEN** 面板内的编辑状态（打开的 Tab、编辑内容）SHALL 在关闭后保留

### Requirement: 笔记 Tab 管理
笔记面板 SHALL 支持多 Tab 编辑，每个 Tab 对应一个笔记文件。

#### Scenario: 从文件列表打开笔记
- **WHEN** 用户在左侧笔记列表中点击某个笔记文件
- **THEN** 若该文件尚未在任何 Tab 中打开，系统 SHALL 创建新 Tab 并加载文件内容
- **THEN** 若该文件已在某个 Tab 中打开，系统 SHALL 切换到该 Tab

#### Scenario: 关闭 Tab
- **WHEN** 用户点击 Tab 上的关闭按钮
- **THEN** 系统 SHALL 在关闭前 flush 该 Tab 对应笔记的未保存内容
- **THEN** 系统 SHALL 关闭该 Tab 并激活相邻 Tab（优先左侧，无则右侧）

#### Scenario: 关闭最后一个 Tab
- **WHEN** 用户关闭笔记面板中唯一的 Tab
- **THEN** 系统 SHALL 展示空状态提示，引导用户从列表选择或新建笔记

#### Scenario: 一键关闭所有 Tab
- **WHEN** 用户点击 Tab 栏中的"关闭所有标签"按钮
- **THEN** 系统 SHALL flush 所有已打开且有未保存修改的笔记
- **THEN** 系统 SHALL 关闭所有 Tab 并展示空状态提示

### Requirement: 笔记文件列表工具栏
笔记文件列表顶部 SHALL 提供一排 icon 按钮工具栏，操作风格与现有文件树一致。

#### Scenario: 展示工具栏
- **WHEN** 笔记文件列表渲染
- **THEN** 列表顶部 SHALL 展示工具栏，包含新建笔记按钮（FilePlus icon）和新建文件夹按钮（FolderPlus icon）

### Requirement: 笔记文件列表
笔记面板左侧 SHALL 展示笔记目录下的 .md 文件和文件夹列表，按最近修改时间降序排列。

#### Scenario: 加载笔记列表
- **WHEN** 笔记面板首次打开或笔记目录路径变更
- **THEN** 系统 SHALL 扫描笔记目录下的所有 .md 文件和文件夹（含空文件夹）并展示为树形列表
- **THEN** 列表 SHALL 按文件最近修改时间降序排列

#### Scenario: 高亮当前编辑的笔记
- **WHEN** 用户在某个笔记 Tab 中编辑
- **THEN** 左侧文件列表 SHALL 高亮对应的笔记文件项

### Requirement: 笔记文件搜索
系统 SHALL 支持在笔记文件列表中按文件名搜索和过滤笔记。

#### Scenario: 展示搜索输入框
- **WHEN** 笔记文件列表渲染
- **THEN** 工具栏 SHALL 包含一个搜索输入框（或搜索图标触发的输入框）

#### Scenario: 按文件名过滤
- **WHEN** 用户在搜索输入框中输入关键词
- **THEN** 文件列表 SHALL 仅展示文件名（不含 .md 后缀）包含该关键词的笔记文件
- **THEN** 匹配 SHALL 不区分大小写
- **THEN** 若某文件夹内有匹配文件，该文件夹 SHALL 保持展示

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索输入框
- **THEN** 文件列表 SHALL 恢复展示全部笔记

### Requirement: 新建笔记
系统 SHALL 支持在笔记面板中快速新建笔记。

#### Scenario: 新建笔记
- **WHEN** 用户点击工具栏的新建笔记按钮
- **THEN** 系统 SHALL 在笔记目录下创建 `未命名.md` 文件
- **THEN** 系统 SHALL 在新 Tab 中打开该文件并将光标聚焦到编辑器
- **THEN** 编辑器 SHALL 自动获得输入焦点，用户可直接开始打字

#### Scenario: 新建笔记时文件名冲突
- **WHEN** 笔记目录下已存在 `未命名.md`
- **THEN** 系统 SHALL 自动递增命名为 `未命名-1.md`、`未命名-2.md`，以此类推

### Requirement: 新建文件夹
系统 SHALL 支持在笔记面板中新建文件夹，用于组织笔记。

#### Scenario: 新建文件夹
- **WHEN** 用户点击工具栏的新建文件夹按钮
- **THEN** 系统 SHALL 在笔记目录下创建 `新建文件夹` 目录
- **THEN** 文件列表 SHALL 刷新并展示新文件夹
- **THEN** 新文件夹 SHALL 自动进入 inline 重命名编辑状态

#### Scenario: 新建文件夹时名称冲突
- **WHEN** 笔记目录下已存在 `新建文件夹`
- **THEN** 系统 SHALL 自动递增命名为 `新建文件夹-1`、`新建文件夹-2`，以此类推

### Requirement: 重命名笔记
系统 SHALL 支持通过行内编辑方式重命名笔记文件。

#### Scenario: 触发重命名
- **WHEN** 用户双击文件列表中某个笔记的名称
- **THEN** 该名称 SHALL 变为 inline input 编辑状态，显示当前文件名（不含 .md 后缀）

#### Scenario: 确认重命名
- **WHEN** 用户在 inline input 中输入新名称后按 Enter
- **THEN** 系统 SHALL 将文件重命名为新名称（自动补 `.md` 后缀）
- **THEN** 文件列表 SHALL 刷新展示新文件名
- **THEN** 若该文件在 Tab 中已打开，Tab 的标题和 filePath SHALL 同步更新

#### Scenario: 取消重命名
- **WHEN** 用户在 inline input 中按 Escape
- **THEN** 系统 SHALL 取消重命名，恢复原名称显示

#### Scenario: 重命名冲突
- **WHEN** 用户输入的新名称与同目录下已有文件重名
- **THEN** 系统 SHALL 阻止重命名并提示名称已存在

### Requirement: 重命名文件夹
系统 SHALL 支持通过行内编辑方式重命名文件夹。

#### Scenario: 触发文件夹重命名
- **WHEN** 用户双击文件列表中某个文件夹的名称
- **THEN** 该名称 SHALL 变为 inline input 编辑状态

#### Scenario: 确认文件夹重命名
- **WHEN** 用户在 inline input 中输入新名称后按 Enter
- **THEN** 系统 SHALL 将文件夹重命名为新名称
- **THEN** 文件列表 SHALL 刷新展示新文件夹名
- **THEN** 若文件夹内有文件在 Tab 中打开，相关 Tab 的 filePath SHALL 同步更新

#### Scenario: 文件夹重命名名称校验
- **WHEN** 用户输入的文件夹名包含 `/` 或 `\`
- **THEN** 系统 SHALL 阻止重命名并提示名称不合法

### Requirement: 删除笔记
系统 SHALL 支持在笔记文件列表中删除笔记。

#### Scenario: 删除笔记
- **WHEN** 用户在笔记文件列表中对某个笔记执行删除操作
- **THEN** 系统 SHALL 弹出确认提示
- **THEN** 用户确认后，系统 SHALL 删除对应的 .md 文件
- **THEN** 若该笔记在 Tab 中已打开，系统 SHALL 关闭对应 Tab
