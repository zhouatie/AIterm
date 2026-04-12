## MODIFIED Requirements

### Requirement: 文件树手动刷新
系统 SHALL 提供一个手动刷新按钮，允许用户主动刷新文件树内容。刷新 SHALL 通过独立的 refreshKey 机制触发，确保即使工作目录未变化也能可靠地重新扫描目录内容。

#### Scenario: 刷新按钮位置
- **WHEN** 文件树模块处于展开状态
- **THEN** 文件树工具栏 SHALL 在 toggle icon 旁显示一个刷新按钮

#### Scenario: 点击刷新（CWD 未变化）
- **WHEN** 用户点击刷新按钮且终端工作目录与当前文件树根目录相同
- **THEN** 系统 SHALL 递增 refreshKey 触发文件树重新扫描，不依赖路径清空/恢复的中间状态，刷新期间 SHALL 显示 loading 状态

#### Scenario: 点击刷新（CWD 已变化）
- **WHEN** 用户点击刷新按钮且终端工作目录已发生变化
- **THEN** 系统 SHALL 更新文件树根目录为新的工作目录，清除选中文件和文件内容，并重新扫描

#### Scenario: 收起状态不显示刷新按钮
- **WHEN** 文件树模块处于收起状态
- **THEN** 刷新按钮 SHALL 不显示

#### Scenario: 刷新过程中显示加载状态
- **WHEN** 刷新触发文件树重新扫描
- **THEN** 文件树 SHALL 显示 loading 指示器，直到扫描完成或失败

#### Scenario: 扫描失败时恢复
- **WHEN** 文件树扫描 IPC 调用失败（如目录已删除、权限不足）
- **THEN** 系统 SHALL 将 loading 状态设为 false，显示空树或保留上次结果，不产生未捕获错误
