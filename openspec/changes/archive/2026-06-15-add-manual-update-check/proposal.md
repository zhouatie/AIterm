## Why

AIterm 当前只能让用户自行去 GitHub Release 页面判断是否有新版本，虽然标题栏已经展示当前版本，但缺少一个低成本、低风险的更新入口。先提供手动检查更新，可以在不引入 Apple Developer 签名、公证或自动安装链路的前提下，降低用户发现新版和下载新版的成本。

## What Changes

- 在应用内提供手动“检查更新”入口，用户触发后检查 GitHub Release 的最新版本。
- 当发现新版本时，向用户展示当前版本、最新版本和下载入口，并允许用户打开 GitHub Release 页面手动下载 ZIP。
- 当当前版本已是最新时，向用户展示无需更新的状态。
- 当网络失败、Release 信息不可用或版本解析失败时，向用户展示可恢复错误，并保留打开 Release 页面手动查看的路径。
- 更新发布安装文档，说明该能力只是手动检查和跳转下载，不会自动下载、自动替换、自动重启，也不改变当前未签名/未公证限制。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `desktop-app-distribution`: 增加应用内手动检查 GitHub Release 最新版本并引导用户下载的分发体验要求。
- `electron-shell`: 增加通过主进程安全打开外部 Release URL 的要求，避免渲染进程直接绕过 Electron 安全边界。

## Impact

- 主进程：新增或扩展只读应用更新检查 IPC handler，并通过 Electron shell 打开外部 Release 页面。
- preload：新增受限的更新检查 API，保持 `contextIsolation` 和 `nodeIntegration: false` 的安全模型。
- 渲染进程：在现有标题栏、设置面板或版本展示附近增加手动检查更新入口和状态反馈。
- 网络：运行时需要访问 GitHub Releases API 或公开 Release endpoint；失败时不得影响应用主功能。
- 文档：更新 `docs/release-install.md`，明确手动更新体验和当前阶段限制。
- 依赖：优先使用 Electron/Node 内置能力；除非实现阶段证明必要，否则不新增 updater、签名、公证或自动安装相关依赖。
