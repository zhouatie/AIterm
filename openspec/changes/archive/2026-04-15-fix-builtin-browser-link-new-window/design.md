## Context

当前内置浏览器面板使用 Electron `<webview>` 标签实现多 Tab 浏览。对于新窗口请求（`target="_blank"`、`window.open`），渲染进程通过监听 webview 的 `new-window` 事件来拦截并在面板内新 Tab 打开。

问题是 `new-window` 事件已在 Electron 中被废弃（deprecated），在较新版本中不再可靠触发。当该事件未触发时，Electron 的默认行为是在新的 BrowserWindow 中打开链接，导致用户体验断裂。

当前 webview 标签还设置了 `allowpopups` 属性，这允许 webview 内的网页调用 `window.open` 打开新窗口。配合失效的 `new-window` 事件拦截，弹窗请求直接变成了新的 Electron 窗口。

## Goals / Non-Goals

**Goals:**

- 确保 webview 内所有新窗口请求（`target="_blank"`、`window.open`、`<a>` 链接点击等）在浏览器面板内以新 Tab 打开
- 使用 Electron 推荐的 `setWindowOpenHandler` API 替代废弃的 `new-window` 事件
- 修复在主进程侧进行拦截，保证可靠性

**Non-Goals:**

- 不处理 webview 内部的同窗口导航（正常的页面跳转已工作正常）
- 不实现"在系统浏览器中打开"功能
- 不添加 URL 安全过滤/白名单机制（后续可独立实现）
- 不修改 webview 的其他安全设置（如 CSP、权限等）

## Decisions

### 决策 1: 使用 `web-contents-created` + `setWindowOpenHandler` 在主进程拦截

**选择**: 在主进程中监听 `app.on('web-contents-created')` 事件，判断 webContents 类型为 `webview`，然后调用 `contents.setWindowOpenHandler()` 拦截新窗口请求，返回 `{ action: 'deny' }` 并通过 IPC 将 URL 发送给渲染进程。

**理由**:
- `setWindowOpenHandler` 是 Electron 官方推荐的替代方案，在所有现代 Electron 版本中稳定工作
- 主进程拦截比渲染进程更可靠，因为新窗口创建是在主进程发起的
- `web-contents-created` 能自动捕获所有 webview 的创建，无需逐个绑定

**替代方案**:
- ~~继续使用渲染进程 `new-window` 事件~~: 已废弃，不可靠
- ~~在渲染进程中通过 `webview.getWebContentsId()` 间接调用~~: 需要 remote 模块，安全性差

### 决策 2: IPC 通道设计 — 主进程 → 渲染进程单向推送

**选择**: 新增 `browser:open-url` IPC 通道，主进程通过 `mainWindow.webContents.send()` 推送 URL，渲染进程通过 preload 暴露的 `onOpenUrl` 回调接收。

**理由**:
- 新窗口拦截发生在主进程，URL 需要传递到渲染进程的 BrowserPanel 组件
- 单向推送（main → renderer）符合此场景：主进程拦截事件后通知渲染进程处理
- 与现有 IPC 模式一致（如 `terminal:output`、`terminal:exit` 等均使用相同的 main → renderer 推送模式）

### 决策 3: 移除 `allowpopups` 属性

**选择**: 从 webview 标签上移除 `allowpopups` 属性。

**理由**:
- 新窗口请求已在主进程的 `setWindowOpenHandler` 中被拦截（返回 `deny`），不再需要 webview 层面允许弹窗
- 移除 `allowpopups` 作为额外的安全层，防止任何遗漏的弹窗请求

## Risks / Trade-offs

- **[风险] `web-contents-created` 同时捕获非浏览器面板的 webview** → 缓解：通过检查 webContents 的 `session.partition` 是否为 `persist:browser` 来精确识别浏览器面板的 webview，避免影响其他可能的 webview 实例
- **[风险] 主进程发送 IPC 时 mainWindow 可能已销毁** → 缓解：发送前检查 `mainWindow` 和 `mainWindow.isDestroyed()` 状态
- **[trade-off] 移除 `allowpopups` 后 `window.open` 的返回值变为 null** → 可接受：绝大多数网页不依赖 `window.open` 的返回值进行后续操作；少数依赖的场景（如 OAuth 弹窗流程）可能受影响，但这属于 Non-Goal 中后续可独立处理的安全过滤需求
