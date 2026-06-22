## ADDED Requirements

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
