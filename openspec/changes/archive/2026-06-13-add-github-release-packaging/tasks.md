## 1. 发布构建流程

- [x] 1.1 新增 `.github/workflows/release.yml`，在推送 `v*` tag 时触发 macOS 发布构建
- [x] 1.2 在 workflow 中声明最小 `contents: write` 权限，用于创建或更新 GitHub Release asset
- [x] 1.3 在 workflow 中使用 `actions/checkout`、`actions/setup-node` 和 `npm ci` 基于 lockfile 安装依赖
- [x] 1.4 在 workflow 中校验 Git tag `vX.Y.Z` 与 `package.json` 的 `version` 完全一致
- [x] 1.5 在 workflow 中执行项目基础校验，并运行 `npm run make` 生成 Electron Forge 分发产物
- [x] 1.6 在 workflow 中将 `out/make/zip/darwin/arm64/*.zip` 上传到对应 GitHub Release

## 2. 本地分发与安装文档

- [x] 2.1 新增发布安装文档，说明 `npm run package` 是本地验证入口，`npm run make` 和 GitHub Release ZIP 是分发入口
- [x] 2.2 文档说明用户从 GitHub Release 下载 macOS arm64 ZIP 并解压
- [x] 2.3 文档说明用户将 `AIterm.app` 移动到 `/Applications` 或 `~/Applications`
- [x] 2.4 文档明确第一阶段不包含应用内自动更新、Apple Developer ID 签名、notarization 和 DMG 安装器
- [x] 2.5 文档说明发布步骤：更新 `package.json` 版本、提交代码、创建匹配的 `vX.Y.Z` tag、推送 tag

## 3. 验证

- [x] 3.1 本地执行 `npm run lint`，确认基础校验通过
- [x] 3.2 本地执行 `npm run make`，确认生成 `out/make/zip/darwin/arm64/AIterm-darwin-arm64-<version>.zip`
- [x] 3.3 检查 workflow 上传路径与本地 `npm run make` 实际输出路径一致
- [x] 3.4 创建测试 tag 验证 GitHub Release 包含 macOS arm64 ZIP 产物
- [x] 3.5 下载测试 Release ZIP，确认解压后包含可移动到 Applications 的 `AIterm.app`
