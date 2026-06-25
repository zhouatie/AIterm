## ADDED Requirements

### Requirement: Transcript 输出记录
系统 SHALL 为每个 terminal tab 维护一份独立 transcript，持续记录该 tab 关联 PTY session 的输出内容。

#### Scenario: 记录活跃 session 输出
- **WHEN** 当前活跃 terminal session 产生 PTY 输出
- **THEN** 系统 SHALL 将该输出追加到该 terminal tab 的 transcript
- **AND** 系统 SHALL 继续按现有链路将输出渲染到对应 xterm.js 实例

#### Scenario: 记录后台 session 输出
- **WHEN** terminal session 处于非活跃状态且继续产生 PTY 输出
- **THEN** 系统 SHALL 将该输出追加到该 terminal tab 的 transcript
- **AND** 系统 SHALL 保持现有后台输出缓存与重新激活补写行为不变

#### Scenario: 不额外记录 stdin
- **WHEN** 用户向 terminal session 输入字符
- **THEN** 系统 SHALL NOT 将 stdin 数据作为独立 transcript 记录写入
- **AND** 若该输入随后由 PTY 输出回显，系统 SHALL 按普通 PTY 输出记录该回显内容

### Requirement: Transcript 存储与生命周期
系统 SHALL 将 transcript 存储为本地持久化数据，并按 terminal tab 生命周期维护其关联关系与清理行为。

#### Scenario: 创建 transcript
- **WHEN** 用户创建新的 terminal tab
- **THEN** 系统 SHALL 为该 terminal tab 分配 transcript 标识
- **AND** 系统 SHALL 将后续 PTY 输出写入该 transcript 标识对应的本地存储

#### Scenario: 跨重启保留 transcript 关联
- **WHEN** 应用重启并恢复仍存在的 terminal tab
- **THEN** 系统 SHALL 恢复该 terminal tab 的 transcript 标识
- **AND** 新创建的 PTY session SHALL 继续追加写入同一 transcript

#### Scenario: 关闭 tab 清理 transcript
- **WHEN** 用户关闭 terminal tab
- **THEN** 系统 SHALL 删除该 terminal tab 对应的 transcript 存储
- **AND** 后续孤立 transcript 清理 SHALL NOT 再保留该 transcript 文件

#### Scenario: 清理孤立 transcript
- **WHEN** 应用启动时发现本地 transcript 文件没有任何恢复的 terminal tab 引用
- **THEN** 系统 SHALL 删除该孤立 transcript 文件

### Requirement: Transcript 查看
系统 SHALL 提供从 terminal tab 打开完整 transcript 的只读查看能力，使用户能够查看超过 xterm scrollback 的早期输出内容。

#### Scenario: 打开当前 session transcript
- **WHEN** 用户在当前 terminal tab 触发打开 transcript 操作
- **THEN** 系统 SHALL 展示该 terminal tab 的 transcript 只读视图
- **AND** 该视图 SHALL 包含 xterm scrollback 可能已经裁剪的早期输出内容

#### Scenario: 查看不改变终端状态
- **WHEN** 用户打开、滚动或关闭 transcript 视图
- **THEN** 系统 SHALL NOT 向 PTY stdin 写入任何输入
- **AND** 系统 SHALL NOT 改变 xterm.js 的 viewport、scrollback 或当前 terminal session 活跃状态

#### Scenario: 输出更新后刷新 transcript
- **WHEN** transcript 视图打开期间对应 terminal session 产生新的 PTY 输出
- **THEN** 系统 SHALL 允许用户在 transcript 视图中看到新追加的输出
- **AND** 系统 SHALL 保持 terminal 的实时输出渲染不受影响

### Requirement: Transcript 搜索与导出
系统 SHALL 支持在 transcript 文本内容中查找匹配项，并支持用户导出当前 transcript。

#### Scenario: 搜索 transcript
- **WHEN** 用户在 transcript 视图输入搜索关键词
- **THEN** 系统 SHALL 在该 transcript 的文本内容中查找匹配项
- **AND** 系统 SHALL 支持在匹配项之间跳转

#### Scenario: 搜索无匹配
- **WHEN** 用户搜索的关键词不存在于 transcript 文本内容中
- **THEN** 系统 SHALL 展示无匹配状态
- **AND** 系统 SHALL 保持当前 transcript 视图内容可继续浏览

#### Scenario: 导出 transcript
- **WHEN** 用户触发导出当前 transcript
- **THEN** 系统 SHALL 将该 terminal tab 的 transcript 写出为用户可保存的文本文件
- **AND** 导出操作 SHALL NOT 删除或截断本地 transcript 存储
