## MODIFIED Requirements

### Requirement: 默认快捷键定义
系统 SHALL 为首批支持的应用动作提供默认快捷键绑定。

#### Scenario: 首次加载默认绑定
- **WHEN** 用户首次打开应用，且本地尚无快捷键配置
- **THEN** 文件树展示/收起 SHALL 默认绑定为 `Command + S`
- **THEN** terminal tab 侧边栏展示/收起 SHALL 默认绑定为 `Command + B`
- **THEN** 新增 workspace SHALL 默认绑定为 `Command + N`
- **THEN** 当前激活 workspace 下新增 terminal tab SHALL 默认绑定为 `Command + T`
- **THEN** 重命名当前 workspace SHALL 默认绑定为 `Command + Shift + R`
- **THEN** 重命名当前二级 terminal tab SHALL 默认绑定为 `Command + R`
- **THEN** 关闭当前二级 terminal tab SHALL 默认绑定为 `Command + W`
- **THEN** 关闭当前 workspace SHALL 默认绑定为 `Command + Shift + W`
- **THEN** 上一个 terminal tab SHALL 默认绑定为 `Command + Shift + [`
- **THEN** 下一个 terminal tab SHALL 默认绑定为 `Command + Shift + ]`
- **THEN** 跳转到第 1 个 terminal tab SHALL 默认绑定为 `Command + 1`
- **THEN** 跳转到第 2 个 terminal tab SHALL 默认绑定为 `Command + 2`
- **THEN** 跳转到第 3 个 terminal tab SHALL 默认绑定为 `Command + 3`
- **THEN** 跳转到第 4 个 terminal tab SHALL 默认绑定为 `Command + 4`
- **THEN** 跳转到第 5 个 terminal tab SHALL 默认绑定为 `Command + 5`
- **THEN** 跳转到第 6 个 terminal tab SHALL 默认绑定为 `Command + 6`
- **THEN** 跳转到第 7 个 terminal tab SHALL 默认绑定为 `Command + 7`
- **THEN** 跳转到第 8 个 terminal tab SHALL 默认绑定为 `Command + 8`
- **THEN** 跳转到最后一个 terminal tab SHALL 默认绑定为 `Command + 9`
- **THEN** 浏览器面板展示/收起 SHALL 默认绑定为 `Command + L`
- **THEN** 文件预览内容查找 SHALL 默认绑定为 `Command + F`

## ADDED Requirements

### Requirement: 文件预览查找快捷键触发
系统 SHALL 支持通过应用级快捷键触发右侧文件预览内容查找，并保持与输入焦点及现有快捷键体系一致。

#### Scenario: 触发文件预览查找
- **WHEN** 用户当前位于主工作界面，且文件预览模块右侧存在可查找的已选中文件
- **THEN** 用户按下文件预览查找快捷键时，系统 SHALL 打开右侧预览区查找框
- **THEN** 系统 SHALL 不打开左侧文件树搜索框

#### Scenario: 查找框输入时不重复触发全局查找动作
- **WHEN** 文件预览查找框已经聚焦，且用户继续输入文本
- **THEN** 系统 SHALL 将按键输入交给查找框本身
- **THEN** 系统 SHALL 不重复触发应用级文件预览查找动作
