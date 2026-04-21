## Why

当前系统通知点击链路虽然会把应用窗口拉回前台，但在部分 UI 状态下，终端区域并不会真正显示触发通知的 terminal session，导致用户点击通知后仍需手动切回 terminal 视图或重新定位对应 tab。这个行为与现有通知能力的预期不一致，已经形成实际回归，需要补足明确约束并修复实现。

## What Changes

- 修正“点击系统通知”后的激活语义，要求不仅切换目标 terminal session，还要保证对应 terminal 内容在界面上可见。
- 将通知点击激活链路收敛为单独的 UI 恢复流程，避免仅更新 session 状态而遗漏 terminal 视图同步。
- 为缺失 session、侧边栏收起、当前停留在其他面板等场景补充明确行为约束，防止未来再次回归。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `agent-attention-notifications`: 收紧点击系统通知后的激活要求，明确目标 terminal session 对应内容必须真正显示在 terminal 面板中。

## Impact

- 影响主进程通知点击后的 renderer 激活指令语义。
- 影响 `src/components/TerminalPanel.tsx` 的通知点击处理路径，以及可能涉及的面板激活逻辑。
- 影响 `openspec/specs/agent-attention-notifications/spec.md` 对通知点击行为的定义。
