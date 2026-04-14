## 1. 数据模型与序列化工具

- [x] 1.1 在 `src/utils/` 下新建 `tab-persistence.ts`，定义 `PersistedTabState` 接口（含 `version`、`workspaces`、`activeSessionId`、`sessionNameOverrides`、`sidebarCollapsed` 字段）
- [x] 1.2 实现 `saveTabState(state)` 函数，通过 IPC fire-and-forget 发送 JSON 到主进程写入 `<userData>/tab-state.json`
- [x] 1.3 实现 `loadTabState(): Promise<PersistedTabState | null>` 函数，通过 IPC 从主进程读取文件并校验结构完整性，失败时返回 `null`

## 2. 状态变更时自动保存

- [x] 2.1 在主进程注册 `tab-state:save`（fire-and-forget）、`tab-state:save-sync`（sendSync）、`tab-state:load`（invoke）IPC handler，在 preload 中暴露 `tabStateApi`
- [x] 2.2 在 `TerminalPanel.tsx` 中添加 `useEffect`，监听 `workspaces`、`activeSessionId`、`sessionNameOverrides`、`sidebarCollapsed` 状态变化，变化时调用 `saveTabState` 发送 IPC 写入文件
- [x] 2.3 添加 `beforeunload` 事件监听，使用 `saveTabStateSync`（IPC sendSync）保证窗口关闭前数据落盘

## 3. 启动时恢复状态

- [x] 3.1 修改 `TerminalPanel.tsx` 的初始化逻辑：在组件挂载时 `await loadTabState()`，若返回有效数据则进入恢复流程，否则执行当前默认行为（创建一个 workspace）
- [x] 3.2 实现恢复流程：遍历持久化的 workspace/session 树，为每个 session 调用 `window.terminalApi.create()` 在其保存的 cwd 下创建 PTY，构建 old ID → new ID 映射表
- [x] 3.3 处理 cwd 不存在的情况：创建 PTY 时若 cwd 无效，回退到用户 HOME 目录
- [x] 3.4 使用 ID 映射表恢复 `activeSessionId` 和 `sessionNameOverrides`，将映射后的状态设置到 React state
- [x] 3.5 恢复 workspace 展开/收起状态（`isExpanded`）和侧边栏收起/展开状态（`sidebarCollapsed`）

## 4. 错误处理与回退

- [x] 4.1 恢复过程中任何 PTY 创建失败的 session，跳过该 session 并继续恢复其余 session；若某 workspace 下所有 session 均失败则移除该 workspace
- [x] 4.2 恢复过程整体失败（如异常抛出）时，捕获异常并回退到默认行为（创建一个新 workspace）

## 5. 验证

- [x] 5.1 手动测试：创建多个 workspace 和 tab，关闭 app，重新打开，确认布局、活跃 tab、重命名、侧边栏状态均正确恢复
- [x] 5.2 手动测试：删除 `<userData>/tab-state.json` 文件，重新打开 app，确认回退到默认一个 workspace 行为
- [x] 5.3 手动测试：在 `tab-state.json` 中写入损坏的 JSON，重新打开 app，确认静默回退且无报错弹窗
