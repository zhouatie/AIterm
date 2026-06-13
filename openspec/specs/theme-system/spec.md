# Capability: theme-system

## Purpose
主题系统，负责 CSS 变量定义、主题状态管理、偏好持久化、跟随系统主题、防闪烁及主题切换 UI。
## Requirements
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

### Requirement: 跟随系统主题
当主题模式设置为"跟随系统"时，系统 SHALL 监听操作系统外观偏好变化并自动切换。

#### Scenario: 读取系统偏好
- **WHEN** 主题模式为 `system`
- **THEN** 系统 SHALL 通过 `matchMedia('(prefers-color-scheme: dark)')` 检测系统当前外观，并应用对应主题

#### Scenario: 响应系统偏好变化
- **WHEN** 主题模式为 `system` 且用户在操作系统中切换了外观设置
- **THEN** 系统 SHALL 自动切换到对应的主题，无需用户手动操作

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

### Requirement: 工作台表面语义变量
主题系统 SHALL 为工作台界面提供全面的语义变量，覆盖窗口 chrome、导航表面（含毛玻璃增强参数）、终端容器、tab 卡片化深度（多层阴影 + 内发光 + 高不透明度背景 + 非活跃态弱化）和文件树精细化（选中指示条 + hover 阴影 + 目录图标色）所需的 token。

#### Scenario: 浅色主题定义工作台层级变量
- **WHEN** 当前主题为浅色模式
- **THEN** 系统 SHALL 提供能够区分窗口壳层、导航层、内容层和交互状态的语义变量
- **THEN** 这些变量 SHALL 支持比当前主题更细腻的表面层级与状态反馈

#### Scenario: 深色主题定义对等语义变量
- **WHEN** 当前主题为深色模式
- **THEN** 系统 SHALL 提供与浅色模式职责对等的工作台语义变量
- **THEN** 深色主题 SHALL 保持相同的层级关系，而不是仅将浅色变量替换为更深的颜色值

#### Scenario: 浅色主题定义 tab 卡片化 token
- **WHEN** 当前主题为浅色模式
- **THEN** 系统 SHALL 定义 `--shadow-tab-active` 为三层外阴影组合（接触 + 中距 + 远距），使活跃 tab 产生明确的"浮起"深度
- **THEN** 系统 SHALL 定义 `--shadow-tab-hover` 为两层外阴影组合
- **THEN** 系统 SHALL 定义 `--color-tab-active-bg` 为高不透明度（≥ 0.90）半透明白色
- **THEN** 系统 SHALL 定义 `--color-tab-active-inset` 为明确可见的顶部内发光
- **THEN** 系统 SHALL 定义 `--color-tab-active-border` 为轻描边
- **THEN** 系统 SHALL 定义 `--color-tab-inactive-text` 为约 55% 不透明度的弱化文字色
- **THEN** 系统 SHALL 定义 `--color-tab-inactive-dot` 为弱化的指示点颜色

#### Scenario: 深色主题定义对等 tab 卡片化 token
- **WHEN** 当前主题为深色模式
- **THEN** 系统 SHALL 定义与浅色模式职责对等的 tab 卡片化 token
- **THEN** `--shadow-tab-active` 和 `--shadow-tab-hover` 的阴影不透明度 SHALL 远高于浅色模式（约 3-4 倍），确保在深色背景上阴影清晰可见
- **THEN** `--color-tab-active-bg` SHALL 使用高不透明度（≥ 0.96）深色半透明值
- **THEN** `--color-tab-inactive-text` SHALL 使用约 50% 不透明度

#### Scenario: 修改侧边栏背景不透明度
- **WHEN** 主题变量定义 `--color-surface-sidebar`
- **THEN** 浅色模式 SHALL 将不透明度从当前值降低至 ≤ 0.60，使毛玻璃效果真正可见
- **THEN** 深色模式 SHALL 将不透明度从当前值降低至 ≤ 0.70

#### Scenario: 修改文件夹图标颜色
- **WHEN** 主题变量定义 `--color-icon-folder`
- **THEN** 浅色模式 SHALL 使用柔和蓝灰色（非金色），与整体冷蓝色调协调
- **THEN** 深色模式 SHALL 使用更亮的蓝灰色

#### Scenario: 浅色主题定义文件树精细化 token
- **WHEN** 当前主题为浅色模式
- **THEN** 系统 SHALL 定义 `--color-tree-indicator` 为选中文件左侧指示条颜色（accent 色）
- **THEN** 系统 SHALL 定义 `--color-tree-row-hover` 为文件树 hover 背景色
- **THEN** 系统 SHALL 定义 `--shadow-tree-row-hover` 为文件树 hover 极淡阴影

#### Scenario: 深色主题定义对等文件树精细化 token
- **WHEN** 当前主题为深色模式
- **THEN** 系统 SHALL 定义与浅色模式职责对等的文件树精细化 token

### Requirement: 跨主题视觉语言一致
浅色与深色主题 SHALL 共享一致的视觉语言，包括层级关系、选中策略、hover 强度与强调方式。

#### Scenario: 不同主题下保持一致的活跃态语义
- **WHEN** 用户在浅色或深色主题下查看活跃 navigation item、标题栏控件或分隔条 hover 态
- **THEN** 系统 SHALL 保持一致的语义表达方式
- **THEN** 不同主题间的差异 SHALL 主要体现在色值适配，而不是交互含义变化

#### Scenario: 主题切换后工作台气质保持稳定
- **WHEN** 用户在浅色、深色与跟随系统模式之间切换
- **THEN** terminal workbench 的窗口层次、导航焦点和内容容器关系 SHALL 保持稳定
- **THEN** 系统 SHALL 不因主题切换而退回更粗糙或更高对比的旧视觉表达

#### Scenario: tab 卡片化深度在主题切换时保持层级一致
- **WHEN** 用户从浅色切换到深色主题（或反向）
- **THEN** 活跃 tab 的"卡片浮起"效果 SHALL 在两种主题下保持视觉上等价的层级表达
- **THEN** dark 模式 SHALL 通过更强的阴影不透明度补偿深色背景对阴影的低对比度
