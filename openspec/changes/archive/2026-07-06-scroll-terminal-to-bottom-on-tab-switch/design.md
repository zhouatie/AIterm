## Context

当前 `TerminalPanel` 通过 `activeSessionId` 切换右侧可见的 `TerminalInstance`，每个 `TerminalInstance` 已保留自己的 xterm.js 实例，并暴露 `scrollToBottom()`。活跃态恢复时 `TerminalInstance` 会 attach 输出、fit terminal 并 focus，但没有显式把 viewport 拉到底部，因此用户从历史回看位置切换回来时仍停留在旧 viewport。

现有 `terminal-tabs` 规格中“切换时保留终端状态”包含“滚动位置”，这与本次需求相反，需要把滚动位置从“必须保留”调整为“切换后默认回到底部”。输出历史和运行进程仍然必须保留。

## Goals / Non-Goals

**Goals:**

- 任意入口切换到 terminal tab 后，当前 terminal viewport 自动滚动到普通 buffer 底部。
- 自动滚动发生在 terminal 重新可见、尺寸适配和 buffered output 写入之后，避免滚动到底部后又被 fit/write 改变位置。
- 自动滚动不向 PTY stdin 写入内容，不改变进程、输出历史、tab 结构或持久化数据。
- 保留当前活跃 tab 内用户手动滚动回看、首尾滚动控件和文本选择能力。

**Non-Goals:**

- 不增加用户配置项或兼容旧“切换后保留滚动位置”的开关。
- 不改变应用重启后的终端内容持久化行为。
- 不在 alternate screen/TUI 内注入按键或修改 TUI 状态。
- 不改变非活跃 session 的后台输出缓存策略。

## Decisions

### 1. 以 session 激活后的 `TerminalInstance` 为滚动执行点

滚动到底部应在目标 `TerminalInstance` 变为活跃后执行，而不是仅在点击 tab 的 handler 中执行。原因是切换入口不止一个：鼠标点击二级 tab、快捷键切换、通知/Agent Inbox 激活、Spec Dashboard 激活都会最终改变 `activeSessionId` 或调用统一激活流程。把行为绑定到活跃态恢复可以覆盖这些入口。

实现上可在 `TerminalInstance` 的 `isActive` effect 中，在 attach output、写入 bufferedData、`fitTerminal()` 和 focus 后调用 `terminal.scrollToBottom()`，再 emit scroll state。若父组件已有切换后滚动协调逻辑，也应复用同一 helper，避免多个入口重复实现。

### 2. 普通 buffer 下滚到底部，alternate screen 不做额外干预

xterm 在 alternate screen 中通常没有普通 scrollback 语义，TUI 应用自己控制画面。自动滚动应针对普通 buffer 的历史 viewport；如果当前 active buffer 不是 normal buffer，则不额外尝试改变 TUI 状态。这样保持“不向 PTY 写入、不干扰 TUI”的边界。

### 3. 切换后不再保留 viewport 位置，但仍保留会话状态

“终端状态”应拆开理解：

- 保留：输出历史、运行中进程、cwd、tab 结构、xterm 实例。
- 不保留：切换回来后的 viewport 查看位置，统一定位到底部。

这会改变既有行为，但符合用户当前主要工作流：切 tab 时通常要看最新输出。如果用户要看历史，仍可在当前 tab 内滚动回看或使用滚动到最上/最下控件。

## Risks / Trade-offs

- [Risk] 用户正在一个 tab 回看历史，切到别的 tab 再回来会丢失该 tab 的历史 viewport。Mitigation: 本次需求明确要求切换后看底部；保留历史内容和手动回看能力。
- [Risk] 滚动调用过早导致 buffered output 写入后仍不在底部。Mitigation: 在 bufferedData 写入回调和 fit 后执行 scrollToBottom。
- [Risk] 多入口激活 session 行为不一致。Mitigation: 将滚动放在 active TerminalInstance 生命周期或统一激活 helper，而不是只改点击 tab handler。
- [Risk] 自动滚动影响 scroll state 控件状态。Mitigation: 滚动后立即 emit/refresh scroll state，使“滚动到最下”控件禁用状态正确更新。
