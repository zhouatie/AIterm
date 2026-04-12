# Capability: electron-shell

## Purpose
Electron 主进程外壳，负责应用窗口管理、进程安全隔离、IPC 通道注册及应用生命周期管理。

## Requirements

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

### Requirement: 进程安全隔离
主进程与渲染进程之间 SHALL 通过 contextBridge + preload 脚本进行安全通信，渲染进程 SHALL NOT 直接访问 Node.js API。

#### Scenario: 渲染进程隔离
- **WHEN** 渲染进程尝试访问 Node.js 模块（如 `require('fs')`）
- **THEN** 访问 SHALL 被拒绝（nodeIntegration 禁用、contextIsolation 启用）

#### Scenario: preload 暴露 API
- **WHEN** 渲染进程需要与主进程通信
- **THEN** SHALL 通过 preload 脚本在 `window` 上暴露的 API 进行，而非直接使用 ipcRenderer

### Requirement: IPC 通信通道
主进程 SHALL 提供 IPC 通道供渲染进程调用终端相关操作。

#### Scenario: 通道注册
- **WHEN** 主进程启动完成
- **THEN** SHALL 注册 `terminal:create`、`terminal:input`、`terminal:resize`、`terminal:dispose` 等 IPC handler

#### Scenario: 无效通道调用
- **WHEN** 渲染进程调用未注册的 IPC 通道
- **THEN** 调用 SHALL 被忽略且不导致应用崩溃

### Requirement: 应用生命周期管理
应用 SHALL 正确处理窗口关闭和应用退出事件。

#### Scenario: 关闭窗口时清理 PTY
- **WHEN** 用户关闭主窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程后退出

#### Scenario: macOS dock 行为
- **WHEN** 在 macOS 上关闭所有窗口后点击 dock 图标
- **THEN** 应用 SHALL 重新创建主窗口

### Requirement: 文件系统 IPC 通道注册
主进程 SHALL 在启动时注册文件系统相关的 IPC handler，供渲染进程通过 preload 安全调用。

#### Scenario: 注册 fs 通道
- **WHEN** 主进程启动完成
- **THEN** SHALL 注册 `fs:readdir` 和 `fs:readfile` IPC handler

### Requirement: 文件系统 preload API
preload 脚本 SHALL 通过 contextBridge 暴露 `fileApi` 对象，提供文件系统读取方法。

#### Scenario: 暴露 fileApi
- **WHEN** 渲染进程加载完成
- **THEN** `window.fileApi` SHALL 可用，包含 `readDir` 和 `readFile` 方法

### Requirement: 终端 cwd 查询
主进程 SHALL 提供查询终端会话初始工作目录的 IPC 通道。

#### Scenario: 查询 PTY cwd
- **WHEN** 渲染进程发送 `terminal:getCwd` 请求并提供会话 ID
- **THEN** 主进程 SHALL 返回该终端会话的初始工作目录路径

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
