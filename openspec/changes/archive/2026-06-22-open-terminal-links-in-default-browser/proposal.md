## Why

终端中的 URL 链接目前由 xterm WebLinksAddon 默认处理，点击后会通过 Electron 渲染进程的 `window.open()` 进入当前应用的新窗口流程，而不是明确交给系统默认浏览器。用户期望终端链接像普通桌面终端一样在系统默认浏览器中打开，避免 AIterm 自身承接网页浏览职责。

## What Changes

- 终端中识别出的 `http://` 和 `https://` URL 链接点击后，通过主进程调用系统默认浏览器打开。
- 渲染进程不直接使用 `window.open()` 打开终端 URL，而是通过 preload 暴露的受限 API 请求主进程处理。
- 主进程在打开外部链接前校验 URL，只允许 `http:` 和 `https:` 协议，避免暴露任意系统协议打开能力。
- 文件路径链接行为保持不变，仍在 FilePreviewPanel 中打开对应文件。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `terminal-smart-links`: 明确终端 URL 链接点击必须使用系统默认浏览器打开，并继续与文件路径链接互不干扰。
- `electron-shell`: 增加受限的外部 URL 打开边界，允许终端链接通过主进程安全调用系统默认浏览器。

## Impact

- `src/components/TerminalInstance.tsx`: 为 WebLinksAddon 提供自定义 URL 点击 handler。
- `src/preload.ts`、`src/global.d.ts`: 暴露受限外部链接打开 API。
- `src/main.ts`: 新增 IPC handler，校验 URL 后调用 `shell.openExternal()`。
- `openspec/specs/terminal-smart-links/spec.md`、`openspec/specs/electron-shell/spec.md`: 增加对应行为要求。
