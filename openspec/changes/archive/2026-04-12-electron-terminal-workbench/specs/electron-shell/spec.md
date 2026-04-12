## ADDED Requirements

### Requirement: 应用窗口启动
应用 SHALL 启动一个 Electron BrowserWindow 作为主窗口，加载渲染进程页面。

#### Scenario: 正常启动
- **WHEN** 用户双击应用图标或通过命令行启动应用
- **THEN** 应用 SHALL 创建一个主窗口并显示渲染进程页面

#### Scenario: 窗口默认尺寸
- **WHEN** 应用首次启动
- **THEN** 主窗口 SHALL 使用合理的默认尺寸（不小于 800x600）

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
