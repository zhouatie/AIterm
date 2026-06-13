## MODIFIED Requirements

### Requirement: 主题偏好持久化
系统 SHALL 将用户的主题模式偏好保存到 localStorage，并在应用启动时恢复。若不存在有效的已保存偏好，系统 SHALL 默认使用深色模式。

#### Scenario: 保存偏好
- **WHEN** 用户切换主题模式
- **THEN** 系统 SHALL 将选择的模式（`light` / `dark` / `system`）写入 localStorage

#### Scenario: 恢复偏好
- **WHEN** 应用启动
- **THEN** 系统 SHALL 从 localStorage 读取保存的主题偏好并应用

#### Scenario: 首次使用默认值
- **WHEN** localStorage 中无主题偏好记录
- **THEN** 系统 SHALL 默认使用 `dark`（深色）模式

#### Scenario: 无效偏好回退默认值
- **WHEN** localStorage 中的主题偏好不是 `light`、`dark` 或 `system`
- **THEN** 系统 SHALL 默认使用 `dark`（深色）模式

### Requirement: 防止主题闪烁（FOUC）
系统 SHALL 在页面渲染前同步应用主题，避免从默认主题闪烁到用户偏好主题。同步脚本 SHALL 与 ThemeProvider 使用相同的无缓存默认策略。

#### Scenario: 同步设置 data-theme
- **WHEN** HTML 页面开始加载
- **THEN** SHALL 在 `<head>` 中通过同步脚本读取 localStorage 中的主题偏好，立即设置 `<html>` 的 `data-theme` 属性，在 React 渲染前完成

#### Scenario: 无缓存时同步设置深色主题
- **WHEN** HTML 页面开始加载且 localStorage 中无主题偏好记录
- **THEN** 同步脚本 SHALL 立即设置 `<html>` 的 `data-theme` 属性为 `dark`

#### Scenario: 跟随系统模式继续解析系统外观
- **WHEN** HTML 页面开始加载且 localStorage 中的主题偏好为 `system`
- **THEN** 同步脚本 SHALL 通过 `matchMedia('(prefers-color-scheme: dark)')` 检测系统当前外观，并应用对应主题
