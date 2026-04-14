## MODIFIED Requirements

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
