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
- **THEN** Git Diff 面板展示/收起 SHALL 默认绑定为 `Command + G`
- **THEN** 笔记面板展示/收起 SHALL 默认绑定为 `Command + O`
