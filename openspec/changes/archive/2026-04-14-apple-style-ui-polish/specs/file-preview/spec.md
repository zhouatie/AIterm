## MODIFIED Requirements

### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录，具备 macOS Finder 侧边栏级别的精致度和舒适间距。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 只读取根目录的第一层内容并以缩进树形结构展示，目录在前、文件在后，同组内按修改时间倒序排列（最近修改的排在最上面），修改时间相同时按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 按需读取该目录的第一层子节点并展开显示；若为展开状态，SHALL 折叠隐藏其后代节点

#### Scenario: 默认显示全部文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 显示目录和非隐藏文件，并复用系统目录、Home 目录、项目噪音目录与 `.gitignore` 排除策略

#### Scenario: 选中文件高亮与侧边指示条
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮背景状态，高亮颜色 SHALL 使用主题变量而非硬编码值
- **THEN** 该文件行左侧 SHALL 显示一条 3px 宽的竖向圆角指示条，颜色使用 `--color-tree-indicator`（accent 色）
- **THEN** 指示条 SHALL 与选中背景叠加使用

#### Scenario: 文件夹图标使用主题协调蓝灰色
- **WHEN** 文件树渲染目录节点图标
- **THEN** 文件夹图标颜色 SHALL 使用 `--color-icon-folder` CSS 自定义属性
- **THEN** 该颜色 SHALL 为柔和蓝灰色（非金色/黄色），与整体冷蓝色调协调
- **THEN** light 和 dark 主题 SHALL 各有明确可辨识的蓝灰色值

#### Scenario: 文件树行高和间距提供呼吸感
- **WHEN** 文件树渲染节点行
- **THEN** 每行高度 SHALL 为 34px，提供接近 macOS Finder 侧边栏的舒适间距
- **THEN** 图标尺寸 SHALL 为 16px
- **THEN** 图标与文字之间的间距 SHALL 为 8px

#### Scenario: 目录名与文件名通过字重区分
- **WHEN** 文件树渲染目录节点和文件节点
- **THEN** 目录名 SHALL 使用更重的字重（≥ 550），使其在快速扫描时比文件名更突出
- **THEN** 文件名 SHALL 使用常规字重

#### Scenario: Hover 态圆角卡片感与微浮起
- **WHEN** 用户悬停一个文件树节点
- **THEN** hover 背景 SHALL 使用 8px 圆角
- **THEN** 背景色变化 SHALL 使用 150ms ease 过渡
- **THEN** hover 态 SHALL 叠加一层极淡的阴影，产生"微浮起"的触感
- **THEN** hover 背景色和阴影 SHALL 通过 CSS 自定义属性定义
