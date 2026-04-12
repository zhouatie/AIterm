## Why

文件树刷新按钮点击后无明显反应。当前实现使用 `setRootPath('') → queueMicrotask → setRootPath(cwd)` 的 hack 方式来强制 re-render，这种方式依赖 React 的批处理时序，行为不稳定——用户点击刷新按钮后文件树可能完全不更新，必须退出终端再重新进入才能看到最新目录内容。

## What Changes

- 移除 `handleRefresh` 中 `setRootPath('')` + `queueMicrotask` 的 hack 逻辑
- 引入独立的 `refreshKey` 状态计数器，通过递增触发文件树重新扫描
- FileTree 组件的加载 `useEffect` 增加 `refreshKey` 依赖，确保同一路径下也能可靠地重新扫描
- 为扫描 Promise 添加 `.catch()` 错误处理，防止扫描失败时 loading 状态永久卡住

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `file-preview`: 修改"文件树手动刷新"需求的实现机制，从依赖路径清空/恢复的 hack 改为基于 refreshKey 的可靠刷新方式

## Impact

- **受影响代码**：`src/components/FilePreviewPanel.tsx`（handleRefresh 函数）、`src/components/FileTree.tsx`（加载 useEffect）
- **API 变更**：FileTree 组件新增 `refreshKey` prop
- **依赖**：无新增依赖
- **向后兼容**：完全兼容，仅内部实现变更
