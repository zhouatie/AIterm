## Context

当前终端由主进程 PTY、按 session 路由的 output stream、renderer 中的 xterm.js 实例组成。xterm.js 负责实时交互和有限 scrollback；`TerminalPanel` 已有首尾快速滚动，但只能滚动到 xterm 当前保留缓冲区的顶部。agent 对话较长时，早期输出已经被 xterm 裁剪，继续依赖 scrollback 无法解决完整回溯问题。

已有 `terminal-content-persistence` 关注的是窗口关闭时保存有限终端缓冲区并恢复显示状态，不适合作为完整会话记录。新的 transcript 能力应作为独立数据流存在，保留完整输出记录，同时不改变 PTY 与 xterm 的实时行为。

## Goals / Non-Goals

**Goals:**

- 为每个 terminal session 持续追加保存完整 PTY 输出记录。
- 支持从当前 terminal session 打开只读 transcript 视图，查看 xterm scrollback 之外的早期内容。
- 支持 transcript 文本搜索、匹配跳转和导出。
- 支持应用重启后继续查看仍存在 terminal tab 的 transcript。
- 在关闭 terminal tab 后清理对应 transcript，避免孤立文件长期累积。
- 不影响实时终端输入输出、后台输出缓存、首尾滚动和 xterm scrollback 行为。

**Non-Goals:**

- 不把完整 transcript 回灌进 xterm，也不实现 xterm 无限滚动。
- 不解析 Codex/agent 协议，不做 user/assistant/tool 的结构化分段。
- 不记录用户 stdin 的额外副本，避免把不可见输入落盘。
- 不新增外部依赖。

## Decisions

### 决策 1：transcript 独立于 xterm scrollback

选择：保留当前 xterm 有限 scrollback 作为实时交互缓冲，新增独立 transcript 存储用于完整历史。

理由：xterm 的 scrollback 是渲染和交互缓冲，不适合作为长期历史数据库。强行扩大 scrollback 或实现无限滚动会把内存、渲染性能和完整历史语义耦合在一起；独立 transcript 可以按文件流式追加、搜索和导出，不影响终端交互。

替代方案：
- 只提高 `scrollback` 行数。成本低，但长会话仍会再次丢失早期内容，并增加 renderer 内存压力。
- 用虚拟列表替换 xterm 历史区域。复杂度高，容易破坏 TUI、选择复制和 xterm 内部状态。

### 决策 2：在主进程输出链路追加 transcript

选择：在主进程接收 PTY output 时按 session 追加写入 transcript，再继续走现有 output batching 和 renderer 转发。

理由：主进程已经看到所有 PTY 输出，包括当前未 attach 的后台 session。把追加写入放在主进程可以避免依赖 renderer 活跃状态，保证后台 agent 输出也能被记录。

替代方案：
- 在 `TerminalInstance` 写入 xterm 时记录。缺点是非活跃 session 会先进入主进程 pending output，renderer 侧无法及时记录后台输出。
- 在 shell 或 agent 层记录。缺点是侵入用户环境，且无法覆盖普通终端输出。

### 决策 3：canonical transcript 保存原始 PTY 输出，视图层提供文本化内容

选择：transcript 文件保存 PTY 输出的原始字符串数据；读取、搜索和导出文本时由主进程提供规范化文本视图，去除 ANSI/VT 控制序列并处理常见回车重写。

理由：原始输出最接近终端真实数据，后续如果需要更好的 ANSI 渲染或调试仍有依据。用户首版需要的是“找回被裁剪的文字内容”，因此 viewer 默认展示规范化纯文本。

替代方案：
- 只保存纯文本。实现简单，但会丢失颜色、清屏、光标控制等原始信息，后续很难补救。
- 同时保存 raw 与 plain sidecar。读取更快，但需要处理 chunk 边界和状态同步；首版可以先从 raw 派生文本视图，避免双写一致性问题。

### 决策 4：transcript 绑定 terminal tab 生命周期

选择：每个 terminal tab 拥有稳定 transcript 标识。应用重启恢复 tab 时，新 PTY session 继续关联该 transcript；关闭 terminal tab 时删除对应 transcript 文件。

理由：用户关心的是某个 tab 中 agent 对话的完整历史，而不是某个瞬时 PTY 进程 ID。用稳定 transcript 标识可以支持跨重启查看；关闭 tab 后清理则避免历史无限累积。

替代方案：
- transcript 直接使用 PTY session ID。实现少，但重启后 session ID 会变化，无法自然关联旧记录。
- 永久保留所有 transcript。便于审计，但会带来隐私和磁盘增长问题；当前需求不要求长期归档。

### 决策 5：不记录 stdin 额外副本

选择：transcript 只记录 PTY output，不在 `terminal:input` 链路单独保存用户输入。

理由：终端可能输入密码、token、私钥口令等不可见内容。额外记录 stdin 会扩大敏感信息落盘面。对于 agent 对话，用户可见输入通常会被 TUI/CLI 回显到输出流，已经能进入 transcript。

替代方案：
- 同时记录 stdin 和 stdout。会让 transcript 更完整，但隐私风险更高。

## Risks / Trade-offs

- [大文件读取卡顿] → transcript viewer 读取应由主进程提供异步接口，renderer 不直接同步读取大文件；搜索和导出走 IPC。
- [ANSI/VT 规范化不完美] → canonical raw 文件保留原始数据；首版 viewer 以找回文本为目标，后续可基于 raw 增强渲染。
- [后台 session 输出遗漏] → 记录点放在主进程 PTY output 入口，而不是 renderer attach 后。
- [磁盘增长] → transcript 随 terminal tab 删除而清理，并在启动时清理没有 tab 引用的孤立文件。
- [隐私落盘] → 不额外记录 stdin；transcript 作为本地 userData 数据，仅通过用户主动打开或导出访问。
