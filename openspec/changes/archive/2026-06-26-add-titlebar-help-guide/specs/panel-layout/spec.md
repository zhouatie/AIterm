## ADDED Requirements

### Requirement: 标题栏帮助入口布局
标题栏 SHALL 支持新增问号帮助入口，并保持既有窗口 chrome、按钮交互和拖拽区域可用。

#### Scenario: 帮助入口显示为问号图标
- **WHEN** 应用主窗口标题栏渲染完成
- **THEN** 标题栏 SHALL 显示一个 icon-only 问号帮助按钮
- **AND** 帮助按钮 SHALL 提供“帮助”或“使用指南”语义的 tooltip 或 `aria-label`

#### Scenario: 点击帮助入口
- **WHEN** 用户点击标题栏问号帮助按钮
- **THEN** 系统 SHALL 打开帮助指南面板
- **AND** 该点击 SHALL NOT 被窗口拖拽行为吞掉

#### Scenario: 帮助入口不影响既有按钮
- **WHEN** 标题栏显示问号帮助入口
- **THEN** 文件树开关、主题切换、Live View 入口、开发者工具入口、Agent Inbox 入口和更新检查入口 SHALL 保持可点击
- **AND** 这些按钮的 hover 反馈 SHALL 保持一致

#### Scenario: 标题栏仍可拖拽窗口
- **WHEN** 用户在标题栏非按钮区域按住并拖拽
- **THEN** 应用窗口 SHALL 继续响应系统窗口拖拽
- **AND** 新增帮助入口 SHALL NOT 让整个标题栏变成不可拖拽区域

#### Scenario: 窄窗口下帮助入口保持可用
- **WHEN** 应用窗口宽度不足以完整显示标题栏所有内容
- **THEN** 标题栏 SHALL 保持问号帮助入口可见可点击
- **AND** 版本号或更新状态文本 SHALL 通过收缩或省略号避免与帮助入口重叠
