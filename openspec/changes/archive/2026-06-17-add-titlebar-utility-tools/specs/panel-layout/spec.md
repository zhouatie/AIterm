## ADDED Requirements

### Requirement: 标题栏开发者工具入口布局
标题栏 SHALL 支持新增开发者工具 icon 入口，并保持既有窗口 chrome、按钮交互和拖拽区域可用。

#### Scenario: 工具入口不影响既有标题栏按钮
- **WHEN** 标题栏显示开发者工具入口
- **THEN** 文件树开关、主题切换、Live View 入口、更新检查入口 SHALL 保持可点击
- **THEN** 这些既有按钮的 hover 反馈 SHALL 保持与开发者工具入口一致

#### Scenario: 工具入口可在标题栏拖拽区域中点击
- **WHEN** 用户点击标题栏中的开发者工具 icon
- **THEN** 系统 SHALL 触发打开开发者工具面板的操作
- **THEN** 该点击 SHALL NOT 被窗口拖拽行为吞掉

#### Scenario: 标题栏仍可拖拽窗口
- **WHEN** 用户在标题栏非按钮区域按住并拖拽
- **THEN** 应用窗口 SHALL 继续响应系统窗口拖拽
- **THEN** 新增开发者工具入口 SHALL NOT 让整个标题栏变成不可拖拽区域

#### Scenario: 窄窗口下版本信息收缩
- **WHEN** 应用窗口宽度不足以完整显示标题栏所有内容
- **THEN** 标题栏 SHALL 优先保持单一工具入口和既有操作按钮可见可点击
- **THEN** 版本号或更新状态文本 SHALL 通过收缩或省略号避免与工具入口重叠
