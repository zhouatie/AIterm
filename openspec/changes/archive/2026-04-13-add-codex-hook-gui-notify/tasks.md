## 1. 主进程通知入口

- [x] 1.1 新增 terminal attention 事件类型，包含 session id、agent、event、message、timestamp 等字段
- [x] 1.2 在 Electron 主进程启动仅绑定 `127.0.0.1` 的本地通知入口
- [x] 1.3 为通知入口生成运行期随机 token，并拒绝 token 缺失或不匹配的请求
- [x] 1.4 校验请求中的 terminal session id 必须属于当前存在的 PTY 会话
- [x] 1.5 合法事件到达时发送 Electron 原生系统通知
- [x] 1.6 合法事件到达时通过 IPC 向渲染进程发送 `terminal:attention` 事件

## 2. PTY 环境变量注入

- [x] 2.1 在 PTY session 创建流程中注入 `AITEM_TERMINAL_SESSION_ID`
- [x] 2.2 在 PTY session 创建流程中注入 `AITEM_NOTIFY_URL`
- [x] 2.3 在 PTY session 创建流程中注入 `AITEM_NOTIFY_TOKEN`
- [x] 2.4 确保 session dispose 或 exit 后清理主进程中的 attention 状态

## 3. Agent hook / plugin 推送

- [x] 3.1 新增通用 agent notify 脚本，从环境变量读取 GUI 通知入口、token 和 terminal session id
- [x] 3.2 notify 脚本支持从 stdin 或命令参数接收 agent、event 和 message，并发送统一 terminal attention payload
- [x] 3.3 notify 脚本在环境变量缺失或请求失败时正常退出，不阻塞调用它的 agent
- [x] 3.4 新增 repo-local `.codex/hooks.json`，配置 Codex `Stop` hook 调用 notify 脚本
- [x] 3.5 新增 Claude Code hook 配置示例或项目配置，配置 `Notification` hook 的 `permission_prompt` 与 `idle_prompt` 调用 notify 脚本
- [x] 3.6 新增 OpenCode plugin，监听 `permission.asked` 与 `session.idle` 并调用 GUI 通知入口
- [x] 3.7 在项目文档或 hook 脚本注释中说明 Codex 需要启用 `codex_hooks` feature flag

## 4. 渲染进程与 tab 状态

- [x] 4.1 在 preload 的 `terminalApi` 中新增 `onAttention(callback)` 监听接口
- [x] 4.2 在全局类型中补充 terminal attention 事件类型
- [x] 4.3 在 `TerminalPanel` 中维护 `attentionBySessionId` 状态
- [x] 4.4 收到 `terminal:attention` 后在对应二级 terminal tab 上显示需要处理标记
- [x] 4.5 用户选择带有 attention 状态的 tab 后清除该 session 状态
- [x] 4.6 用户向带有 attention 状态的 session 输入内容后清除该 session 状态
- [x] 4.7 session 关闭或退出后清除该 session 状态

## 5. 验证

- [ ] 5.1 手动启动 GUI 终端并确认新 PTY 中存在 `AITEM_TERMINAL_SESSION_ID`、`AITEM_NOTIFY_URL`、`AITEM_NOTIFY_TOKEN`
- [ ] 5.2 手动调用 notify 脚本模拟 Codex `Stop` hook，确认系统通知出现且对应 terminal tab 显示需要处理标记
- [ ] 5.3 手动调用 notify 脚本模拟 Claude Code `Notification:permission_prompt`，确认系统通知出现且对应 terminal tab 显示需要处理标记
- [ ] 5.4 手动调用 OpenCode plugin 或等效请求模拟 `permission.asked`，确认系统通知出现且对应 terminal tab 显示需要处理标记
- [ ] 5.5 手动切换到带标记的 tab，确认标记被清除
- [ ] 5.6 手动向带标记的 terminal 输入内容，确认标记被清除
- [ ] 5.7 手动发送非法 token 或未知 session id 请求，确认不会触发系统通知或 tab 标记
