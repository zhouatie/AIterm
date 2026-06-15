## 1. 主进程更新检查能力

- [x] 1.1 定义 AIterm GitHub Release 常量、更新检查结果类型和 Release URL 白名单规则
- [x] 1.2 实现无新增依赖的版本解析与比较 helper，支持 `vX.Y.Z` 和 `X.Y.Z`
- [x] 1.3 新增 `app:update:check` IPC handler，读取 `app.getVersion()` 并请求 GitHub latest Release 信息
- [x] 1.4 在检查成功时返回当前版本、最新版本、是否有新版和 Release 页面 URL
- [x] 1.5 在网络失败、响应异常、JSON 无效或版本无法解析时返回结构化失败结果，不抛出未处理异常
- [x] 1.6 新增打开 Release 页面的 IPC handler，并只允许打开 `github.com/zhouatie/AIterm/releases` 下的 URL

## 2. Preload 与类型边界

- [x] 2.1 在 preload 中定义 `AppUpdateApi` 和更新检查结果类型
- [x] 2.2 通过 `contextBridge.exposeInMainWorld('appUpdateApi', ...)` 暴露 `check()` 和 `openReleasePage()` 方法
- [x] 2.3 更新全局类型声明，确保渲染进程可以类型安全地访问 `window.appUpdateApi`

## 3. 渲染层交互

- [x] 3.1 在当前版本号附近增加手动检查更新入口，使用紧凑图标按钮并保持标题栏拖拽区域和布局稳定
- [x] 3.2 点击检查入口时展示检查中状态，并防止重复并发检查
- [x] 3.3 当前版本已是最新时展示明确状态和当前版本号
- [x] 3.4 发现新版本时展示当前版本、最新版本，并提供打开 GitHub Release 下载页的操作
- [x] 3.5 检查失败时展示可恢复错误，并提供打开 GitHub Release 页面手动查看的操作
- [x] 3.6 确保所有更新相关文案只表达“检查”和“打开下载页”，不暗示自动安装

## 4. 文档与验证

- [x] 4.1 更新 `docs/release-install.md`，说明应用内检查更新的使用方式和手动替换流程
- [x] 4.2 在文档中明确该能力不提供自动下载、自动安装、签名、公证或 DMG 安装器
- [x] 4.3 运行 `npm run lint` 验证 TypeScript/React 代码符合现有规则
- [x] 4.4 启动应用手动验证“已是最新 / 发现新版本 / 检查失败并打开 Release 页”的关键状态
