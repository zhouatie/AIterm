## 1. 关闭确认

- [x] 1.1 在 `src/main.ts` 的主窗口 `close` 事件中识别当前是否存在活跃 PTY 会话
- [x] 1.2 当关闭 GUI 会终止活跃 PTY 时，展示 Electron 原生二次确认对话框
- [x] 1.3 用户取消确认时阻止窗口关闭，并保持所有 PTY 会话继续运行
- [x] 1.4 用户确认关闭时允许继续关闭流程，并避免同一次关闭流程重复弹出确认

## 2. 生命周期清理

- [x] 2.1 调整 `src/main.ts` 的 `window-all-closed` 处理：在平台判断前清理全部 PTY 会话
- [x] 2.2 保持非 macOS 平台关闭所有窗口后继续 `app.quit()`，macOS 只清理 PTY 但不退出应用
- [x] 2.3 确认应用退出兜底清理再次调用 `disposeAllSessions()` 时为空操作，不产生未处理异常

## 3. 恢复语义对齐

- [x] 3.1 检查 `TerminalPanel` 持久化恢复流程，确认关闭窗口后重新打开只创建新 PTY，不依赖旧 session 存活
- [x] 3.2 如实现中存在对旧 session id 的运行态假设，调整为只用于布局恢复和名称映射
- [x] 3.3 保持 workspace、session 数量、cwd、展开状态、侧边栏状态、手动重命名和活跃位置的恢复行为不变

## 4. 验证

- [x] 4.1 验证关闭 GUI 且存在活跃 PTY 时会展示二次确认
- [x] 4.2 验证取消关闭后窗口保持打开，PTY 仍继续运行且 session registry 不变
- [x] 4.3 验证确认关闭后 macOS 主进程中没有残留 PTY session
- [x] 4.4 验证关闭窗口后点击 dock 重新打开，只创建一组新的 PTY，会话数量不重复增长
- [x] 4.5 验证非 macOS 生命周期分支仍保持确认后清理 PTY 并退出
- [x] 4.6 验证主动关闭二级 terminal tab 和关闭 workspace 的现有销毁行为不回归
- [x] 4.7 验证应用退出时重复清理 PTY 不报错
