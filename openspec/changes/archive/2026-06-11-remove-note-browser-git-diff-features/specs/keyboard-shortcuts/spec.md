## MODIFIED Requirements

### Requirement: 默认快捷键定义
系统 SHALL 为当前支持的应用动作提供默认快捷键绑定，且默认绑定中 SHALL NOT 包含已移除的浏览器、Git Diff 或笔记动作。

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
- **THEN** 文件预览内容查找 SHALL 默认绑定为 `Command + F`
- **THEN** 浏览器面板展示/收起、Git Diff 面板展示/收起、笔记面板展示/收起 SHALL NOT 出现在默认绑定中

## ADDED Requirements

### Requirement: 已移除动作的旧绑定忽略
系统 SHALL 在读取旧快捷键配置时忽略已移除的动作绑定，避免旧 localStorage 中的浏览器、Git Diff 或笔记快捷键影响当前工作台。

#### Scenario: 加载包含已移除动作的旧配置
- **WHEN** 本地快捷键配置仍包含 `toggle-browser`、`toggle-git-diff` 或 `toggle-notes`
- **THEN** 系统 SHALL 忽略这些已移除动作
- **THEN** 系统 SHALL 继续加载当前仍支持的快捷键动作

## REMOVED Requirements

### Requirement: 浏览器上下文快捷键分发
**Reason**: 内嵌浏览器被移除，不再需要浏览器打开时接管 `Cmd+T`、`Cmd+W`、编号切换、刷新或前进后退快捷键。
**Migration**: 这些快捷键恢复为当前工作台保留动作；浏览器相关快捷键不再生效。

### Requirement: 笔记面板保留开关键分发
**Reason**: 笔记面板被移除，不再需要在笔记编辑器或搜索框输入态保留笔记开关键。
**Migration**: 旧的笔记面板快捷键绑定不再生效。
