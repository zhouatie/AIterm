## MODIFIED Requirements

### Requirement: SDD 工作流面板入口
系统 SHALL 在左侧工作区提供 `OpenSpec / Files` 模式切换，使用户可以在 OpenSpec Change Dashboard 和现有文件树预览之间切换。该切换 SHALL 不销毁右侧 terminal session，不改变当前活跃 terminal tab，不移除现有文件预览能力。应用启动或左侧工作区首次渲染时 SHALL 默认处于 `OpenSpec` 模式。

#### Scenario: 显示模式切换
- **WHEN** 左侧工作区处于展开状态
- **THEN** 系统 SHALL 显示 `OpenSpec / Files` 模式切换入口
- **AND** `OpenSpec` 入口 SHALL 排在 `Files` 入口之前
- **AND** 当前模式 SHALL 有明确激活态

#### Scenario: 默认进入 OpenSpec 模式
- **WHEN** 应用启动完成或左侧工作区首次渲染
- **THEN** 左侧工作区 SHALL 默认激活 `OpenSpec` 模式
- **AND** 左侧工作区 SHALL 显示 OpenSpec Change Dashboard

#### Scenario: 切换到 OpenSpec 模式
- **WHEN** 用户从 `Files` 模式切换到 `OpenSpec` 模式
- **THEN** 左侧工作区 SHALL 显示 OpenSpec Change Dashboard
- **AND** 右侧 terminal session SHALL 保持原有运行状态
- **AND** 当前活跃 terminal tab SHALL 保持不变

#### Scenario: 切回 Files 模式
- **WHEN** 用户从 `OpenSpec` 模式切回 `Files` 模式
- **THEN** 左侧工作区 SHALL 恢复现有文件树和文件预览界面
- **AND** 文件树已加载状态和当前文件预览状态 SHALL 尽可能保留
