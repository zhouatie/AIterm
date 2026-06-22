## ADDED Requirements

### Requirement: 终端 URL 链接使用系统默认浏览器打开
系统 SHALL 在用户点击终端中的 `http://` 或 `https://` URL 链接时，通过系统默认浏览器打开目标 URL，而不是通过 AIterm 当前应用窗口或新的 Electron 应用窗口打开。

#### Scenario: 点击 HTTP URL
- **WHEN** 用户点击终端输出中的 `http://` URL 链接
- **THEN** 系统 SHALL 请求主进程使用系统默认浏览器打开该 URL
- **AND** AIterm SHALL NOT 为该 URL 创建新的应用内 BrowserWindow

#### Scenario: 点击 HTTPS URL
- **WHEN** 用户点击终端输出中的 `https://` URL 链接
- **THEN** 系统 SHALL 请求主进程使用系统默认浏览器打开该 URL
- **AND** AIterm SHALL NOT 为该 URL 创建新的应用内 BrowserWindow

#### Scenario: URL 链接与文件路径链接互不干扰
- **WHEN** 终端输出同时包含 URL 链接和文件路径链接
- **THEN** URL 链接 SHALL 使用系统默认浏览器打开
- **AND** 文件路径链接 SHALL 继续在 FilePreviewPanel 中打开对应文件
