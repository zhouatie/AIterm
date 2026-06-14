## ADDED Requirements

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
