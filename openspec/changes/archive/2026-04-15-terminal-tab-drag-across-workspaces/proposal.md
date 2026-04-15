## Why

当前 terminal 侧边栏只能通过新建、关闭和点击切换来管理 tab，无法直接调整 tab 顺序，也无法把一个 terminal 从当前 workspace 移动到另一个 workspace。随着 workspace 和 session 数量增加，用户需要频繁关闭后重建 tab，才能整理分组，操作成本高且会打断正在运行的 PTY 会话。

## What Changes

- 为 terminal 二级 tab 增加拖动排序能力，允许用户在同一个 workspace 内调整 session 顺序。
- 为 terminal 二级 tab 增加跨 workspace 拖动能力，允许用户把 session 移动到其他已有 workspace。
- 在拖动过程中提供明确的放置反馈，并在放置后保持 session 对应 PTY 会话继续存活，不因移动而重建。
- 更新 terminal tab 规范，补充排序、跨 workspace 移动、激活态保持和空 workspace 清理规则。

## Capabilities

### New Capabilities

_无新增能力。_

### Modified Capabilities

- `terminal-tabs`: terminal 二级 tab 需要支持拖动排序，并支持拖动到其他 workspace，且移动后保持会话可用与结构一致。

## Impact

- **代码**: `src/components/TerminalPanel.tsx` 中 workspace/session 列表渲染、拖放交互、session 重排与跨 workspace 移动逻辑。
- **状态**: `workspaces`、`activeSessionId` 以及相关滚动/展开状态需要在拖放后保持一致。
- **行为**: 移动 terminal tab 时不能销毁或重建 PTY，只能调整 session 所属 workspace 与列表顺序。
- **规格**: 需要修改 `openspec/specs/terminal-tabs/spec.md`，补充拖放排序与跨 workspace 移动的行为要求。
