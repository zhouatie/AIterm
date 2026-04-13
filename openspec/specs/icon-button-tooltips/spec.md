# icon-button-tooltips Specification

## Purpose
TBD - created by archiving change add-icon-button-hover-tooltips. Update Purpose after archive.
## Requirements
### Requirement: icon-only 操作按钮提供 hover 提示
系统 SHALL 为应用内现有 icon-only 操作按钮提供 hover 提示，帮助用户理解按钮点击后的功能。

#### Scenario: 主界面 icon 按钮显示功能说明
- **WHEN** 用户将鼠标悬停在应用主界面中的 icon-only 操作按钮上
- **THEN** 系统 SHALL 显示该按钮当前操作语义对应的功能说明

#### Scenario: 上下文 icon 按钮显示功能说明
- **WHEN** 用户将鼠标悬停在 terminal 导航或设置面板中的 icon-only 操作按钮上
- **THEN** 系统 SHALL 显示该按钮对应的功能说明，即使该按钮只在局部 hover 场景下出现

### Requirement: 支持快捷键的按钮提示展示当前生效绑定
如果某个 icon-only 按钮触发的是应用级快捷键动作，系统 SHALL 在该按钮的功能说明后展示当前生效的快捷键。

#### Scenario: 默认绑定显示在按钮提示中
- **WHEN** 用户将鼠标悬停在带有默认快捷键绑定的 icon-only 操作按钮上
- **THEN** tooltip SHALL 在功能说明后追加当前快捷键，例如 `（Command + S）`

#### Scenario: 自定义快捷键保存后同步更新按钮提示
- **WHEN** 用户在设置面板中修改某个动作的快捷键并成功保存
- **THEN** 与该动作对应的 icon-only 操作按钮 tooltip SHALL 展示新的快捷键，而不是旧值或默认值

### Requirement: 切换类按钮的提示文案反映当前操作结果
对于显隐切换或折叠展开类 icon-only 按钮，系统 SHALL 根据当前状态展示本次点击将要执行的操作说明。

#### Scenario: 文件树显隐按钮提示随状态切换
- **WHEN** 文件树当前处于展开或收起的任一状态，且用户悬停对应的 icon 按钮
- **THEN** tooltip SHALL 显示与当前点击结果一致的说明，例如“收起文件树”或“展开文件树”

#### Scenario: Terminal 侧边栏显隐按钮提示随状态切换
- **WHEN** terminal 侧边栏当前处于展开或收起的任一状态，且用户悬停对应的 icon 按钮
- **THEN** tooltip SHALL 显示与当前点击结果一致的说明，例如“收起 Terminal 侧边栏”或“展开 Terminal 侧边栏”

