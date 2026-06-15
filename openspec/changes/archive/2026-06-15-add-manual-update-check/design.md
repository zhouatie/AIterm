## Context

AIterm 当前使用 Electron Forge 打包，`package.json` 的 `version` 是发布版本来源，GitHub Actions 在推送 `v*` tag 后构建并上传 macOS arm64 ZIP 到 GitHub Release。应用标题栏已经通过 `app:get-info` IPC 展示当前版本，渲染进程保持 `contextIsolation: true` 和 `nodeIntegration: false`，因此新增更新检查入口也应沿用“主进程 IPC + preload 受限 API + 渲染层展示”的边界。

当前发布文档明确不提供应用内自动更新、Apple Developer ID 签名、公证或 DMG。这个变更只补齐低成本的“手动检查新版并打开下载页”，不把 ZIP 替换、退出重启、签名公证纳入本阶段。

## Goals / Non-Goals

**Goals:**

- 用户可以在应用内手动触发更新检查。
- 系统可以对比当前版本和 GitHub Release 最新版本，并返回“有新版 / 已是最新 / 检查失败”的明确状态。
- 发现新版时，用户可以从应用内打开 GitHub Release 页面手动下载 ZIP。
- 更新检查失败不得影响终端、文件预览等核心功能。
- 保持现有 Electron 安全模型，渲染进程不直接访问 Node.js API 或任意 shell 能力。

**Non-Goals:**

- 不实现自动下载、自动安装、自动替换、自动重启或 `autoUpdater.quitAndInstall()`。
- 不新增 Apple Developer ID 签名、公证、DMG、PKG 或完整 installer 体验。
- 不支持 Windows/Linux 更新检查矩阵。
- 不支持私有仓库鉴权、企业内部分发服务器或自建 update feed。
- 不在后台定时轮询检查更新；本阶段只响应用户手动点击。

## Decisions

### 决策 1：主进程负责 GitHub Release 检查

选择：在主进程新增 `app:update:check` IPC handler，读取 `app.getVersion()` 作为当前版本，访问 GitHub Releases latest endpoint 获取最新正式 Release 的 `tag_name`、`html_url` 和名称等只读信息，返回结构化结果给渲染层。

理由：主进程已经持有 runtime 应用版本，且可以集中处理网络错误、版本解析和 URL 白名单。渲染层只消费状态，不需要直接调用 Node.js 或任意外部 URL。

替代方案：由渲染进程直接 `fetch` GitHub API。该方案代码少，但会把更新检查 URL、错误处理和潜在跨域行为放进 UI 层，不符合当前 preload 边界风格。

### 决策 2：使用公开 GitHub Release latest 作为唯一版本来源

选择：检查 `https://api.github.com/repos/zhouatie/AIterm/releases/latest`，并用 `tag_name` 与当前 `app.getVersion()` 对比。Release 下载入口使用 GitHub Release 页面 URL，而不是直接打开某个 asset 下载链接。

理由：当前发布流程已经以 GitHub Release 为正式分发入口，latest endpoint 会忽略 draft release，适合“用户可见稳定版本”的判断。打开 Release 页面比直接下载 asset 更稳，用户可以看到版本说明和当前未签名/未公证限制。

替代方案：解析项目网页或直接拼接 `/releases/latest`。网页解析脆弱；直接跳转 latest 页面无法在应用内判断“是否已是最新”。

### 决策 3：版本比较只覆盖常规 semver 发布

选择：将 `v1.2.3` 和 `1.2.3` 解析为三段数字进行比较；无法解析时返回检查失败并允许用户打开 Release 页面手动确认。`releases/latest` 不用于 prerelease 自动判定。

理由：现有 workflow 已要求 tag 与 `package.json` version 一致，当前版本格式是 `1.0.5`。保持比较逻辑简单，可以避免引入 semver 依赖。

替代方案：新增 `semver` 依赖并完整支持 prerelease/build metadata。该方案更完整，但对当前正式发布流程不是必要成本。

### 决策 4：通过受限 preload API 暴露更新能力

选择：新增 `appUpdateApi`，例如 `check()` 和 `openReleasePage(url?)`。`check()` 调用主进程检查；`openReleasePage()` 只允许打开主进程认可的 GitHub Release URL。

理由：项目已有 `appInfoApi`、`themeApi`、`liveViewApi` 等 API 分层，更新检查应保持同样模式。打开外部页面属于 shell 能力，必须由主进程验证 URL 后执行。

替代方案：复用 `appInfoApi`。该方案减少一个全局对象，但会让只读应用信息和网络更新动作混在一起，职责不清。

### 决策 5：UI 放在版本信息附近，使用轻量状态反馈

选择：在当前版本号附近增加一个图标按钮或紧凑入口；点击后显示短暂状态（检查中、已是最新、发现新版、检查失败），发现新版或失败时提供“打开 Release 页面”动作。

理由：版本号已经在标题栏右侧，用户自然会在这里寻找更新相关信息。轻量入口不会占用终端工作区，也不会让用户误以为应用具备自动安装能力。

替代方案：新增设置页区域。该方案空间更充足，但用户需要进入设置才看到更新入口；可作为后续 UI 调整，不影响本变更核心行为。

## Risks / Trade-offs

- [Risk] GitHub API 网络失败或被限流导致检查失败 -> Mitigation: 将失败展示为可恢复状态，并提供打开 Release 页面手动查看的兜底入口。
- [Risk] 用户误解为自动更新 -> Mitigation: UI 和文档使用“检查更新”“打开下载页”等文案，不使用“安装更新”“自动更新”。
- [Risk] GitHub 仓库变为私有后 latest endpoint 不可用 -> Mitigation: 失败时保留手动打开 Release 页面路径；私有分发另起后续设计。
- [Risk] Release tag 不是三段数字导致误判 -> Mitigation: 解析失败时不做错误比较，提示用户手动查看 Release。
- [Risk] 外部 URL 打开能力被滥用 -> Mitigation: 主进程只允许打开固定仓库的 Release URL 或固定 `/releases/latest` URL。

## Migration Plan

1. 在主进程加入更新检查和打开 Release 页面 IPC handler，不改变现有启动、关闭和发布流程。
2. 在 preload 暴露受限 `appUpdateApi`。
3. 在版本展示附近加入手动检查入口和状态反馈。
4. 更新发布安装文档，说明这是手动检查和跳转下载，不是自动安装。
5. 回滚时移除新增 IPC、preload API、UI 状态和文档段落；不涉及数据迁移。

## Open Questions

- 更新入口最终放在标题栏版本号旁，还是设置面板中？默认按标题栏版本号旁实现，除非布局验证显示宽度不足。
