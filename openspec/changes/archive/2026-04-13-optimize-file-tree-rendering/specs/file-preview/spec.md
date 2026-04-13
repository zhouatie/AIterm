## MODIFIED Requirements

### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 只读取根目录的第一层内容并以缩进树形结构展示，目录在前、文件在后，同组内按修改时间倒序排列（最近修改的排在最上面），修改时间相同时按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 按需读取该目录的第一层子节点并展开显示；若为展开状态，SHALL 折叠隐藏其后代节点

#### Scenario: 默认过滤 Markdown 文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 显示目录和 `.md` 文件，隐藏其他文件类型

#### Scenario: 选中文件高亮
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮状态，高亮颜色 SHALL 使用主题变量而非硬编码值

## ADDED Requirements

### Requirement: 文件树虚拟化渲染
系统 SHALL 基于当前展开状态生成文件树可见行，并使用固定行高虚拟列表限制实际挂载的节点数量。

#### Scenario: 折叠目录不挂载后代节点
- **WHEN** 文件树已加载完整扫描结果且某个目录处于折叠状态
- **THEN** 该目录的后代节点 SHALL 不进入当前可见行列表，也 SHALL 不挂载到 React 渲染树中

#### Scenario: 大量可见节点滚动
- **WHEN** 当前展开状态产生的可见节点数量超过文件树视口可显示数量
- **THEN** 文件树 SHALL 只挂载视口附近的可见行，并 SHALL 通过占位高度保持滚动条表示完整可见行列表

#### Scenario: 展开全部虚拟化
- **WHEN** 用户点击展开全部按钮
- **THEN** 文件树 SHALL 将当前完整树中的目录视为展开状态，并 SHALL 继续只挂载虚拟窗口范围内的可见行

#### Scenario: 虚拟行交互保持一致
- **WHEN** 用户对虚拟列表中的文件或目录行执行点击、右键、hover 或选中操作
- **THEN** 文件树 SHALL 保持现有展开折叠、文件预览、选中高亮和上下文菜单行为不变

### Requirement: 文件树按需加载与展开全部
系统 SHALL 初次只加载根目录第一层，并 SHALL 根据根目录层级决定是否提供展开全部入口。

#### Scenario: 初次只加载第一层
- **WHEN** 文件树根目录发生变化或用户手动刷新
- **THEN** 系统 SHALL 只请求该根目录的直接子节点，不 SHALL 扫描完整子树

#### Scenario: 展开目录加载下一层
- **WHEN** 用户展开一个尚未加载过子节点的目录
- **THEN** 系统 SHALL 只请求该目录的直接子节点，并 SHALL 将结果缓存到该目录节点下

#### Scenario: 高层目录隐藏展开全部
- **WHEN** 文件树根目录是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 不显示展开全部按钮

#### Scenario: 非高层目录显示展开全部
- **WHEN** 文件树根目录不是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 显示展开全部按钮

#### Scenario: 非高层目录展开全部
- **WHEN** 用户在非高层目录点击展开全部按钮
- **THEN** 系统 SHALL 扫描该根目录完整文件树，替换当前树数据，并展开所有目录

### Requirement: 文件树搜索
系统 SHALL 在文件树工具栏提供搜索框，用于过滤当前已加载的树节点。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在文件树搜索框输入关键词
- **THEN** 文件树 SHALL 只展示当前已加载树中名称或路径匹配关键词的节点及其必要父节点

#### Scenario: 清空搜索关键词
- **WHEN** 用户清空搜索框
- **THEN** 文件树 SHALL 恢复按当前展开状态展示可见节点

### Requirement: 文件树 Spec 模式
系统 SHALL 提供 spec 模式切换按钮，用于只加载配置的 spec 目录名对应的目录树。

#### Scenario: 开启 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为关闭状态
- **THEN** 文件树 SHALL 重新加载 spec tree，并只访问当前根目录下配置的 spec 目录路径，不 SHALL 先读取当前根目录的所有 entry 再过滤

#### Scenario: 关闭 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为开启状态
- **THEN** 文件树 SHALL 重新加载根目录第一层，并恢复普通全部文件展示

#### Scenario: spec 模式按钮显示
- **WHEN** 文件树工具栏渲染 spec 模式按钮
- **THEN** 按钮内容 SHALL 显示 `spec` 文本而非图形 icon

#### Scenario: spec 模式继续按需展开
- **WHEN** 用户在 spec 模式下展开已展示的 spec 目录
- **THEN** 文件树 SHALL 按需加载该目录下一层内容

#### Scenario: spec 模式展开全部
- **WHEN** 用户在 spec 模式下点击展开全部按钮
- **THEN** 系统 SHALL 只扫描配置的 spec 目录树并展开结果，不 SHALL 扫描或展开非 spec 目录

#### Scenario: 移除 Markdown 过滤切换
- **WHEN** 文件树工具栏渲染
- **THEN** 文件树 SHALL 不显示 Markdown-only / 全部文件切换按钮
