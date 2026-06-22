# Capability: electron-shell

## Purpose
Electron 主进程外壳能力，负责应用窗口管理、进程安全隔离、IPC 通道注册、外部系统交互边界以及应用生命周期管理。

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
主进程与渲染进程之间 SHALL 通过 contextBridge + preload 脚本进行安全通信，渲染进程 SHALL NOT 直接访问 Node.js API。主窗口 SHALL NOT 启用已移除浏览器功能所需的 `<webview>` 标签支持。

#### Scenario: 渲染进程隔离
- **WHEN** 渲染进程尝试访问 Node.js 模块（如 `require('fs')`）
- **THEN** 访问 SHALL 被拒绝（nodeIntegration 禁用、contextIsolation 启用）

#### Scenario: preload 暴露 API
- **WHEN** 渲染进程需要与主进程通信
- **THEN** SHALL 通过 preload 脚本在 `window` 上暴露的 API 进行，而非直接使用 ipcRenderer

#### Scenario: webview 标签不启用
- **WHEN** 主窗口创建时
- **THEN** webPreferences SHALL NOT 启用 `webviewTag`

### Requirement: IPC 通信通道
主进程 SHALL 提供 IPC 通道供渲染进程调用终端相关操作。

#### Scenario: 通道注册
- **WHEN** 主进程启动完成
- **THEN** SHALL 注册 `terminal:create`、`terminal:input`、`terminal:resize`、`terminal:dispose` 等 IPC handler

#### Scenario: 无效通道调用
- **WHEN** 渲染进程调用未注册的 IPC 通道
- **THEN** 调用 SHALL 被忽略且不导致应用崩溃

### Requirement: 应用生命周期管理
应用 SHALL 正确处理窗口关闭和应用退出事件。关闭 GUI 会终止活跃 PTY 会话时，应用 SHALL 先向用户展示二次确认；只有用户确认后才允许关闭窗口并清理 PTY。关闭所有窗口后，应用 SHALL 清理所有活跃 PTY 会话；在 macOS 上应用进程 MAY 保持运行以支持 dock 重新打开窗口，但不得保留不可见的后台 PTY。

#### Scenario: 关闭 GUI 前展示二次确认
- **WHEN** 用户请求关闭主窗口且当前存在活跃 PTY 会话
- **THEN** 应用 SHALL 在主窗口关闭前展示二次确认
- **THEN** 确认内容 SHALL 明确告知关闭 GUI 会终止正在运行的终端进程

#### Scenario: 取消关闭 GUI
- **WHEN** 关闭确认已展示
- **AND** 用户选择取消关闭
- **THEN** 应用 SHALL 保持主窗口打开
- **THEN** 应用 SHALL NOT 终止任何活跃 PTY 进程
- **THEN** 应用 SHALL NOT 从主进程 session registry 中移除任何 PTY 会话

#### Scenario: 确认关闭 GUI
- **WHEN** 关闭确认已展示
- **AND** 用户确认关闭
- **THEN** 应用 SHALL 继续执行主窗口关闭流程
- **THEN** 应用 SHALL 允许渲染进程保存当前 tab 布局状态
- **THEN** 应用 SHALL 在窗口关闭后清理所有活跃 PTY 会话

#### Scenario: 关闭窗口时清理 PTY
- **WHEN** 用户关闭主窗口并导致应用没有剩余窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程
- **THEN** 应用 SHALL 从主进程 session registry 中移除这些 PTY 会话

#### Scenario: 非 macOS 关闭窗口后退出
- **WHEN** 用户在非 macOS 平台关闭所有窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程后退出

#### Scenario: macOS 关闭窗口后不保留 PTY
- **WHEN** 用户在 macOS 上关闭所有窗口
- **THEN** 应用 SHALL 终止所有活跃的 PTY 进程
- **THEN** 应用 MAY 保持进程运行等待 dock 重新激活
- **THEN** 应用 SHALL NOT 保留任何已关闭窗口关联的后台 PTY 会话

#### Scenario: macOS dock 行为
- **WHEN** 在 macOS 上关闭所有窗口后点击 dock 图标
- **THEN** 应用 SHALL 重新创建主窗口
- **THEN** 新窗口 SHALL NOT 复用关闭窗口前已终止的 PTY 会话

#### Scenario: 应用退出时重复清理安全
- **WHEN** 应用退出流程触发且 PTY 会话已经在窗口关闭时被清理
- **THEN** 应用 SHALL 安全完成退出清理
- **THEN** 重复清理 SHALL NOT 导致应用崩溃或抛出未处理异常

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

### Requirement: 应用元信息 IPC 与 preload API
主进程 SHALL 提供只读应用元信息 IPC 通道，preload 脚本 SHALL 通过 contextBridge 暴露对应 API，使渲染进程可以在不直接访问 Node.js API 或 ipcRenderer 的情况下读取当前应用版本。

#### Scenario: 主进程返回当前应用版本
- **WHEN** 渲染进程通过 preload 暴露的应用元信息 API 请求当前应用信息
- **THEN** 主进程 SHALL 返回当前 Electron 应用运行时版本号
- **AND** 该版本号 SHALL 与当前打包应用的版本元信息一致

#### Scenario: preload 暴露应用元信息 API
- **WHEN** 渲染进程加载完成
- **THEN** `window.appInfoApi` SHALL 可用
- **AND** `window.appInfoApi` SHALL 提供读取当前应用信息的方法
- **AND** 渲染进程 SHALL NOT 直接访问 Node.js API 或 ipcRenderer 来读取版本号

#### Scenario: 应用元信息 API 为只读
- **WHEN** 渲染进程调用应用元信息 API
- **THEN** 该 API SHALL 只返回当前应用名称和版本号
- **AND** 该 API SHALL NOT 提供修改应用元信息、发布配置或更新状态的方法

### Requirement: 更新检查 IPC 安全边界
主进程 SHALL 提供受限 IPC 通道用于检查应用更新，渲染进程 SHALL 通过 preload 暴露的 API 调用该能力，而不是直接访问 Node.js、Electron shell 或任意系统能力。

#### Scenario: 注册更新检查通道
- **WHEN** 主进程启动完成
- **THEN** 主进程 SHALL 注册用于手动检查更新的 IPC handler
- **THEN** 该 handler SHALL 返回结构化结果，表达当前版本、最新版本、是否有新版、Release 页面 URL 或错误信息

#### Scenario: preload 暴露更新检查 API
- **WHEN** 渲染进程加载完成
- **THEN** `window.appUpdateApi` SHALL 可用
- **THEN** `window.appUpdateApi` SHALL 提供手动检查更新的方法
- **THEN** 渲染进程 SHALL NOT 直接访问 `ipcRenderer`、Node.js 网络模块或 Electron shell

#### Scenario: 更新检查失败不崩溃
- **WHEN** 更新检查过程中出现网络错误、非 2xx 响应、无效 JSON 或无法解析的版本
- **THEN** 主进程 SHALL 捕获错误并返回失败结果
- **THEN** 应用 SHALL NOT 抛出未处理异常或关闭主窗口

### Requirement: GitHub Release 外部链接打开
主进程 SHALL 通过 Electron shell 打开 GitHub Release 页面，并在打开前限制目标 URL，避免渲染进程请求打开任意外部链接。

#### Scenario: 打开允许的 Release 页面
- **WHEN** 渲染进程请求打开 AIterm GitHub Release 页面
- **THEN** 主进程 SHALL 验证 URL 属于 `github.com/zhouatie/AIterm/releases`
- **THEN** 主进程 SHALL 使用系统默认浏览器打开该 URL

#### Scenario: 拒绝不受信任的外部 URL
- **WHEN** 渲染进程请求打开不属于 AIterm GitHub Release 页面的 URL
- **THEN** 主进程 SHALL 拒绝该请求
- **THEN** 主进程 SHALL NOT 调用系统默认浏览器打开该 URL

#### Scenario: 未提供具体 Release URL
- **WHEN** 渲染进程请求打开 Release 页面且未提供具体 URL
- **THEN** 主进程 SHALL 打开固定的 AIterm GitHub Releases 页面

### Requirement: 受限外部 Web URL 打开 API
主进程 SHALL 提供受限的外部 Web URL 打开能力，渲染进程 SHALL 只能通过 preload 暴露的 API 请求打开 `http:` 或 `https:` URL。主进程 SHALL 在调用系统默认浏览器前验证 URL 格式和协议。

#### Scenario: 打开允许的 Web URL
- **WHEN** 渲染进程通过 preload API 请求打开有效的 `http:` 或 `https:` URL
- **THEN** 主进程 SHALL 调用 Electron shell 使用系统默认浏览器打开该 URL
- **AND** 主进程 SHALL 返回成功结果

#### Scenario: 拒绝非 Web 协议
- **WHEN** 渲染进程通过 preload API 请求打开 `http:` 和 `https:` 以外协议的 URL
- **THEN** 主进程 SHALL 拒绝该请求
- **AND** 主进程 SHALL NOT 调用系统默认浏览器打开该 URL

#### Scenario: 拒绝无效 URL
- **WHEN** 渲染进程通过 preload API 请求打开无法解析为有效 URL 的字符串
- **THEN** 主进程 SHALL 拒绝该请求
- **AND** 主进程 SHALL NOT 调用系统默认浏览器打开该字符串

#### Scenario: preload 暴露受限 API
- **WHEN** 渲染进程加载完成
- **THEN** `window.externalLinkApi` SHALL 可用
- **AND** `window.externalLinkApi` SHALL 提供打开外部 Web URL 的方法
- **AND** 渲染进程 SHALL NOT 直接访问 Electron shell 或 Node.js API
