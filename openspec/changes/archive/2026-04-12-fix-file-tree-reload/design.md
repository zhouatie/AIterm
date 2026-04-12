## Context

当前项目是一个基于 Electron 的终端工作台应用，左侧面板包含文件树浏览器，与终端当前工作目录保持同步。

文件树刷新按钮的当前实现（`FilePreviewPanel.tsx` 第 86-106 行）使用了一个 hack：当 CWD 未变化时，先将 `rootPath` 设为空字符串，再通过 `queueMicrotask` 恢复原值以强制 React re-render。这种做法存在严重问题：

1. `setRootPath('')` 会触发 `FileTree` 的 `useEffect`，但该 effect 在 `!rootPath` 时直接 return，不会设置 loading 状态
2. `queueMicrotask` 的执行时序与 React 批处理机制不可靠，可能导致两次 setState 被合并而不产生实际的 re-render
3. 中间的空路径状态会导致 UI 闪烁（显示"等待终端..."占位符）

用户反馈：点击刷新按钮无反应，必须退出终端再进入才能看到更新后的目录内容。

## Goals / Non-Goals

**Goals:**
- 使刷新按钮可靠地触发文件树重新扫描，即使当前工作目录未变化
- 刷新过程中显示 loading 状态，给用户明确反馈
- 扫描失败时正确处理错误，避免永久 loading

**Non-Goals:**
- 不在本次变更中保留目录展开状态（这是独立的增强功能）
- 不修改 CWD 自动同步机制（该机制工作正常）
- 不修改后端扫描逻辑（fd / Node.js fallback）

## Decisions

### 决策 1：使用 refreshKey 计数器替代路径清空 hack

**选择**：在 `FilePreviewPanel` 中引入 `refreshKey` 数值状态，每次点击刷新按钮时递增。将 `refreshKey` 作为 prop 传递给 `FileTree`，并作为加载 `useEffect` 的依赖项。

**理由**：
- 计数器递增保证每次都产生新值，React 一定会触发 re-render
- 不需要中间的空路径状态，避免 UI 闪烁
- 实现简单、可预测、无时序依赖

**备选方案**：
- 方案 B：在 FileTree 内部暴露命令式 `refresh()` 方法（通过 `useImperativeHandle`）→ 过度复杂，打破声明式模式
- 方案 C：使用 React key 属性强制卸载/重新挂载 FileTree → 会丢失所有内部状态，开销大

### 决策 2：refreshKey 由父组件管理而非 FileTree 内部

**选择**：`refreshKey` 在 `FilePreviewPanel` 中维护，通过 prop 传入 `FileTree`。

**理由**：
- 刷新操作需要先获取最新的 CWD（异步 IPC 调用），这个逻辑属于 `FilePreviewPanel`
- `FileTree` 作为纯展示组件，不应关心刷新的触发来源
- 保持 props 单向数据流

### 决策 3：扫描 Promise 添加 catch 处理

**选择**：在 `FileTree` 的加载 `useEffect` 中为 `scanFn` 添加 `.catch()` 处理。

**理由**：当前代码缺少错误处理，如果 IPC 调用失败（目录被删除、权限变更等），`loading` 状态会永久保持为 `true`，用户看到无限 spinner 且无法恢复。

## Risks / Trade-offs

- **[风险] refreshKey 值溢出** → JavaScript 的 Number.MAX_SAFE_INTEGER 为 2^53-1，实际不会溢出。若极端场景可用模运算，但没有必要。
- **[权衡] 刷新时目录折叠状态丢失** → 这是当前已有的行为（rootPath 变化时 `setAllExpanded(false)`），本次不修改。后续可作为独立增强。
- **[风险] 刷新时获取 CWD 失败** → 现有的 `try/catch` 已覆盖此情况，保持静默忽略即可。
