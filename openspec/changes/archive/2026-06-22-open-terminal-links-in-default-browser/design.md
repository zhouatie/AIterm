## Context

AIterm 的终端由 `TerminalInstance` 初始化 xterm.js，并直接加载 `new WebLinksAddon()`。该 addon 的默认 URL 点击处理器会调用渲染进程的 `window.open()`，在 Electron 环境中这会进入当前应用的新窗口处理流程，而不是明确使用系统默认浏览器。

当前主进程已经在更新检查功能中使用 `shell.openExternal()` 打开 GitHub Release 页面，说明应用已有“由主进程调用系统外部能力”的模式。新的终端链接行为应复用这一边界，但不能把任意协议打开能力暴露给渲染进程。

## Goals / Non-Goals

**Goals:**

- 点击终端中的 `http://` 和 `https://` URL 时，使用系统默认浏览器打开。
- 避免终端 URL 点击创建 AIterm 自身的 Electron 窗口。
- 将外部链接打开能力限制在主进程，并在主进程校验协议。
- 保持文件路径链接和 FilePreviewPanel 跳转行为不变。

**Non-Goals:**

- 不改变 WebLinksAddon 的 URL 识别正则和范围。
- 不支持 `file:`, `mailto:`, 自定义 app scheme 等非 Web URL。
- 不恢复或新增内嵌浏览器面板。
- 不修改系统默认浏览器设置。

## Decisions

### D1: 在 WebLinksAddon 上提供自定义 handler

选择：将 `new WebLinksAddon()` 改为传入自定义点击处理器，由该处理器调用 preload 暴露的外部链接 API。

理由：这是终端 URL 链接的最小作用域改动，只影响 xterm WebLinksAddon 命中的 URL。相比在主进程全局拦截 `window.open()` 或 `setWindowOpenHandler()`，定向 handler 不会影响应用其他潜在窗口行为，也不需要重新定义所有 renderer 新窗口策略。

备选：在主进程对主窗口设置全局 `setWindowOpenHandler()`。放弃原因是它会捕获更宽范围的窗口打开请求，后续若有登录、帮助页、更新页等流程，容易产生额外策略分支。

### D2: 通过 preload 暴露受限 API，而不是在 renderer 中直接打开

选择：新增类似 `externalLinkApi.open(url)` 的 preload API，renderer 只发送 URL 字符串，主进程负责验证和调用 `shell.openExternal()`。

理由：当前 BrowserWindow 禁用了 `nodeIntegration` 并启用了 `contextIsolation`，渲染进程不应直接访问 Electron shell。preload API 可以保持现有安全通信模式，并让调用点在类型上清晰可见。

备选：在 renderer 中继续使用 `window.open()` 并依赖 Electron 默认行为。放弃原因是这正是当前问题来源，且不能提供协议白名单边界。

### D3: 主进程只允许 http/https URL

选择：主进程 IPC handler 使用 `new URL()` 解析输入，只允许 `http:` 和 `https:` 协议；解析失败或协议不允许时返回结构化错误，不调用 `shell.openExternal()`。

理由：终端输出来自 PTY，可能包含不可信内容。即使点击动作由用户触发，也不应让终端文本获得打开任意系统协议的能力。

备选：允许所有 Electron shell 支持的协议。放弃原因是风险边界过宽，可能触发系统级协议处理器或本地文件访问。

## Risks / Trade-offs

- [Risk] 某些用户希望点击 `file://`、`mailto:` 或自定义协议链接。-> Mitigation: 本变更明确只覆盖 Web URL；其他协议可在后续 change 中按协议逐个评估。
- [Risk] 系统默认浏览器不可用或 `shell.openExternal()` 失败。-> Mitigation: IPC 返回 `{ ok: false, error }`，renderer 可记录 warning，不影响终端输入输出。
- [Risk] WebLinksAddon 仍可能不识别某些边界格式的 URL。-> Mitigation: 本变更不改变识别逻辑，只替换命中后的打开方式；识别增强另行处理。
- [Trade-off] 新增一个通用外部链接 API 与现有 `appUpdateApi.openReleasePage()` 有少量重叠。-> Mitigation: 更新页 API 继续保留专用的 GitHub Release 白名单；新的 API 仅用于终端 Web URL，并以 http/https 协议作为边界。

## Migration Plan

1. 在 preload 和全局类型中新增受限外部链接 API。
2. 在主进程注册对应 IPC handler，完成 URL 解析、协议校验和 `shell.openExternal()` 调用。
3. 将 TerminalInstance 中 WebLinksAddon 的默认 handler 替换为调用该 API 的 handler。
4. 回滚时可恢复 `new WebLinksAddon()` 默认加载并移除新增 API/IPC；该变更不涉及数据迁移。

## Open Questions

无。
