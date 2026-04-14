## Context

AIterm 是一个基于 Electron + React + TypeScript 的终端工作台应用，使用 workspace → session 双层结构管理终端 tab。当前所有 tab 状态（`workspaces` 数组、`activeSessionId`、`sessionNameOverrides`、workspace 展开状态等）完全存储在 `TerminalPanel.tsx` 的 React `useState` 中，app 关闭即全部丢失。

现有持久化模式：应用统一使用 renderer 进程的 `localStorage` 存储 UI 偏好（主题、快捷键、分割面板比例等），无 SQLite/electron-store 等外部存储依赖。

PTY 进程（node-pty）本质上不可序列化，但每个 session 的工作目录（cwd）可以被记录，恢复时在相同 cwd 下重新 spawn 即可获得等价的终端环境。

## Goals / Non-Goals

**Goals:**

- 应用退出时自动保存完整的 workspace/session 树结构和关键 UI 状态
- 应用重启时自动恢复 tab 布局，并在对应 cwd 下重建 PTY 会话
- 恢复失败时静默回退到默认行为（创建一个新 workspace），不阻塞启动
- 复用现有 localStorage 模式，不引入新的存储依赖

**Non-Goals:**

- 不恢复终端输出历史（scrollback buffer）—— PTY 进程无法序列化，恢复后终端为空白起始状态
- 不恢复运行中的进程状态（如 vim、top 等长期运行的进程）
- 不做跨设备同步
- 不持久化 attention 状态（临时通知，无需跨会话保留）

## Decisions

### 决策 1：使用主进程文件存储作为存储后端

**选择**: 主进程 JSON 文件（`<userData>/tab-state.json`），通过 IPC 通道读写

**理由**:
- Electron renderer 的 localStorage 底层由 Chromium LevelDB 异步刷盘，进程退出时数据可能未落盘
- 主进程 `fs.writeFileSync` 是真正的同步磁盘写入，100% 可靠
- 不引入额外 npm 依赖，仅使用 Node.js 内置 `fs` 模块
- workspace/session 元数据体积极小（几十个 tab 也不超过几 KB）

**备选方案**:
- localStorage（renderer 进程）：Chromium LevelDB 刷盘时机不可控，开发模式下实测数据丢失
- electron-store：功能等价但引入额外依赖，对此场景过度设计

### 决策 2：持久化数据结构

**选择**: 序列化整个 workspace 树为单一 JSON 对象，存储在 `<userData>/tab-state.json`

```typescript
interface PersistedTabState {
  version: 1;
  workspaces: Array<{
    id: string;
    name: string;
    currentPath: string | null;
    isExpanded: boolean;
    sessions: Array<{
      id: string;         // 仅用于关联 nameOverrides，恢复时生成新 ID
      cwd: string;
    }>;
  }>;
  activeSessionId: string;          // 恢复时映射到新 session ID
  sessionNameOverrides: Record<string, string>;
  sidebarCollapsed: boolean;
}
```

**理由**:
- 单 key 原子写入，避免多 key 之间的不一致
- `version` 字段为未来 schema 迁移预留空间

### 决策 3：保存时机

**选择**: 每次 tab 状态变更时通过 IPC fire-and-forget 写入主进程文件，窗口关闭前通过 IPC sendSync 同步保底

触发保存的状态变更包括：
- workspace 创建/关闭
- session 创建/关闭/切换
- workspace 展开/收起
- session 重命名
- 侧边栏收起/展开

**理由**:
- 主进程 `fs.writeFileSync` 是真正同步写入，几 KB 数据写入耗时可忽略
- 每次状态变更时 fire-and-forget 发送 IPC，主进程即时写入文件
- 窗口关闭前 `beforeunload` 事件中使用 `sendSync` 阻塞式保存，确保最后状态落盘
- 闪退/crash 场景下，最近一次 fire-and-forget 已写入文件，数据几乎不会丢失

**备选方案**:
- 仅在 `beforeunload` 时保存：实现简单，但闪退时丢失全部 tab 状态，不可接受
- debounce 500ms 合并写入：增加复杂度且引入丢失窗口，文件写入本身极快无需合并

### 决策 4：恢复流程

**选择**: TerminalPanel 初始化时读取持久化数据，替代当前的默认 workspace 创建逻辑

恢复步骤：
1. 通过 IPC 从主进程读取 `tab-state.json` 并解析 JSON
2. 校验 `version` 字段和基本结构完整性
3. 为每个 persisted session 调用 `window.terminalApi.create()` 在对应 cwd 下创建新的 PTY
4. 建立 old session ID → new session ID 的映射，用于恢复 `activeSessionId` 和 `sessionNameOverrides`
5. 构建完整的 `workspaces` 状态并设置到 React state

**理由**:
- PTY 进程需要重新创建（不可序列化），因此恢复时 session ID 会变化
- ID 映射确保 `activeSessionId` 和 `sessionNameOverrides` 正确关联到新 session

### 决策 5：错误处理策略

**选择**: 静默回退 —— 任何解析/恢复错误都回退到创建默认 workspace

**理由**:
- tab 持久化是便利性功能，不应阻塞应用启动
- 用户不需要看到技术性错误信息，丢失 tab 布局的代价可接受
- 在 console 中打印 warning 即可，便于开发调试

## Risks / Trade-offs

- **[Risk] 应用闪退（renderer 进程 crash）** → 每次状态变更都触发主进程文件写入，闪退时最多丢失最后一次 IPC 还在传输中的变更
- **[Risk] 文件被删除或损坏** → 静默回退到默认状态，无负面影响
- **[Risk] PTY 创建失败（目录已删除）** → 对于 cwd 无效的 session，回退到用户 HOME 目录创建 PTY，保留 workspace 结构
- **[Trade-off] 不恢复终端输出历史** → 简化实现，避免存储大量 scrollback 数据；用户重新打开后看到干净终端，语义上也合理（类似重启终端）
