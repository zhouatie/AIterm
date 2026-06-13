# Release And Installation

这份文档说明 AIterm 第一阶段的发布和安装流程。当前目标是 macOS arm64 ZIP 分发包：开发者通过 GitHub Release 发布，用户下载后安装到 Applications。

## 构建入口

`npm run package` 用于本地开发验证。它会生成可直接运行的 app bundle，例如：

```sh
npm run package
open out/AIterm-darwin-arm64/AIterm.app
```

这个目录属于构建输出，不适合作为长期安装位置。

`npm run make` 用于生成分发产物。它会通过 Electron Forge maker 生成带版本号的 ZIP：

```sh
npm run make
ls out/make/zip/darwin/arm64/
```

预期产物形如：

```text
AIterm-darwin-arm64-1.0.0.zip
```

GitHub Release 上传的也是这个 ZIP。

## 用户安装

1. 打开项目的 GitHub Releases 页面。
2. 下载对应版本的 macOS arm64 ZIP，例如 `AIterm-darwin-arm64-1.0.0.zip`。
3. 解压 ZIP，得到 `AIterm.app`。
4. 将 `AIterm.app` 移动到 `/Applications` 或 `~/Applications`。
5. 从 Applications、Spotlight 或 Dock 启动 AIterm。

如果 macOS 提示来自未验证开发者，说明当前包还没有完成 Apple Developer ID 签名和 notarization。这是第一阶段发布链路的限制。

## 发布步骤

1. 更新 `package.json` 的 `version`。
2. 提交代码。
3. 创建与 `package.json` 版本一致的 tag。版本 `1.0.1` 对应 tag `v1.0.1`：

   ```sh
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. GitHub Actions 会在 tag 推送后运行 release workflow。
5. workflow 会校验 tag 版本与 `package.json` 版本一致，执行 `npm ci`、`npm run lint` 和 `npm run make`。
6. 构建成功后，workflow 会创建或更新对应 GitHub Release，并上传 `out/make/zip/darwin/arm64/*.zip`。

## 当前阶段限制

- 不提供应用内自动更新。升级时需要从 GitHub Release 下载新 ZIP，并替换 Applications 中的旧 `AIterm.app`。
- 不提供 Apple Developer ID 签名。
- 不提供 notarization。
- 不提供 DMG 安装器。
- 不承诺 Windows 或 Linux 发布产物。

这些能力可以在后续阶段单独设计和实现。
