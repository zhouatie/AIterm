## Why

当前 AIterm 的长期使用依赖本地执行 `npm run package` 后直接打开 `out/.../AIterm.app`，这更像开发验证流程，不适合作为稳定的日常安装方式。需要先建立一条可重复的发布链路，让提交到 GitHub 后能够自动产出可下载的 macOS 包，并支持用户下载安装到 Applications。

## What Changes

- 新增 GitHub Actions 发布构建流程，在推送版本 tag 时自动安装依赖、执行校验并运行 Electron Forge 打包。
- 将 macOS 分发产物作为 GitHub Release asset 上传，供用户下载。
- 明确本地开发验证使用 `npm run package`，正式分发使用 `npm run make` 或 CI 发布产物。
- 增加发布与安装说明，指导用户从 GitHub Release 下载并安装到 `/Applications` 或 `~/Applications`。
- 暂不引入应用内自动更新、Apple Developer ID 签名、notarization 或 DMG 安装器；这些作为后续阶段处理。

## Capabilities

### New Capabilities

- `desktop-app-distribution`: 桌面应用分发能力，覆盖本地 make 产物、GitHub Release 自动构建上传、下载后安装使用的发布流程。

### Modified Capabilities

（无，当前缺少独立的应用分发规格，本次新增能力而非修改现有运行时能力。）

## Impact

- **构建流程**: 新增 GitHub Actions workflow，使用 Node/npm 与 Electron Forge 生成 macOS 分发包。
- **项目配置**: 可能调整 `package.json` scripts 或 Forge maker 配置，使本地与 CI 的分发命令清晰一致。
- **发布产物**: GitHub Release 将包含 macOS arm64 ZIP 产物，供下载后安装。
- **文档**: 新增或更新发布、下载、安装说明。
- **范围限制**: 不处理应用内升级、不处理 Apple 签名与 notarization、不保证跨平台产物。
