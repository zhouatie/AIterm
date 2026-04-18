## MODIFIED Requirements

### Requirement: 文件树 Spec 模式
系统 SHALL 提供 spec 模式切换按钮，用于只加载配置的 spec 目录名对应的目录树。

#### Scenario: 开启 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为关闭状态
- **THEN** 文件树 SHALL 重新加载，只返回当前根目录下配置的 spec 目录条目本身（name、path、mtime），不 SHALL 预加载 spec 目录的子项内容
- **THEN** 返回的 spec 目录节点 SHALL 标记为子项未加载状态（childrenLoaded 为 false）
- **THEN** spec 目录 SHALL 以折叠状态呈现，与非 spec 模式下目录的初始状态一致

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

#### Scenario: spec 模式展开状态恢复
- **WHEN** spec 模式加载完成且存在之前记忆的展开路径
- **THEN** 文件树 SHALL 使用与非 spec 模式相同的展开状态恢复机制，按需加载每个之前展开的目录的子项
- **THEN** 系统 SHALL 不对 spec 目录做任何特殊的自动展开处理
