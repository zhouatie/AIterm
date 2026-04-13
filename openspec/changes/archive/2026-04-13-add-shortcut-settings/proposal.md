## Why

当前应用的核心操作越来越依赖键盘驱动，但还没有统一的快捷键定义与配置入口，导致文件树显隐、终端导航折叠、新建 workspace 等高频动作只能依赖鼠标。现在先补上最小可用的快捷键设置能力，为后续扩展成类似 which-key 的提示系统打基础。

## What Changes

- 新增设置面板，支持通过 `Command + ,` 打开，并作为后续应用配置的统一入口
- 新增快捷键配置能力，允许用户查看和修改当前支持的应用级快捷键
- 首批支持配置 3 个快捷键：
- 文件树模块展示/收起，默认 `Command + S`
- terminal 模块 tab 侧边栏展示/收起，默认 `Command + B`
- 新增 workspace，默认 `Command + T`
- 明确本次不实现 which-key 式右下角提示面板，仅为后续扩展预留能力边界

## Capabilities

### New Capabilities
- `settings-panel`: 设置面板的打开方式、展示结构以及快捷键配置入口
- `keyboard-shortcuts`: 应用级快捷键注册、默认值与用户自定义配置持久化

### Modified Capabilities
- `panel-layout`: 文件树模块需要支持通过可配置快捷键切换展示/收起状态
- `terminal-tabs`: terminal 侧边 tab 栏与新增 workspace 需要支持通过可配置快捷键触发

## Impact

- 受影响代码主要包括 `src/App.tsx`、`src/components/TerminalPanel.tsx`、分栏布局状态管理，以及新增的设置面板/快捷键配置状态模块
- 需要新增一套应用内快捷键配置存储方案，用于保存默认值与用户自定义值
- 需要为设置面板补充 UI 容器与打开/关闭交互，但本次不涉及 which-key 提示系统实现
