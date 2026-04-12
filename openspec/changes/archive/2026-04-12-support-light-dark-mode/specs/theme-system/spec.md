## ADDED Requirements

### Requirement: CSS 变量主题定义
系统 SHALL 在全局样式中定义两套完整的颜色变量方案（浅色和深色），通过 `data-theme` 属性在 `<html>` 元素上切换。

#### Scenario: 浅色变量定义
- **WHEN** `<html>` 元素的 `data-theme` 属性为 `light` 或未设置
- **THEN** 系统 SHALL 应用浅色主题的 CSS 变量值（浅色背景、深色文字）

#### Scenario: 深色变量定义
- **WHEN** `<html>` 元素的 `data-theme` 属性为 `dark`
- **THEN** 系统 SHALL 应用深色主题的 CSS 变量值（深色背景、浅色文字）

#### Scenario: 变量覆盖范围
- **WHEN** 主题变量被定义
- **THEN** SHALL 覆盖所有语义化颜色类别：背景色、前景文字色、边框色、强调色、hover 状态色、选中状态色

### Requirement: 主题状态管理
系统 SHALL 通过 React Context 提供全局主题状态管理，包含当前生效的主题模式和切换方法。

#### Scenario: ThemeProvider 包裹应用
- **WHEN** 应用渲染根组件
- **THEN** ThemeProvider SHALL 包裹整个组件树，向下提供主题上下文

#### Scenario: 获取当前主题
- **WHEN** 任意组件调用 useTheme hook
- **THEN** SHALL 返回当前生效的主题模式（`light` 或 `dark`）和主题切换方法

#### Scenario: 主题模式选项
- **WHEN** 用户切换主题模式
- **THEN** 系统 SHALL 支持三种模式：`light`（浅色）、`dark`（深色）、`system`（跟随系统）

### Requirement: 主题偏好持久化
系统 SHALL 将用户的主题模式偏好保存到 localStorage，并在应用启动时恢复。

#### Scenario: 保存偏好
- **WHEN** 用户切换主题模式
- **THEN** 系统 SHALL 将选择的模式（`light` / `dark` / `system`）写入 localStorage

#### Scenario: 恢复偏好
- **WHEN** 应用启动
- **THEN** 系统 SHALL 从 localStorage 读取保存的主题偏好并应用

#### Scenario: 首次使用默认值
- **WHEN** localStorage 中无主题偏好记录
- **THEN** 系统 SHALL 默认使用 `system`（跟随系统）模式

### Requirement: 跟随系统主题
当主题模式设置为"跟随系统"时，系统 SHALL 监听操作系统外观偏好变化并自动切换。

#### Scenario: 读取系统偏好
- **WHEN** 主题模式为 `system`
- **THEN** 系统 SHALL 通过 `matchMedia('(prefers-color-scheme: dark)')` 检测系统当前外观，并应用对应主题

#### Scenario: 响应系统偏好变化
- **WHEN** 主题模式为 `system` 且用户在操作系统中切换了外观设置
- **THEN** 系统 SHALL 自动切换到对应的主题，无需用户手动操作

### Requirement: 防止主题闪烁（FOUC）
系统 SHALL 在页面渲染前同步应用主题，避免从默认主题闪烁到用户偏好主题。

#### Scenario: 同步设置 data-theme
- **WHEN** HTML 页面开始加载
- **THEN** SHALL 在 `<head>` 中通过同步脚本读取 localStorage 中的主题偏好，立即设置 `<html>` 的 `data-theme` 属性，在 React 渲染前完成

### Requirement: 主题切换 UI 控件
系统 SHALL 提供一个可视化的主题切换按钮，允许用户在浅色、深色、跟随系统三种模式间切换。

#### Scenario: 按钮位置
- **WHEN** 应用渲染时
- **THEN** 主题切换按钮 SHALL 显示在应用标题栏区域，始终可见

#### Scenario: 循环切换
- **WHEN** 用户点击主题切换按钮
- **THEN** 主题模式 SHALL 按 `light → dark → system → light` 的顺序循环切换

#### Scenario: 模式指示
- **WHEN** 主题切换按钮渲染时
- **THEN** 按钮 SHALL 通过图标或文字指示当前所处的模式
