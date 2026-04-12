## ADDED Requirements

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
