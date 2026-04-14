## ADDED Requirements

### Requirement: Codex hook 包装脚本链式调用

Codex hook 包装脚本 SHALL 在单次 hook 调用中同时执行现有 hook 命令和 AIterm 通知推送，保证两者互不阻塞。

#### Scenario: 同时执行 git-ai checkpoint 和 AIterm 通知

- **WHEN** Codex 触发 hook 且包装脚本被调用
- **THEN** 包装脚本 SHALL 将 stdin 中的 hook JSON input 同时转发给 git-ai checkpoint 和 aiterm-notify.mjs
- **THEN** 两个子进程 SHALL 并行执行

#### Scenario: git-ai 失败不影响 AIterm 通知

- **WHEN** 包装脚本调用 git-ai checkpoint 失败（二进制不存在、超时、异常退出）
- **THEN** 包装脚本 SHALL 仍然执行 aiterm-notify.mjs
- **THEN** 包装脚本 SHALL 正常退出，不阻塞 Codex

#### Scenario: AIterm 通知失败不影响 git-ai

- **WHEN** 包装脚本调用 aiterm-notify.mjs 失败（环境变量缺失、HTTP 连接失败）
- **THEN** 包装脚本 SHALL 仍然执行 git-ai checkpoint
- **THEN** 包装脚本 SHALL 正常退出，不阻塞 Codex

#### Scenario: 两者均失败时静默退出

- **WHEN** git-ai checkpoint 和 aiterm-notify.mjs 均执行失败
- **THEN** 包装脚本 SHALL 正常退出（exit 0）
- **THEN** 包装脚本 SHALL NOT 阻塞 Codex 正常流程

### Requirement: OpenCode 插件 AItem 直连推送

OpenCode 插件 SHALL 在检测到 AIterm 通知环境变量时，直接通过 HTTP POST 向 AIterm 通知入口发送 attention 事件，不依赖外部 shell 脚本。

#### Scenario: 检测到 AIterm 环境变量时直接推送

- **WHEN** OpenCode 插件事件触发且 `AITEM_NOTIFY_URL`、`AITEM_NOTIFY_TOKEN`、`AITEM_TERMINAL_SESSION_ID` 环境变量均存在
- **THEN** 插件 SHALL 使用 HTTP POST 将事件数据直接发送到 `AITEM_NOTIFY_URL`
- **THEN** 请求体 SHALL 包含 `id`（session id）、`token`、`agent`（值为 `opencode`）、`event`、`message`、`timestamp`

#### Scenario: AIterm 环境变量不存在时跳过

- **WHEN** OpenCode 插件事件触发但 AIterm 通知环境变量缺失
- **THEN** 插件 SHALL 跳过 AIterm 直连推送
- **THEN** 插件 SHALL 继续执行原有 hooks.sh 调用逻辑（如果存在）

#### Scenario: HTTP POST 失败时静默处理

- **WHEN** 插件向 AIterm 通知入口发送 POST 请求失败
- **THEN** 插件 SHALL 静默忽略该错误
- **THEN** 插件 SHALL NOT 阻塞 OpenCode 正常流程
