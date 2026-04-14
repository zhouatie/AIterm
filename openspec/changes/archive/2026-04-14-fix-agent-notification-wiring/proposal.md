## Why

AIterm 的通知管线（HTTP 服务、环境变量注入、UI 红点/系统通知）已完整实现，但 Codex 和 OpenCode 的 hook/plugin 从未正确接入该管线，导致 agent 完成任务后 GUI 没有任何推送。

- **Codex**：`~/.codex/config.toml` 的 `notify` 指向 `git-ai checkpoint`，不是 `aiterm-notify.mjs`。
- **OpenCode**：`cmux-notify.ts` 插件调用的 `hooks.sh` 文件不存在，且使用的是 cmux 协议（`OPENCODE_NOTIFY_EVENT`），不是 AIterm 的 HTTP POST 协议。

## What Changes

- 新增 Codex 包装 hook 脚本（`scripts/codex-hook-wrapper.mjs`），同时执行 `git-ai checkpoint` 和 `aiterm-notify.mjs`，保留原有 checkpoint 功能的同时接入 AIterm 通知。
- 改写 OpenCode 插件的通知逻辑，在检测到 `AITEM_NOTIFY_URL` 环境变量时，直接 POST 到 AIterm HTTP 服务端，不再依赖缺失的 `hooks.sh`。
- 提供安装/配置说明，指导用户更新 `~/.codex/config.toml` 和 OpenCode 插件配置。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `agent-attention-notifications`：Codex hook 和 OpenCode plugin 的实际接入逻辑变更——Codex 通过包装脚本链式调用，OpenCode 通过插件内直接 HTTP POST。

## Impact

- **新增文件**：`scripts/codex-hook-wrapper.mjs`
- **修改文件**：OpenCode 插件（`~/.config/opencode/plugin/cmux-notify.ts` 及其 lib）
- **外部配置变更**：`~/.codex/config.toml` 的 `notify` 字段需指向新的包装脚本
- **无 breaking change**：AIterm 侧的 HTTP 服务、环境变量注入、UI 渲染逻辑均不变
