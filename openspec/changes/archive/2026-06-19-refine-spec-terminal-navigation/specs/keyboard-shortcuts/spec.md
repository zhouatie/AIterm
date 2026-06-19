## MODIFIED Requirements

### Requirement: 默认快捷键定义
系统 SHALL 为当前支持的应用动作提供默认快捷键绑定，且默认绑定中 SHALL NOT 包含已移除的浏览器、Git Diff 或笔记动作。

#### Scenario: 首次加载默认绑定
- **WHEN** 用户首次打开应用，且本地尚无快捷键配置
- **THEN** 文件树展示/收起 SHALL 默认绑定为 `Command + S`
- **THEN** terminal tab 侧边栏展示/收起 SHALL 默认绑定为 `Command + B`
- **THEN** Terminal / Spec 模式切换 SHALL 默认绑定为 `Command + D`
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
- **THEN** 文件预览内容查找 SHALL 默认绑定为 `Command + F`
- **THEN** 浏览器面板展示/收起、Git Diff 面板展示/收起、笔记面板展示/收起 SHALL NOT 出现在默认绑定中

### Requirement: 快捷键配置校验
系统 SHALL 阻止无效或冲突的快捷键配置被保存。快捷键触发判断 SHALL 能正确区分真实用户可编辑输入元素（`<input>`、`<select>`、`contentEditable` 元素及非终端 `<textarea>`）与 xterm.js 内部键盘捕获元素，在终端获焦时不得屏蔽全局面板、terminal 创建、rename、close、Terminal / Spec 模式切换和 terminal tab 切换快捷键的触发。

#### Scenario: 阻止重复绑定
- **WHEN** 用户尝试将两个动作保存为同一个快捷键组合
- **THEN** 系统 SHALL 阻止保存，并提示存在冲突

#### Scenario: 阻止空绑定
- **WHEN** 用户尝试保存空快捷键值
- **THEN** 系统 SHALL 阻止保存，并提示该动作必须保留快捷键绑定

#### Scenario: 终端获焦时面板快捷键不被屏蔽
- **WHEN** 用户点击终端面板，终端（xterm.js）获得焦点
- **THEN** 用户按下面板收起/展开或 Terminal / Spec 模式切换快捷键（如 `Command + B`、`Command + S`、`Command + D`）
- **THEN** 系统 SHALL 正常触发对应面板的展开、收起或模式切换操作，不得静默丢弃该快捷键事件

#### Scenario: 终端获焦时 terminal 管理快捷键不被屏蔽
- **WHEN** 用户点击终端面板，终端（xterm.js）获得焦点
- **THEN** 用户按下 terminal 管理快捷键（如 `Command + N`、`Command + T`、`Command + R`、`Command + Shift + R`、`Command + W`、`Command + Shift + W`）
- **THEN** 系统 SHALL 正常触发对应的 workspace 或 terminal tab 创建、重命名或关闭操作，不得静默丢弃该快捷键事件

#### Scenario: 终端获焦时 tab 切换快捷键不被屏蔽
- **WHEN** 用户点击终端面板，终端（xterm.js）获得焦点
- **THEN** 用户按下 terminal tab 切换快捷键（如 `Command + Shift + [`、`Command + Shift + ]`）
- **THEN** 系统 SHALL 正常触发 terminal tab 或当前 Spec 卡片导航操作，不得静默丢弃该快捷键事件

#### Scenario: 重命名输入框中不触发全局快捷键
- **WHEN** 用户正在 workspace 或 terminal tab 的重命名输入框中输入内容
- **THEN** 按下任意快捷键组合
- **THEN** 系统 SHALL 不触发全局面板快捷键，避免干扰用户输入
