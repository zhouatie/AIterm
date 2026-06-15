## ADDED Requirements

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
