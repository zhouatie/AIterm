## 1. 应用元信息通道

- [x] 1.1 在 `src/preload.ts` 中定义只读应用元信息类型，并暴露 `window.appInfoApi.get()`。
- [x] 1.2 在 `src/global.d.ts` 中声明 `window.appInfoApi` 类型。
- [x] 1.3 在 `src/main.ts` 中注册 `app:get-info` IPC handler，返回当前应用名称和 `app.getVersion()`。

## 2. 标题栏版本展示

- [x] 2.1 在 `src/App.tsx` 中读取应用元信息，并在读取失败时保持主界面可用。
- [x] 2.2 在主窗口 title bar 右侧渲染当前版本号，文案只表达当前版本，不表达最新或可更新状态。
- [x] 2.3 调整版本标记样式，确保不抢占文件树、主题切换和 Live View 按钮点击区域，并保留标题栏拖拽能力。

## 3. 验证

- [x] 3.1 运行项目基础校验，确认 TypeScript / lint 不因新增 preload API 和 window 类型报错。
- [x] 3.2 启动本地 Electron 应用，确认标题栏显示与 `package.json` 一致的当前版本号。
- [x] 3.3 在窄窗口下检查版本标记不会挤压或覆盖现有标题栏按钮。
