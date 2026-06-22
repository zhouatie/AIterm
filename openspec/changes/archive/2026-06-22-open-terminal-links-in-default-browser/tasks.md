## 1. 主进程外部链接边界

- [x] 1.1 在 `src/main.ts` 中新增外部 Web URL 校验逻辑，使用 `new URL()` 解析输入并只允许 `http:`、`https:` 协议
- [x] 1.2 在 `src/main.ts` 中注册 `external-link:open` IPC handler，校验通过后调用 `shell.openExternal()`，失败时返回结构化错误
- [x] 1.3 确认不复用 GitHub Release 专用白名单逻辑，避免影响现有更新检查入口

## 2. Preload 与类型暴露

- [x] 2.1 在 `src/preload.ts` 中定义 `ExternalLinkApi` 和结构化返回类型
- [x] 2.2 通过 `contextBridge.exposeInMainWorld('externalLinkApi', ...)` 暴露受限打开方法
- [x] 2.3 在 `src/global.d.ts` 中扩展 `Window` 类型，声明 `externalLinkApi`

## 3. 终端 URL 点击行为

- [x] 3.1 在 `src/components/TerminalInstance.tsx` 中为 WebLinksAddon 提供自定义 handler
- [x] 3.2 自定义 handler 调用 `window.externalLinkApi.open(uri)`，不再依赖 WebLinksAddon 默认 `window.open()` 行为
- [x] 3.3 在打开失败时记录 warning，确保失败不会影响终端输入、输出或焦点
- [x] 3.4 确认文件路径链接和 FilePreviewPanel 跳转逻辑不被改动

## 4. 验证

- [x] 4.1 运行项目静态检查，确认 TypeScript 和 ESLint 不报新增错误
- [x] 4.2 通过代码检查确认终端 URL 点击路径使用 `externalLinkApi.open()` 而不是 `window.open()`
- [x] 4.3 验证 `external-link:open` 拒绝无效 URL 和非 `http:`/`https:` 协议
- [x] 4.4 验证现有 `appUpdateApi.openReleasePage()` 行为仍走 GitHub Release 专用入口
