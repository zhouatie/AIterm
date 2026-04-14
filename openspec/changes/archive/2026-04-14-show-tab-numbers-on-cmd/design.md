## Context

`switch-tab-by-number` 已实现 `Cmd+1…9` 跳转，但用户按键前需要心算序号。本次在 `TerminalPanel.tsx` 内局部维护一个 `isCmdHeld` 布尔状态，按住 `Command` 时临时在侧边栏 tab 节点前渲染序号，松开后隐藏。改动范围仅限 `TerminalPanel.tsx`，无跨模块影响。

## Goals / Non-Goals

**Goals:**
- 按住 `Command` 时在二级 terminal tab 前显示跳转序号（1–9），与 `switch-tab-by-number` 的序号语义完全一致
- 松开 `Command` 或窗口失焦时立即隐藏序号
- 数字样式克制（muted 色、等宽、前置），不抢占 tab 名称视觉焦点

**Non-Goals:**
- 不在侧边栏收起状态下做任何特殊处理（收起时本来就看不到 tab 列表）
- 不常驻显示序号（保持平时视图干净）
- 不改变序号的计算逻辑（复用 `getOrderedSessionIds` 扁平顺序）

## Decisions

### 决策 1：状态维护位置

**选择：`TerminalPanel` 组件内部 `useState`**

- 替代方案 A：提升到 `ShortcutContext` 暴露 `isCmdHeld`
- 替代方案 B：纯 CSS `:hover` 无法检测 Meta 键，不可行
- 选择原因：`isCmdHeld` 只影响侧边栏渲染，局部 state 足够，无需污染全局 context；`ShortcutContext` 中已有 `keydown` 监听器，但混入视觉状态会模糊职责边界

### 决策 2：事件监听位置

**选择：在 `TerminalPanel` 内用 `useEffect` 直接挂载 `window` 的 `keydown` / `keyup` / `blur`**

- 替代方案：复用 `ShortcutContext` 的 `handleKeyDown`，回调通知 Panel
- 选择原因：Meta 键的 down/up 不经过 `ShortcutContext`（后者只处理完整快捷键组合），单独监听更直接；`window.blur` 也只需要在这里处理

### 决策 3：序号的"9 = 最后一个"渲染

**选择：渲染时按位置判断——第 9 位及之后的第一个"最后一个" tab 显示 `9`，其余超出 8 的不显示**

具体规则：
- index 0–7（1-based 1–8）：显示对应数字
- 最后一个 tab（无论位置）：显示 `9`（若 tab 总数 ≤ 9，最后一个就是第 9 位或更早）
- 其余中间位置超出 8 的 tab：不显示数字

这与 `select-terminal-tab-9` 的"最后一个"语义完全对应。用户接受"3 个 tab 显示 1、2、9"的视觉——`9` 在此处的含义是"Cmd+9 可到达最后一个"，而非表示绝对位置。

## Risks / Trade-offs

- **[Stuck key]** 用户 `Cmd+Tab` 切走，`keyup(Meta)` 不触发 → 数字残留 → 监听 `window.blur` 重置，已纳入方案
- **[渲染抖动]** 序号出现/消失可能引起 tab 文字横向位移 → 给序号区域分配固定宽度（如 `1.5rem`），无内容时用空白占位保持布局稳定
