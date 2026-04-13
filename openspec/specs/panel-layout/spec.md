# Capability: panel-layout

## Purpose
面板布局系统，提供主内容区容器、面板注册机制和面板切换能力。

## Requirements

### Requirement: 主内容区面板容器
应用 SHALL 提供一个左右分栏布局，左栏为文件预览面板，右栏为面板容器（承载终端等功能面板）。

#### Scenario: 默认显示终端面板
- **WHEN** 应用启动完成
- **THEN** 右栏面板容器 SHALL 默认显示终端面板，左栏 SHALL 显示文件预览面板

#### Scenario: 面板占满右栏可用空间
- **WHEN** 面板被激活显示
- **THEN** 面板 SHALL 占满右栏面板容器的全部可用空间

#### Scenario: 左右分栏比例可调
- **WHEN** 用户拖拽左右栏之间的分隔条
- **THEN** 左右栏宽度比例 SHALL 随之调整，并有最小宽度约束防止面板被完全折叠

#### Scenario: 分栏默认比例
- **WHEN** 应用首次启动
- **THEN** 左栏 SHALL 占据约 30% 宽度，右栏占据约 70% 宽度

#### Scenario: 面板边框与分隔线适配主题
- **WHEN** 应用主题模式发生变化
- **THEN** 面板边框、分割线、背景色 SHALL 使用主题 CSS 变量，与当前主题一致

#### Scenario: 分隔条拖拽手柄适配主题
- **WHEN** 用户将鼠标悬停在分隔条上
- **THEN** 分隔条的 hover 高亮色 SHALL 使用主题变量

### Requirement: 面板注册机制
系统 SHALL 提供面板注册接口，允许声明式地注册新的功能面板。

#### Scenario: 注册面板
- **WHEN** 一个新面板模块调用注册接口
- **THEN** 该面板 SHALL 被加入可用面板列表，可通过标识符激活

#### Scenario: 注册信息
- **WHEN** 面板注册时
- **THEN** SHALL 提供面板唯一标识符（id）和面板组件

### Requirement: 面板切换
用户 SHALL 能够在已注册的面板之间进行切换。

#### Scenario: 快捷键切换
- **WHEN** 用户按下面板切换快捷键
- **THEN** 主内容区 SHALL 切换到目标面板

#### Scenario: 切换时保留状态
- **WHEN** 用户从面板 A 切换到面板 B，再切回面板 A
- **THEN** 面板 A SHALL 保留之前的状态（如终端的历史输出和滚动位置）

### Requirement: 文件树模块显隐快捷键
应用 SHALL 支持通过当前配置的快捷键切换文件树模块的展示与收起状态。

#### Scenario: 快捷键收起文件树
- **WHEN** 文件树模块当前处于展示状态，且用户按下“文件树展示/收起”快捷键
- **THEN** 系统 SHALL 收起文件树模块，为主内容区释放更多空间

#### Scenario: 快捷键重新展开文件树
- **WHEN** 文件树模块当前处于收起状态，且用户按下“文件树展示/收起”快捷键
- **THEN** 系统 SHALL 重新展开文件树模块
