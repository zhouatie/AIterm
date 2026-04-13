## Context

当前应用已经有集中式快捷键系统和 terminal 双层导航：

- `ShortcutContext` 负责动作 ID、默认绑定、设置面板配置项、持久化和全局 `keydown` 分发
- `TerminalPanel` 已经在内部管理 workspace 列表、活跃 session、创建 workspace，以及在指定 workspace 下创建二级 terminal tab
- `TerminalPanel` 当前只支持 workspace 级重命名输入态，二级 terminal tab 仍然完全依赖 `displayLabel` 自动显示名称
- 当前 `create-workspace` 绑定为 `Meta+T`，但这个语义更接近“当前上下文下新建 tab”，与 terminal 的双层结构不一致
- 当前激活 workspace 可以直接通过 `activeSessionId` 反查，无需新增“active workspace”独立状态

这次变更横跨快捷键定义、terminal 创建/重命名/关闭路径和设置面板展示文案，属于一个明确的跨模块调整，但不涉及 IPC、数据模型重构或兼容性分支。

## Goals / Non-Goals

**Goals:**
- 将“新增 workspace”默认快捷键改为 `Command + N`
- 新增“在当前激活 workspace 下新增 terminal tab”动作，并绑定 `Command + T`
- 新增“重命名当前 workspace / 当前 terminal tab”与“关闭当前 workspace / 当前 terminal tab”动作
- 允许二级 terminal tab 手动重命名，并在手动重命名后覆盖自动标签更新
- 让新快捷键尽量复用现有鼠标创建、关闭和重命名逻辑，保持 terminal 管理语义一致
- 让设置面板继续基于动作定义自动展示并保存新的快捷键列表
- 保持终端获焦、重命名输入框获焦等现有快捷键边界规则不变

**Non-Goals:**
- 不新增系统级全局快捷键
- 不改动 terminal tab 上一个 / 下一个切换逻辑
- 不引入单独的 active workspace store 或新的导航数据结构
- 不把二级 terminal tab 的手动命名持久化到本地存储或主进程
- 不做 `Ctrl` / `Command` 双写兼容
- 不调整终端创建后的 PTY 生命周期和聚焦策略

## Decisions

### 决策 1：扩展现有 `ShortcutContext` 动作表，而不是为 terminal 管理类快捷键单独监听键盘事件

**选择**：在现有动作定义中新增以下 action：

- `toggle-file-tree` → `Meta+S`
- `toggle-terminal-sidebar` → `Meta+B`
- `create-workspace` → `Meta+N`
- `create-terminal-tab` → `Meta+T`
- `rename-current-workspace` → `Meta+Shift+R`
- `rename-current-terminal-tab` → `Meta+R`
- `close-current-terminal-tab` → `Meta+W`
- `close-current-workspace` → `Meta+Shift+W`
- `select-previous-terminal-tab` → `Meta+Shift+[`
- `select-next-terminal-tab` → `Meta+Shift+]`

**理由**：设置面板、持久化、冲突校验和全局派发都已经依赖 `SHORTCUT_ACTIONS` / `DEFAULT_SHORTCUT_BINDINGS`。继续走同一入口，才能保证新动作自动进入配置区，并与已有动作共享相同规则。

**替代方案**：在 `TerminalPanel` 内部为 `Command + T` / `Command + R` / `Command + W` 直接监听 `keydown`。这样会绕过用户配置和冲突校验，也会让“设置里显示什么”和“实际响应什么”出现分叉。

### 决策 2：当前上下文继续通过 `activeSessionId` 反查，不新增独立状态

**选择**：触发“当前 workspace 下新增 terminal tab”“重命名当前 workspace / terminal tab”“关闭当前 workspace / terminal tab”时，都先从当前 `workspaces` 中找到包含 `activeSessionId` 的 workspace，再决定作用目标。

**理由**：当前 UI 中真正的活跃上下文是 active session，workspace 只是它的容器。额外维护 `activeWorkspaceId` 会增加同步点，还要处理关闭 session、删除 workspace、自动补回默认 workspace 时的状态一致性。

**替代方案**：新增 `activeWorkspaceId` 并在点击、切换、关闭时同步维护。这个方案能少做一次反查，但状态面会更复杂，而且当前代码并不需要它。

### 决策 3：创建、关闭、重命名快捷键优先复用现有鼠标行为入口

**选择**：

- `Command + T` 调用现有 `createSessionInWorkspace(activeWorkspaceId)`
- `Command + Shift + R` 进入现有 workspace 重命名输入态
- `Command + W` 复用现有 `handleCloseSession`
- `Command + Shift + W` 基于当前 workspace 批量调用 session 关闭 / 资源清理逻辑

**理由**：你明确要求创建快捷键“功能等同于当前 active 的 workspace tab 右边的 +”，其余 rename / close 也应与当前 UI 行为保持一致。复用现有入口最直接，也能避免快捷键和鼠标行为在 cwd 继承、活跃项更新、关闭后状态收敛上出现细微分叉。

**替代方案**：为每个快捷键单独实现一套并行逻辑。这样容易和现有鼠标交互逐渐漂移，后续修 bug 也要维护多套路径。

### 决策 4：二级 terminal tab 的手动命名采用渲染层覆盖值，不修改主进程返回的 `displayLabel`

**选择**：为 session 增加 renderer-local 的手动命名覆盖状态。展示名称优先级为“手动命名 > 自动 `displayLabel`”；当 session 的 cwd / git 分支变化时，若该 session 已有手动命名，则继续显示手动名称，不回退自动标签。

**理由**：当前 `displayLabel` 来自终端上下文更新事件，直接改它会把“自动标签”和“用户自定义标签”混在一起。单独维护覆盖层最清晰，也能在不改 IPC 的情况下完成“手动重命名覆盖自动命名”的需求。

**替代方案**：直接把手动名称写回 `displayLabel`。这样会让后续 session info 更新覆盖用户输入，或者需要在主进程引入新的标签来源字段，超出这次范围。

### 决策 5：关闭当前 workspace 等价于关闭其下全部二级 terminal tab

**选择**：`Command + Shift + W` 命中后，系统关闭当前 workspace 下的所有 session、销毁对应 PTY / xterm 资源，并移除该 workspace。若关闭后已无任何 workspace，则沿用现有规则自动补回一个新的 `workspace_{index}` 与其首个终端。

**理由**：这是你明确确认过的行为，而且它和当前“最后一个二级 tab 关闭后 workspace 自动移除”“最后一个终端关闭后自动补回默认 workspace”的现有规则一致。

**替代方案**：只移除 workspace 容器，不逐个关闭内部 session。这样会留下悬挂的终端资源，和现有资源生命周期模型冲突。

### 决策 6：找不到激活 workspace / session 时静默不执行，不做兜底猜测

**选择**：如果快捷键触发时无法从 `activeSessionId` 解析到所属 workspace，或者当前不存在可操作的 session，则创建 / 重命名 / 关闭动作都直接 no-op。

**理由**：terminal 初始化完成后正常路径下总会存在活跃 session。即使在极少数过渡态出现缺失，静默不执行也比“猜一个目标”更安全，不会把操作落到错误的 workspace 或 session 上。

**替代方案**：回退到第一个 workspace、自动新建 workspace、或猜测某个 session 作为目标。这个行为不可预期，且与“当前激活上下文”语义不一致。

### 决策 7：设置面板继续完全由动作定义驱动，只更新动作文案和说明文本

**选择**：不为这次新增动作单独写设置面板分支，而是继续依赖 `SHORTCUT_ACTIONS.map(...)` 渲染列表；需要调整的只有动作文案，以及顶部说明中对可配置动作范围的描述。

**理由**：设置面板已经是数据驱动结构，新增一组动作不应引入额外 UI 逻辑。这样未来再扩展终端快捷键时，只需要补动作定义和 spec。

**替代方案**：在设置面板中硬编码新增几行 terminal 管理动作。虽然能工作，但会破坏现有可扩展性，并再次制造文案和实际动作定义不同步的问题。

## Risks / Trade-offs

- **[`Command + N` 与用户既有 muscle memory 不一致]** → 在设置面板中将两类创建动作清晰区分，且允许用户自行改绑
- **[活跃 session 过渡态下 `Command + T` / `Command + R` / `Command + W` 无法命中目标]** → 采用 no-op，避免把操作落到错误上下文
- **[`Command + T` 与浏览器式“新标签页”心智相近，但这里只限当前 workspace]** → 在 spec 中明确“当前激活 workspace 下新增二级 terminal tab”，避免被理解成新建一级 workspace
- **[手动重命名后的二级 tab 不再自动反映 cwd / git 分支变化]** → 将该行为明确定义为“手动覆盖自动命名”，并保留未来新增“重置为自动命名”的空间
- **[关闭当前 workspace 需要一次性销毁多个 session]** → 复用现有单 session 关闭路径逐个清理，避免资源泄漏
- **[设置面板主 spec 当前对动作列表表述滞后]** → 本次同步修改 `settings-panel` delta，把当前支持的动作列表重新对齐到真实行为

## Migration Plan

1. 更新 `ShortcutContext` 的动作 ID、标题描述和默认绑定
2. 在 `TerminalPanel` 中统一解析当前激活 workspace / session，并注册创建、重命名、关闭相关动作
3. 保持 `createSessionInWorkspace` 和现有 session 关闭逻辑作为唯一的终端生命周期入口，并补充 session 手动命名覆盖状态
4. 更新设置面板文案，使动作列表描述与 `SHORTCUT_ACTIONS` 一致
5. 手动验证 `Command + N`、`Command + T`、`Command + R`、`Command + Shift + R`、`Command + W`、`Command + Shift + W`、终端获焦、重命名输入框获焦和自定义改绑流程

## Open Questions

无。
