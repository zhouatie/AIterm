## Context

当前项目使用 Electron Forge。`npm run package` 会生成 `out/AIterm-darwin-arm64/AIterm.app`，适合本地验证；`npm run make` 会通过已配置的 `MakerZIP` 生成 `out/make/zip/darwin/arm64/AIterm-darwin-arm64-<version>.zip`，更适合作为第一阶段的分发产物。

仓库根目录当前没有 `.github/workflows`，因此提交到 GitHub 后不会自动生成可下载包。用户现在需要手动本地打包并执行 `open out/.../AIterm.app`，这会把开发产物当成日常安装产物使用，路径不稳定，也不符合 macOS 应用通常放在 `/Applications` 或 `~/Applications` 的使用方式。

## Goals / Non-Goals

**Goals:**

- 建立 macOS 优先的 GitHub Release 打包流程，推送版本 tag 后自动产出可下载 ZIP。
- 使用 Electron Forge `make` 作为分发构建入口，避免把 `package` 产物直接当作发布包。
- 在 CI 中执行依赖安装、基础校验和构建，减少本地环境差异。
- 提供清晰的下载和安装说明，让用户把 AIterm 安装到 `/Applications` 或 `~/Applications`。

**Non-Goals:**

- 不实现应用内自动更新。
- 不新增 Apple Developer ID 签名、notarization 或 Gatekeeper 绕过流程。
- 不新增 DMG 安装器。
- 不保证 Windows/Linux 发布产物。
- 不改变应用运行时功能。

## Decisions

### 决策 1：第一阶段使用 Electron Forge `make`，不直接发布 `package` 目录

选择：CI 与本地正式分发都以 `npm run make` 为入口，上传 Forge maker 生成的 ZIP。

理由：`package` 的输出是可运行 app bundle，适合开发者本机验证；`make` 是 Forge 对外分发的产物边界，输出路径和文件名包含平台、架构、版本，更适合自动上传和用户下载。

替代方案：直接压缩 `out/AIterm-darwin-arm64/AIterm.app`。该方案能工作，但会绕过 maker 层，后续引入 DMG、签名或发布 metadata 时需要重新调整发布语义。

### 决策 2：以版本 tag 触发 GitHub Release 发布

选择：新增 workflow 在 `v*` tag 推送时运行，校验 tag 版本与 `package.json` 的 `version` 一致，并将构建产物上传到对应 GitHub Release。

理由：Release asset 应该对应明确版本。tag 触发可以把 `package.json` 版本、Git tag 和下载包版本绑定起来，避免 main 分支每次提交都产生用户可见的“不稳定版本”。

替代方案：每次 push 到 main 都上传 workflow artifact。该方案适合内部验证，但 artifact 有保留期，不是稳定下载入口，也不天然表达正式版本。

### 决策 3：第一阶段只构建 macOS arm64 ZIP

选择：GitHub Actions 使用 macOS runner，安装依赖后运行 lint 和 Forge make，上传 `out/make/zip/darwin/arm64/*.zip`。

理由：当前项目目标平台一直是 macOS 优先，现有本地产物也是 `darwin-arm64`。项目依赖 `node-pty` native addon，使用 macOS runner 能让 Electron rebuild 和打包环境更接近实际目标平台。

替代方案：同时构建 x64、Windows、Linux。该方案会显著扩大验证矩阵，并引入额外 installer、签名和原生模块问题，不适合第一阶段。

### 决策 4：安装体验先采用 ZIP 下载后拖入 Applications

选择：Release 中提供 ZIP，文档说明解压后把 `AIterm.app` 移动到 `/Applications` 或 `~/Applications`，本地开发仍可使用 `npm run package` 后临时打开。

理由：ZIP 已由当前 Forge 配置支持，改动小，能够先解决“从 GitHub 下载包安装”的问题。DMG 会改善拖拽安装体验，但不是建立自动发布链路的必要条件。

替代方案：立即新增 DMG。该方案更接近 macOS 用户习惯，但需要额外 maker、图标/背景/布局配置，并且最好与签名、公证一起规划。

### 决策 5：文档明确签名与自动更新不在本阶段承诺内

选择：发布说明中明确第一阶段产物未提供应用内更新；若仍使用 ad-hoc 签名或未公证，文档说明这是开发者自用/内部使用级别的发布链路。

理由：自动更新和 notarization 都会改变用户信任与升级模型，需要额外设计。先把构建发布链路跑通，后续再在稳定产物基础上扩展。

替代方案：同时做自动更新和 notarization。该方案更完整，但会把第一阶段的简单发布链路变成证书、密钥、update feed 和 UI 行为的综合改造。

## Risks / Trade-offs

- [Risk] 未签名或未公证的下载包在其他 macOS 设备上打开时可能触发 Gatekeeper 警告 → Mitigation: 文档明确当前发布级别，并将 Developer ID 签名与 notarization 列为后续阶段。
- [Risk] Git tag 与 `package.json` version 不一致导致产物命名和 Release 版本混乱 → Mitigation: workflow 中增加版本一致性校验，发布前必须同步版本号。
- [Risk] CI 上 native addon rebuild 与本地行为不一致 → Mitigation: 使用 macOS runner，CI 产物以 `npm ci` 的 lockfile 环境构建，并把 `npm run make` 作为唯一发布入口。
- [Risk] ZIP 安装体验不如 DMG 直观 → Mitigation: 第一阶段通过文档降低误用成本，后续单独引入 DMG maker。
- [Risk] Release workflow 需要 GitHub token 权限上传 asset → Mitigation: 使用 GitHub Actions 默认 `GITHUB_TOKEN` 并在 workflow 中声明最小 `contents: write` 权限。

## Migration Plan

1. 新增发布 workflow，并在仓库中保留现有本地开发命令。
2. 新增发布和安装文档，说明 `package` 与 `make` 的用途差异。
3. 用一个测试 tag 验证 GitHub Release 是否包含 macOS arm64 ZIP。
4. 若发布失败，删除测试 tag 或对应 Release 后修正 workflow；不会影响应用运行时代码。

## Open Questions

（无）
