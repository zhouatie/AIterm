## Context

当前 terminal 由 `TerminalInstance` 封装 xterm.js 实例，并通过 `TerminalInstanceHandle` 向 `TerminalPanel` 暴露搜索、序列化、buffer 读取等能力。`TerminalPanel` 持有所有 session 对应的 handle，并知道当前 `activeSessionId`，因此它是放置“当前激活 terminal 首尾滚动”入口和调用目标的自然位置。

xterm.js 已提供 `scrollToTop()`、`scrollToBottom()`、`onScroll`、`buffer.active.viewportY`、`buffer.active.baseY` 和 `buffer.active.type` 等 API。该能力可以完全在渲染进程内完成，不需要改 PTY、IPC 或主进程。

## Goals / Non-Goals

**Goals:**

- 为当前激活 terminal session 提供滚动到最上与滚动到最下能力。
- 通过显性悬浮控件和 terminal-local 快捷键提供可发现、低打扰的交互。
- 基于当前 buffer 状态禁用或隐藏无意义入口，例如无 scrollback、已经到达目标位置、处于 alternate screen。
- 触发滚动后保持或恢复 terminal 输入焦点。

**Non-Goals:**

- 不修改 PTY 输出、scrollback 行数、内容持久化策略或 session 生命周期。
- 不新增全局快捷键设置项，也不扩展快捷键系统支持更多按键类型。
- 不在全屏 TUI alternate screen 内模拟应用级滚动。
- 不改变现有滚轮、滚动条、搜索和文本选择行为。

## Decisions

### 决策 1：使用 xterm.js 原生滚动 API

**选择**: 在 `TerminalInstanceHandle` 上新增滚动与状态读取方法，由内部 xterm 实例调用 `scrollToTop()` / `scrollToBottom()`。

**理由**: xterm.js 已维护 viewport、buffer、scrollback 和渲染刷新逻辑。直接调用原生 API 可以避免手动操作 `.xterm-viewport.scrollTop` 带来的状态不同步风险。

**备选方案**:

- 直接操作 DOM 滚动容器。缺点是绕过 xterm 内部状态，可能在 renderer、行高或后续 xterm 升级中失效。
- 通过 PTY 或 shell 控制序列实现。该问题是 UI viewport 导航，不应影响 shell 或进程状态。

### 决策 2：由 TerminalPanel 渲染 active session 的悬浮控件

**选择**: 在 terminal 内容区右侧或右上侧渲染一组轻量 icon-only 控件，调用当前 `activeSessionId` 对应的 `TerminalInstanceHandle`。

**理由**: `TerminalPanel` 已负责 active session、搜索浮层和 session handle 管理。控件放在 terminal 内容区可以与左侧 tab 导航解耦，避免把 session 管理和 buffer 导航混在一起。

**备选方案**:

- 放入左侧 terminal tab 栏。缺点是入口和作用对象不够直观，尤其侧边栏收起时不可用。
- 放入每个 `TerminalInstance` 内部。缺点是每个实例都要渲染控件，并且需要额外处理 active/inactive visibility。

### 决策 3：使用 terminal-local 快捷键，而非全局快捷键设置

**选择**: 在 terminal 聚焦且处于普通 buffer 时支持 `Command + ArrowUp` 和 `Command + ArrowDown` 分别滚动到最上与最下。该处理与现有 terminal 搜索的聚焦判断类似，只在 terminal 场景消费按键。

**理由**: 当前全局快捷键系统主要覆盖面板、tab 和文件预览动作，且按键规范尚未覆盖方向键。把该能力做成 terminal-local 行为，可以保持 scope 小，同时避免扩大全局快捷键校验和设置页。

**备选方案**:

- 新增全局可配置快捷键。优点是更可定制，缺点是需要扩展快捷键解析、设置页和冲突规则，超出本次 terminal 视口导航的必要范围。
- 仅提供按钮不提供快捷键。缺点是长输出导航仍不够高效。

### 决策 4：alternate screen 中隐藏并不消费首尾滚动

**选择**: 当 xterm active buffer 类型为 `alternate` 时，悬浮控件不展示，terminal-local 快捷键不执行首尾滚动。

**理由**: vim、less、htop 等全屏 TUI 通常拥有自己的滚动、翻页和光标语义。应用层首尾滚动在 alternate screen 中容易产生误导或吞掉 TUI 期望接收的组合键。

**备选方案**:

- alternate screen 中仍执行 xterm 滚动。缺点是多数全屏 TUI 没有普通 scrollback 语义，用户感知不稳定。
- 始终消费快捷键但 no-op。缺点是会阻断 TUI 自身快捷键。

## Risks / Trade-offs

- [快捷键与平台习惯存在差异] → 在 tooltip 中明确展示快捷键，并保留可点击控件作为主发现入口。
- [悬浮控件遮挡 terminal 内容] → 使用小尺寸 icon-only 控件，靠近边缘放置，并保持低存在感；搜索栏打开时应避免布局重叠。
- [滚动状态更新不及时] → 订阅 xterm `onScroll` 并在输出写入、session 激活和 resize 后刷新状态。
- [隐藏控件导致用户不知道能力存在] → 在有 scrollback 且普通 buffer 下展示控件，按钮禁用状态比完全常驻更少干扰。
- [未来想支持自定义快捷键] → 当前设计不阻塞后续把 terminal-local action 纳入快捷键设置，但本次不引入该复杂度。
