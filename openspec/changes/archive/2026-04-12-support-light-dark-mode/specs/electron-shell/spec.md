## MODIFIED Requirements

### Requirement: 应用窗口启动
应用 SHALL 启动一个 Electron BrowserWindow 作为主窗口，加载渲染进程页面。

#### Scenario: 正常启动
- **WHEN** 用户双击应用图标或通过命令行启动应用
- **THEN** 应用 SHALL 创建一个主窗口并显示渲染进程页面

#### Scenario: 窗口默认尺寸
- **WHEN** 应用首次启动
- **THEN** 主窗口 SHALL 使用合理的默认尺寸（不小于 800x600）

#### Scenario: 标题栏外观与主题一致
- **WHEN** 主窗口创建时
- **THEN** 窗口标题栏外观 SHALL 与当前主题模式一致（深色模式下使用深色标题栏，浅色模式下使用浅色标题栏）

## ADDED Requirements

### Requirement: 原生主题 IPC 通道
主进程 SHALL 提供 IPC 通道供渲染进程通知主题模式变化，以更新 Electron 原生外观。

#### Scenario: 注册主题通道
- **WHEN** 主进程启动完成
- **THEN** SHALL 注册 `theme:set` IPC handler

#### Scenario: 设置原生主题
- **WHEN** 渲染进程发送 `theme:set` 请求并附带主题模式（`light` / `dark` / `system`）
- **THEN** 主进程 SHALL 将 `nativeTheme.themeSource` 设置为对应值，使标题栏和系统对话框外观与应用主题一致

### Requirement: 主题 preload API
preload 脚本 SHALL 通过 contextBridge 暴露主题相关方法。

#### Scenario: 暴露 themeApi
- **WHEN** 渲染进程加载完成
- **THEN** `window.themeApi` SHALL 可用，包含 `setNativeTheme(mode)` 方法
