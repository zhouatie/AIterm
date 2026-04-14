## 1. 回滚 wrapper 方案

- [x] 1.1 还原 `~/.codex/config.toml` 的 `notify` 回 `git-ai checkpoint`
- [x] 1.2 还原 `~/.config/opencode/plugin/cmux-notify.ts` 为原始版本
- [x] 1.3 删除 `scripts/codex-hook-wrapper.mjs`

## 2. Repo-local agent hook 配置

- [x] 2.1 创建 `.codex/hooks.json`：配置 `Stop` hook 调用 `node scripts/aiterm-notify.mjs`（与全局 `notify` 的 git-ai checkpoint 完全独立，两者同时运行互不干扰）
- [x] 2.2 创建 `.opencode/plugin/aiterm-notify.ts`：项目级 OpenCode 插件，监听 `permission.ask` 和 `session.status` 事件，检测 `AITEM_NOTIFY_URL` 环境变量后直接 HTTP POST 到 AIterm

## 3. 验证

- [x] 3.1 在 AIterm 终端中运行 Codex 完成任务，确认收到系统通知 + tab 红点，同时 git-ai checkpoint 正常运行
- [x] 3.2 在 AIterm 终端中运行 OpenCode，触发 permission 或完成事件，确认收到通知
