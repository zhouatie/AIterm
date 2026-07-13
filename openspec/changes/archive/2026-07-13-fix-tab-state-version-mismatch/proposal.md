## Why

Tab 状态保存端当前写入 `version: 1`，读取端却只接受 `version: 2`，导致每次重新进入 AItem 时持久化文件都被判为无效，原有 workspace 与 terminal tab 无法还原。该回归会使现有的 Tab 状态持久化能力完全失效，需要恢复保存与读取之间的 schema 版本一致性。

## What Changes

- 让 Tab 状态快照的写入版本与读取端当前 schema 版本保持一致。
- 将 schema 版本定义收敛为单一来源，避免保存端和校验端再次各自硬编码并发生漂移。
- 为当前版本状态的保存、读取和版本不匹配拒绝行为增加自动化覆盖。
- 不增加旧 schema 的迁移或兼容读取逻辑；非当前版本数据继续按无效状态处理。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `terminal-tabs`: 明确持久化快照必须写入读取端认可的当前 schema 版本，并在重新启动时恢复当前版本的 workspace/session 树与活跃 Tab。

## Impact

- 影响 renderer 侧 Tab 状态构建与校验逻辑，主要涉及 `src/components/TerminalPanel.tsx` 和 `src/utils/tab-persistence.ts`。
- 影响 `terminal-tabs` capability 的 Tab 状态持久化与恢复契约。
- 不改变 IPC 通道、主进程存储路径、依赖项或用户界面。
