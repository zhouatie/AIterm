# AIterm

AIterm 是一个基于 Electron 的本地开发工作台，当前以 macOS 为主要使用和发布平台。

## 开发

开发启动：

```sh
npm run start
```

本地验证打包后的 app bundle：

```sh
npm run package
open out/AIterm-darwin-arm64/AIterm.app
```

`npm run package` 的输出位于 `out/`，只适合开发验证，不建议作为长期安装位置。

## 普通提交代码

普通开发提交只需要正常 push，不会触发正式发布包：

```sh
git add .
git commit -m "Your change"
git push
```

## 发布安装包

正式发包通过 GitHub tag 触发。workflow 会在 macOS arm64 runner 上执行 `npm ci`、`npm run lint` 和 `npm run make`，然后把 ZIP 上传到 GitHub Release。

推荐使用 `npm version` 更新版本并自动创建 tag：

```sh
npm version patch
git push
git push origin v1.0.1
```

也可以手动发版：

```sh
# 先把 package.json 的 version 改为 1.0.1，并提交
git add package.json package-lock.json
git commit -m "Release v1.0.1"

git tag v1.0.1
git push
git push origin v1.0.1
```

注意事项：

- tag 必须是 `vX.Y.Z` 格式。
- tag 去掉 `v` 后必须与 `package.json` 的 `version` 完全一致。
- 普通 `git push` 只同步代码，不会创建安装包。
- 只有 `git push origin vX.Y.Z` 这类 tag 推送会触发 GitHub Release 发布。

## 本地发布验证

如果要在本地验证分发产物，请在 macOS 宿主机执行：

```sh
npm ci
npm run lint
npm run make
```

预期产物：

```text
out/make/zip/darwin/arm64/AIterm-darwin-arm64-<version>.zip
```

不要在共享 `node_modules` 的 Docker 容器中执行 macOS 发布构建或重装依赖。容器通常是 Linux 环境，会把 native/optional 依赖安装成 Linux 版本，导致 macOS 宿主机后续构建不兼容。

更多安装和当前阶段限制见 [docs/release-install.md](docs/release-install.md)。
