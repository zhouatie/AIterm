## 1. Spec 卡片点击行为

- [x] 1.1 在 `TerminalPanel` 中调整 Spec change 卡片主区域点击 handler，保留目标 session 解析和 `handleSelectSession` 调用。
- [x] 1.2 移除卡片主区域点击后自动 `setSidebarMode('terminal')` 的行为，使侧边栏保持 `Spec` 模式。
- [x] 1.3 移除或跳过仅服务于 `Terminal` 模式节点可视化的 session 节点滚动逻辑，保留右侧 terminal focus。

## 2. 入口语义保持

- [x] 2.1 确认切换到 `Spec` 模式本身不自动定位第一个 Spec 对应 terminal。
- [x] 2.2 确认 artifact pill 点击仍只打开文件预览，不切换 terminal、不执行命令。
- [x] 2.3 确认“下一步”入口仍向 change 所属项目关联的目标 terminal 写入 payload，不强制切换侧边栏模式。
- [x] 2.4 更新 Spec change 卡片 tooltip 或轻量反馈文案，表达“切换右侧 terminal”而不是“切回 Terminal”。

## 3. 验证

- [x] 3.1 手工验证在 `Spec` 模式连续点击多个 Spec change 卡片时，左侧保持 `Spec` 模式，右侧 terminal 按目标项目切换。
- [x] 3.2 手工验证目标 session 不存在时仍显示轻量错误反馈，且不会创建新的 terminal session。

## 4. Spec change 与 terminal 绑定

- [x] 4.1 在 `TerminalPanel` 中新增运行期 Spec change 到 terminal session 的绑定状态，绑定键包含 `rootPath`、`workflow` 和 `changeName`。
- [x] 4.2 更新 Spec project/session 目标解析逻辑，优先使用仍存在的绑定 session。
- [x] 4.3 在未绑定时识别同项目下唯一 Codex/Claude Code/OpenCode agent 候选 session，并自动绑定。
- [x] 4.4 在无法唯一判断目标 session 时展示轻量 terminal 选择器，让用户手动选择并保存绑定。
- [x] 4.5 让 Spec 卡片点击和“下一步”入口都复用绑定解析逻辑，避免同目录多个 terminal 时发送或定位到错误 session。
- [x] 4.6 处理绑定 session 被关闭的情况：清理失效绑定并提示用户重新选择，不自动创建 terminal session。
- [x] 4.7 在 Spec change 卡片上新增目标 terminal 入口，允许用户重新打开选择器并覆盖已绑定 session，且不触发卡片主区域点击。
- [x] 4.8 在 Terminal 侧边栏 `Spec` 模式过滤 change 卡片，只展示存在 `specs/**/*.md` 的 change；过滤后无卡片时隐藏对应项目分组。

## 5. 快捷键导航

- [x] 5.1 在快捷键系统中新增 `Terminal / Spec` 模式切换动作，默认绑定为 `Command + D`，并出现在设置面板可配置动作中。
- [x] 5.2 在 `TerminalPanel` 注册 `Terminal / Spec` 模式切换动作，使快捷键只切换侧边栏模式，不自动定位 Spec 卡片或创建 terminal。
- [x] 5.3 构建当前 `Spec` 模式下可见 change 卡片的稳定顺序，只包含已通过 specs artifact 过滤并实际展示的卡片。
- [x] 5.4 当 Terminal 侧边栏展开且处于 `Spec` 模式时，让“上一个/下一个 Terminal Tab”快捷键按可见 Spec 卡片顺序循环切换，并复用卡片主区域的 terminal 定位逻辑。
- [x] 5.5 确认其他状态下“上一个/下一个 Terminal Tab”快捷键仍保持原有 terminal session 切换行为。
