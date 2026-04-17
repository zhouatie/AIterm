## ADDED Requirements

### Requirement: 设置面板提供终端 renderer 配置区
设置面板 SHALL 提供终端 renderer 配置区，用于展示和保存“是否优先尝试 WebGL renderer”的当前偏好。

#### Scenario: 展示 renderer 配置项
- **WHEN** 用户打开设置面板
- **THEN** 系统 SHALL 展示终端 renderer 配置项
- **AND** 该配置项 SHALL 明确表达当前是否优先尝试 WebGL renderer

#### Scenario: 展示默认值
- **WHEN** 用户首次打开设置面板且不存在已保存的 terminal renderer 偏好
- **THEN** 系统 SHALL 将“优先尝试 WebGL renderer”展示为开启状态

#### Scenario: 保存 renderer 偏好
- **WHEN** 用户修改 terminal renderer 配置并点击保存
- **THEN** 系统 SHALL 将更新后的偏好持久化到 localStorage

#### Scenario: 保存后影响后续终端初始化
- **WHEN** 用户已保存 terminal renderer 偏好
- **THEN** 之后新建或重新初始化的终端实例 SHALL 使用该偏好决定是否尝试启用 WebGL renderer
