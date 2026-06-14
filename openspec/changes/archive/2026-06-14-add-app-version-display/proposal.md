## Why

当前客户端界面没有展示已安装 AIterm 的版本号，用户需要离开应用或查看构建产物才能判断自己正在运行哪个版本。将版本号显示在客户端面板中，可以让用户快速对照 GitHub Release 或安装说明确认是否需要升级。

## What Changes

- 在应用主窗口的客户端 chrome 区域展示当前 AIterm 版本号。
- 版本号 SHALL 来自 Electron 应用运行时元信息，而不是在渲染进程中硬编码。
- 通过现有 contextBridge / preload 安全边界向渲染进程暴露只读应用元信息。
- 本变更不引入应用内自动更新，也不承诺联网检查最新版本。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `electron-shell`: 增加只读应用元信息 IPC / preload 能力，使渲染进程可以安全读取当前应用版本。
- `panel-layout`: 增加窗口 chrome/title bar 中展示当前客户端版本号的界面要求。

## Impact

- 影响 `src/main.ts` 的 IPC handler 注册。
- 影响 `src/preload.ts` 和 `src/global.d.ts` 的 preload API 类型与暴露对象。
- 影响 `src/App.tsx` 的标题栏渲染。
- 影响 `openspec/specs/electron-shell/spec.md` 与 `openspec/specs/panel-layout/spec.md` 的行为契约。
- 不新增运行时依赖，不改变发布、安装或自动更新流程。
