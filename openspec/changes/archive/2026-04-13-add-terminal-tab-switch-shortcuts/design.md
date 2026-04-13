## Context

当前应用已经有一套集中式快捷键系统：`ShortcutContext` 维护动作 ID、默认绑定、用户配置持久化、冲突校验和全局 `keydown` 分发；`SettingsPanel` 根据 `SHORTCUT_ACTIONS` 动态渲染可配置快捷键；`TerminalPanel` 在组件内部注册 terminal 相关动作。

terminal 面板当前使用 `WorkspaceNode[]` 维护左侧双层导航结构。一级 workspace 负责分组与展开状态，二级 terminal session 才是真正可激活的终端 tab。已有的 `handleSelectSession` 已经封装了切换活跃 session 时需要同步的 workspace 路径上下文和活跃 session 状态。

本次变更不需要新增 IPC 或改变终端实例生命周期，重点是把两个新动作接入现有快捷键中心，并在 `TerminalPanel` 内部基于现有 workspace 树计算上一项 / 下一项目标。

## Goals / Non-Goals

**Goals:**

- 新增“上一个 terminal tab”和“下一个 terminal tab”两个应用级快捷键动作。
- 默认绑定为 `Command + Shift + [` 和 `Command + Shift + ]`。
- 新动作进入现有设置面板，支持保存、恢复和冲突校验。
- 快捷键触发后按左侧导航从上到下的二级 terminal tab 顺序循环切换。
- 切换逻辑复用现有 terminal 选择流程，保持文件树 active session 同步、终端实例保活和自动滚动行为。

**Non-Goals:**

- 不新增系统级全局快捷键。
- 不做跨平台 `Ctrl` 兼容分支。
- 不引入 terminal tab 历史栈或最近使用顺序切换。
- 不改变 workspace 的展开 / 收起点击语义。
- 不新增测试框架或外部依赖。

## Decisions

### 决策 1：继续复用 `ShortcutContext`，而不是在 `TerminalPanel` 内新增键盘监听

**选择**：在 `ShortcutActionId`、`SHORTCUT_ACTIONS` 和 `DEFAULT_SHORTCUT_BINDINGS` 中新增：

- `select-previous-terminal-tab`
- `select-next-terminal-tab`

`TerminalPanel` 通过 `registerAction` 注册对应 handler。

**理由**：现有系统已经解决了设置面板、持久化、冲突校验、终端获焦时不屏蔽全局快捷键等问题。新增局部监听会绕开这些能力，并让用户配置无法生效。

**替代方案**：在 `TerminalPanel` 内监听 `keydown`。这会制造重复匹配逻辑，也会让快捷键设置面板中的配置与实际行为脱节。

### 决策 2：使用左侧导航的全局二级节点顺序循环切换

**选择**：切换范围为所有 workspace 下的二级 terminal session。计算目标时按 `workspaces` 数组顺序遍历，每个 workspace 内按 `sessions` 顺序展开为一个扁平列表：

```text
workspace_1
  terminal A
  terminal B
workspace_2
  terminal C

全局顺序: A -> B -> C -> A
```

`Command + Shift + [` 选择扁平列表中的上一项；`Command + Shift + ]` 选择下一项；到头后循环。

**理由**：用户描述的是“切换 terminal 的 tab”，而当前模型中二级 terminal session 才是 tab。全局循环符合 IDE / 浏览器中“上一个 tab / 下一个 tab”的心智，也避免用户必须先切 workspace 再切 tab。

**替代方案**：只在当前 workspace 内切换。这个行为更局部，但当用户跨 workspace 管理多个开发上下文时，键盘切换会被 workspace 边界截断，需要额外交互才能抵达其他 terminal。

### 决策 3：切换到折叠 workspace 内的 tab 时只切活跃 session，不强制展开 workspace

**选择**：快捷键切换只调用与点击二级 terminal 相同的选择流程，不主动修改 workspace 的 `isExpanded`。如果目标二级节点所在 workspace 当前折叠，则终端内容仍切换到目标 session，侧边栏中由现有活跃 workspace 高亮辅助识别。

**理由**：workspace 展开状态是用户主动管理的导航状态。快捷键切换如果隐式展开 workspace，会让用户折叠状态被意外改变。

**替代方案**：切换目标在折叠 workspace 内时自动展开该 workspace。这样可见性更强，但会把“切换 terminal”和“修改导航展开状态”绑在一起，容易产生布局跳动。

### 决策 4：终端成为 active 后由 `TerminalInstance` 负责聚焦

**选择**：在 `TerminalInstance` 的 `isActive` effect 中，复用当前重新适配尺寸的时机，在目标终端可见后调用 xterm 的 `focus()`。

**理由**：`TerminalPanel` 只负责决定哪个 session 是 active，真正持有 xterm 实例的是 `TerminalInstance`。把聚焦放在实例内部，可以同时覆盖快捷键切换、鼠标点击切换和关闭后自动切换等所有 active 变化路径。

**替代方案**：在 `TerminalPanel` 中维护每个终端实例的 ref 并直接调用 focus。这样会把 xterm 实例控制权泄露到父组件，扩大组件边界。

### 决策 5：只扩展现有快捷键规范化能力，不引入新的组合键模型

**选择**：继续使用 `Meta+Shift+[` / `Meta+Shift+]` 这样的规范化字符串。现有 `normalizePrimaryKey` 对单字符主键会转大写，`[` / `]` 不受大小写影响，可以沿用当前规则。

实现时需要确认录入、持久化和显示都能稳定处理这两个主键，必要时只补充更明确的显示文案，不改变整体模型。

**理由**：这次新增的默认快捷键仍然符合现有 `Meta` 主导的 macOS 快捷键模型，没有必要提前抽象跨平台或多修饰键兼容层。

**替代方案**：引入更复杂的 key code / physical key 抽象。这样可以更精确地区分键盘布局，但超出当前需求，也会扩大设置面板和存储格式的改动面。

## Risks / Trade-offs

- **[折叠 workspace 内的目标 tab 不一定在侧边栏中可见]** → 保持终端内容切换和所属 workspace 高亮；不破坏用户折叠状态。
- **[快捷键与系统或输入法存在潜在冲突]** → 通过现有设置面板允许用户重新绑定，并继续使用冲突校验避免应用内动作重复。
- **[只有一个 terminal tab 时用户感知不到变化]** → 明确规定单 tab 场景下不改变状态，避免制造无意义重建或闪烁。
- **[新增动作导致设置面板文案过期]** → 更新说明文案为泛化表述，不再写死“3 个动作”。

## Migration Plan

1. 扩展 `ShortcutContext` 的动作类型、动作声明和默认绑定。
2. 更新设置面板快捷键说明文案，保持配置列表继续由 `SHORTCUT_ACTIONS` 驱动。
3. 在 `TerminalPanel` 中新增扁平化 session 顺序计算与上一项 / 下一项切换 handler。
4. 使用 `registerAction` 注册两个新 terminal tab 切换动作。
5. 手动验证默认快捷键、设置面板重新绑定、单 tab 场景、多 workspace 场景和折叠 workspace 场景。

## Open Questions

无。当前提案采用全局二级 terminal tab 顺序循环切换。
