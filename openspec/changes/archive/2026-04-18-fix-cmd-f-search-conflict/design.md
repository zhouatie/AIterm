## Context

当前 `Command + F` 同时存在两条触发路径：

- 应用级快捷键系统在 `ShortcutContext` 中将 `find-in-file-preview` 默认绑定为 `Meta+F`，由文件预览面板注册处理器打开预览查找框。
- `TerminalPanel` 直接在 `window` 上监听 `keydown`，遇到 `Cmd+F` 时打开或切换终端搜索栏。

xterm.js 使用内部隐藏 `<textarea>` 捕获键盘事件。现有快捷键系统为了让终端聚焦时仍能触发 `Command + B`、`Command + T`、`Command + W` 等应用快捷键，特意不把 `.xterm` 内部 `<textarea>` 当作普通可编辑输入。因此同一次 `Cmd+F` 会同时满足 terminal search 和应用级文件预览查找的触发条件。

## Goals / Non-Goals

**Goals:**

- 终端获得焦点时，`Command + F` 只触发终端搜索。
- 非终端区域中，文件预览查找继续使用现有 `Command + F` 默认绑定。
- 保持现有快捷键设置、持久化和校验模型不变。
- 以最小范围修复当前冲突，不引入新的快捷键路由架构。

**Non-Goals:**

- 不重新设计全局快捷键优先级系统。
- 不新增终端搜索或文件预览搜索功能。
- 不调整现有快捷键默认绑定。
- 不改变 xterm.js、PTY、IPC 或搜索 addon 的集成方式。

## Decisions

### 决策 1：按事件来源区分终端搜索和文件预览查找

选择：将 `.xterm` 内部键盘事件视为终端上下文。`Command + F` 的 terminal search 监听只在事件目标位于当前终端区域时响应；应用级 `find-in-file-preview` 在事件目标位于 `.xterm` 内部时不得触发文件预览查找。

理由：这是用户感知最自然的规则。用户点击终端后按 `Command + F` 是搜索终端输出；用户不在终端中操作时，`Command + F` 继续用于右侧文件预览搜索。

替代方案：改掉其中一个默认快捷键。该方案会牺牲 macOS / 编辑器常见的 `Command + F` 搜索习惯，也无法表达“同一快捷键在不同焦点上下文下搜索当前内容”的交互语义。

### 决策 2：保留现有应用级快捷键系统，不引入上下文优先级框架

选择：本次只对 `Command + F` 冲突做局部焦点门控，不新增 shortcut scope、priority stack 或命令路由表。

理由：当前确认的问题只涉及文件预览查找和终端搜索。直接引入通用快捷键路由会扩大变更面，并影响设置面板、快捷键校验和大量既有动作。

替代方案：把 terminal search 也纳入 `ShortcutContext`，建立上下文优先级。该方案长期更统一，但属于更大的设计变更，不适合作为当前缺陷的最小修复。

### 决策 3：不依赖 `stopPropagation()` 作为唯一防线

选择：终端搜索监听可以继续阻止默认浏览器查找行为，但应用级文件预览查找必须自己识别并跳过 xterm 键盘目标。

理由：当前两个监听器都挂在 `window` 上。`stopPropagation()` 不能阻止同一目标上的其他监听器执行，监听器注册顺序也不应该成为正确性的前提。让应用级 `find-in-file-preview` 明确判断终端上下文，行为更稳定。

替代方案：在终端监听器中调用 `stopImmediatePropagation()`。这可以阻断同一目标上的后续监听器，但仍依赖监听器注册顺序，并可能影响其他 window keydown 逻辑。

## Risks / Trade-offs

- [Risk] `.xterm` 类名判断与 xterm.js DOM 结构绑定。→ Mitigation：项目现有快捷键逻辑已经依赖 `.xterm` 区分内部 `<textarea>`，本次沿用同一约定，不引入新的 DOM 约定。
- [Risk] 终端搜索栏输入框聚焦时再次按 `Command + F` 不会切换终端搜索栏。→ Mitigation：搜索栏输入框属于真实 `<input>`，现有全局快捷键会跳过；本次保持该输入语义不变，关闭仍通过 Escape 或关闭按钮。
- [Risk] 未来其他区域复用 `Command + F` 可能再次产生类似问题。→ Mitigation：本次记录为最小修复；若后续出现多个区域冲突，再升级为上下文快捷键路由。
