## Context

应用已有完整的快捷键系统（`ShortcutContext.tsx`）和相对切换快捷键（上一个 / 下一个）。本次在此基础上扩展，支持通过编号直接跳转到任意 terminal tab。

当前架构要点：
- 每个快捷键动作以 `ShortcutActionId` 字符串标识，统一注册到 `actionHandlersRef`
- 默认绑定在 `DEFAULT_SHORTCUT_BINDINGS` 中声明，可被用户持久化覆盖
- `TerminalPanel.tsx` 用 `getOrderedSessionIds()` 将全部 workspace 下的 session 展开为有序数组，已用于相对切换

## Goals / Non-Goals

**Goals:**
- 新增 `Command + 1` … `Command + 9` 跳转到第 1 … 第 8 / 最后一个 tab
- 与现有可配置快捷键系统完全一致：每个编号对应独立动作，可在设置面板自定义或清除
- `Command + 9` 固定跳转到最后一个 tab（无论总数量）
- 编号超出范围（如只有 2 个 tab 时按 Cmd+5）不报错，静默无效

**Non-Goals:**
- 不引入新的"分组"或"快捷键集合"概念
- 不更改 tab 排序逻辑（仍使用现有 `getOrderedSessionIds` 扁平顺序）
- 不为折叠 workspace 做特殊处理（折叠状态下 session 仍计入序号）

## Decisions

### 决策 1：9 个独立动作 ID vs 运行时特判

**选择：9 个独立动作 ID**（`select-terminal-tab-1` … `select-terminal-tab-9`）

- 替代方案：在 `handleKeyDown` 中对 `Meta+[1-9]` 做特判，绕过动作注册体系
- 拒绝原因：特判会破坏快捷键系统的统一性，导致这 9 个键无法在设置面板中配置，与现有 10 个动作的用户体验不一致

### 决策 2：Cmd+9 的语义

**选择：Cmd+9 = 最后一个 tab**，与 Chrome / Safari / iTerm2 保持一致。

- 替代方案：Cmd+9 = 第 9 个 tab（若不存在则无效）
- 拒绝原因：用户肌肉记忆来自浏览器；当 tab 超过 9 个时，无法通过快捷键跳到最后一个 tab 体验较差

### 决策 3：tab 序号基准

**选择：`getOrderedSessionIds()` 扁平顺序**（所有 workspace 展开后从上到下）

- 此函数已存在（`TerminalPanel.tsx:89`），逻辑无需改动
- 折叠中的 workspace 其 session 仍参与排序，与侧边栏视觉顺序一致

### 决策 4：设置面板布局

**选择：追加在现有列表末尾，不新增分组**

- 当前 10 个动作已是平铺列表，再加 9 个共 19 个，设置面板可滚动，不存在溢出问题
- 后续如有需要可统一对设置面板做分组重构，超出本次范围

## Risks / Trade-offs

- **`Cmd+1` … `Cmd+9` 与 shell 应用冲突** → 与 `Meta+Shift+[/]` 相同，由 `isEditableTarget` 对 xterm.js textarea 豁免处理；实测在终端获焦时 Cmd+数字在 macOS 上不产生可见字符，风险极低
- **设置面板条目增多** → 9 条新增后共 19 条，UI 尚可接受，但长期应考虑分组；本次不处理
- **`ShortcutActionId` 类型膨胀** → TypeScript 联合类型新增 9 个字面量，代码量略增但无运行时影响

## Open Questions

无。
