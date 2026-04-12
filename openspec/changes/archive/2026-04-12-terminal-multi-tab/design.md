## Context

当前终端面板（`TerminalPanel.tsx`）是一个单实例组件，启动时创建一个 PTY 会话并绑定一个 xterm.js 实例。底层的 `pty-manager.ts` 已经基于 `Map<string, PtySession>` 支持多会话管理，`preload.ts` 暴露的 API 也按 session ID 隔离——这意味着后端无需任何修改，多 Tab 支持完全是渲染进程侧的改造。

面板系统（`PanelManager.tsx`）管理的是"功能面板"级别的切换（终端面板、Chat 面板等），不负责面板内部的 Tab 管理。终端多 Tab 是终端面板内部的职责。

## Goals / Non-Goals

**Goals:**
- 终端面板内支持打开多个 Tab，每个 Tab 对应一个独立的终端会话
- Tab 栏支持点击切换、新建（`+`）、关闭（`×`）操作
- 切换 Tab 时完整保留所有终端的状态（历史输出、滚动位置、运行中的进程）
- 关闭最后一个 Tab 时自动创建新终端，保证面板始终可用
- Tab 栏样式与白色主题一致

**Non-Goals:**
- 不做 Tab 拖拽排序
- 不做 Tab 拖拽拆分为独立窗口
- 不做终端面板内的分屏（split pane）
- 不做 Tab 右键菜单
- 不做 Tab 持久化（重启应用后恢复上次的 Tab 列表）

## Decisions

### 决策 1：Tab 状态管理方式

**选择**：在 `TerminalPanel` 内用 React state 管理 Tab 列表和活跃 Tab，不引入全局 store。

**理由**：Tab 状态是终端面板的内部关注点，不需要被其他面板或全局访问。用组件本地 state 最简单，且与现有 PanelManager 的设计哲学一致（每个面板管理自己的内部状态）。

**替代方案**：引入 Zustand/Jotai 全局 store。对于当前规模来说过度设计，且引入不必要的依赖。

### 决策 2：多终端实例的 DOM 保留策略

**选择**：所有终端实例始终挂载在 DOM 中，非活跃的通过 `visibility: hidden` + `position: absolute` 隐藏。

**理由**：xterm.js 实例在卸载后无法恢复状态（滚动位置、已渲染内容等）。这与 `PanelManager` 中保留面板状态的策略完全一致。用 `visibility: hidden` 而非 `display: none` 是因为后者会导致 xterm.js 失去尺寸信息。

**替代方案**：切换时卸载/重建 xterm.js 实例。会丢失终端状态，用户体验差。

### 决策 3：组件拆分方式

**选择**：将当前 `TerminalPanel.tsx` 拆分为三个组件：
- `TerminalPanel`：Tab 容器，管理 Tab 列表和切换逻辑
- `TerminalTabBar`：Tab 栏 UI（Tab 列表 + 新建按钮）
- `TerminalInstance`：单个终端实例（原 TerminalPanel 的核心逻辑，xterm.js + PTY 绑定）

**理由**：职责分离。Tab 栏是纯 UI 组件，终端实例是带副作用的重逻辑组件，拆分后各自可独立测试和维护。

### 决策 4：Tab 标识与命名

**选择**：Tab 显示名为 `Terminal N`（N 为全局递增编号），内部使用 PTY session ID 作为唯一标识。

**理由**：session ID 由 `pty-manager` 使用 UUID 生成，天然唯一。递增编号对用户友好，且实现简单。

## Risks / Trade-offs

- **内存占用**：每个 Tab 保留一个 xterm.js 实例和一个 PTY 进程在内存中。→ 缓解：当前阶段用户不太可能开超过 10 个 Tab，内存影响可控。后续可考虑空闲 Tab 的 PTY 进程挂起。
- **FitAddon 尺寸同步**：隐藏的终端实例在 Tab 切换为活跃时可能需要重新 fit。→ 缓解：在 Tab 切换时对新激活的终端调用 `fitAddon.fit()`。
- **Tab 栏挤占终端高度**：Tab 栏占据部分垂直空间。→ 缓解：Tab 栏高度固定为 36px，使用 `calc(100% - 36px)` 分配终端区域，影响极小。
