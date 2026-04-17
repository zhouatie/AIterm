## Context

当前主进程在 `before-quit` 中调用 `disposeAllSessions()`，非 macOS 的 `window-all-closed` 也会清理 PTY 后退出。但 macOS 按平台惯例在关闭所有窗口后不退出应用，当前 `window-all-closed` 分支不会清理 PTY；同时窗口销毁后 `mainWindow = null`，旧 PTY 即使继续输出也没有渲染进程可接收。

渲染进程会在 `beforeunload` 同步保存 tab 布局，并在新窗口加载时读取持久化状态，为每个保存的 session 创建新的 PTY。这使 macOS 关闭窗口后再从 dock 打开时出现两组进程：关闭前不可见但仍运行的旧 PTY，以及恢复布局时创建的新 PTY。

修复后关闭 GUI 会从“隐藏窗口但保留 PTY”变成“终止窗口内所有 PTY”。这是破坏运行中命令的操作，因此主窗口关闭前需要二次确认，避免用户误点关闭按钮导致 Codex/Claude/OpenCode 或长任务被直接杀掉。

## Goals / Non-Goals

**Goals:**

- 关闭 macOS 主窗口后，所有活跃 PTY 必须被终止并从主进程 session registry 中移除。
- 关闭 GUI 且存在活跃 PTY 时，必须先获得用户二次确认；取消关闭时不得清理 PTY 或销毁窗口。
- 重新打开窗口时只根据持久化布局创建一组新的 PTY，不得叠加旧 session。
- 保持当前 tab 布局持久化体验：workspace、session 数量、cwd、展开状态、重命名和活跃位置继续恢复。
- 保持 PTY 清理幂等，窗口关闭、应用退出、重复事件触发都不应抛错。

**Non-Goals:**

- 不实现 PTY detach / reattach。
- 不保证关闭窗口后 Codex/Claude/OpenCode 等 CLI agent 继续后台运行。
- 不改变用户主动关闭二级 terminal tab 或 workspace 时的销毁语义。
- 不为关闭单个二级 terminal tab 或 workspace 增加二次确认。
- 不引入新的外部依赖或跨平台兼容层。

## Decisions

### 决策 1：在 BrowserWindow `close` 事件中做二次确认

选择：在主窗口 `close` 事件中检查是否存在活跃 PTY；若存在，则阻止默认关闭流程并展示 Electron 原生确认对话框。用户取消时保持窗口和 PTY 原样；用户确认时设置一次性确认标记后重新触发关闭，使渲染进程仍有机会执行现有 `beforeunload` 同步保存。

理由：确认必须发生在窗口真正销毁和 `window-all-closed` 清理 PTY 之前。放在主进程 `close` 事件可覆盖点击窗口关闭按钮、系统菜单关闭窗口和快捷键关闭窗口等 GUI 关闭路径，同时不需要新增渲染进程 UI 状态。

替代方案：在渲染进程 `beforeunload` 中使用浏览器确认。Electron 对自定义 `beforeunload` 确认行为支持有限，且会把“保存 tab 状态”和“确认关闭”耦合在一起，不如主进程原生确认可控。

### 决策 2：macOS `window-all-closed` 也清理 PTY，但不退出应用

选择：在 `window-all-closed` 中无论平台都调用 `disposeAllSessions()`；非 macOS 继续 `app.quit()`，macOS 保持应用进程存活以符合 dock 重新打开窗口的惯例。

理由：问题根因是 macOS 分支跳过了 PTY 清理。把清理动作放在平台判断之前，能最小化改动并让“窗口不存在时不保留不可见终端进程”成为统一规则。

替代方案：在 `mainWindow.on('closed')` 中清理 PTY。这个方案也能解决主窗口关闭，但语义更靠近单个窗口对象；如果未来增加多个窗口，会更容易误清理其他窗口的终端。`window-all-closed` 更准确表达“没有窗口可承载终端 UI”。

### 决策 3：保留持久化布局恢复，但明确恢复不是进程恢复

选择：不修改持久化数据结构，继续保存 session id 和 cwd；恢复时仍创建新的 PTY，并把旧 id 映射到新 id，用于恢复活跃位置和手动名称。

理由：当前实现已经按“布局恢复 + 新 PTY 创建”工作。修复残留后，这个行为变得一致：关闭窗口终止旧 PTY，重新打开得到同样布局的一组新 shell。无需迁移存储格式。

替代方案：关闭窗口时删除持久化 tab 状态。这样能避免用户误以为运行态被恢复，但会破坏已有“恢复工作区布局”的体验，不符合本次目标。

### 决策 4：依赖 `disposeAllSessions()` 的幂等行为处理重复清理

选择：不增加额外的全局清理标记，继续使用 `sessions` Map 遍历 kill 并删除。窗口关闭后的 `window-all-closed` 会执行主要清理，应用真正退出前的 `will-quit` 再做一次兜底清理；Map 已空则无操作。

理由：当前 `disposeAllSessions()` 已按 Map 当前内容清理，重复调用天然安全。新增标记会制造状态同步问题，反而增加复杂度。

替代方案：在应用生命周期中记录 `hasDisposedSessions`。这会让后续新建窗口后再创建的 session 与旧标记产生耦合，需要额外重置，不划算。

## Risks / Trade-offs

- [用户关闭窗口但期望 agent 后台继续跑] → 明确把关闭窗口定义为终止窗口内终端会话；如果未来需要后台保活，应作为独立的 detach/reattach 能力设计。
- [关闭窗口时正在运行长任务] → 关闭前展示二次确认；用户取消时不关闭窗口、不清理 PTY。
- [确认后重新触发关闭导致重复弹窗] → 使用一次性确认标记绕过下一次 `close` 确认，并在关闭流程完成或取消后重置。
- [dock 重新打开后用户误解为恢复了原 Codex 会话] → specs 明确持久化恢复只恢复布局和 cwd，不恢复原进程、scrollback 或交互状态。
- [重复调用清理导致异常] → 使用现有 `disposeAllSessions()` 的空 Map 无操作特性，必要时在实现中保持 kill 异常不向生命周期事件冒泡。

## Migration Plan

无需数据迁移。已有持久化 tab 状态继续可读；修复后第一次关闭窗口会清理当时活跃 PTY，后续重新打开窗口按现有数据创建新的 session。

回滚策略：如果发现 macOS 关闭窗口清理行为不符合预期，可以回退 `window-all-closed` 中的清理位置变更，恢复为仅非 macOS 清理并退出。

## Open Questions

无。当前变更明确不做后台 PTY 保活或 reattach。
