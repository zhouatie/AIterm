## Context

Terminal 面板右侧的活跃 terminal session 由 `TerminalPanel` 内部状态管理，左侧 Terminal 侧边栏有 `Terminal / Spec` 两种模式。当前 Spec change 卡片点击逻辑同时执行两件事：切换右侧活跃 session，并把左侧侧边栏切回 `Terminal` 模式。用户在 `Spec` 模式下浏览多个 change 时，这种绑定会中断当前 Spec 列表上下文。

现有 `handleSelectSession` 已经能完成右侧 session 激活、workspace last active 更新和 agent status 清理；本次不需要新增 session 数据结构或 IPC 能力。

同一项目目录可能同时打开多个 terminal session，但只有其中一个运行 Codex/Agent。仅按 `rootPath` 选择 session 会在这种情况下定位不准。现有 agent status 上下文可以识别 `codex`、`claude-code`、`opencode` 等 agent session，可作为自动绑定候选信号；但当候选不唯一时仍需要用户显式选择。

现有快捷键系统通过 `ShortcutContext` 注册 action handler，并已经提供“上一个/下一个 Terminal Tab”动作。该动作目前只按 terminal session 顺序切换；切换 `Terminal / Spec` 模式本身还没有可配置快捷键。

## Goals / Non-Goals

**Goals:**

- 点击 Spec change 卡片主区域时，只切换右侧活跃 terminal session。
- 保持 Terminal 侧边栏停留在 `Spec` 模式，方便用户连续点击多个 Spec change 卡片比较不同 terminal。
- 支持 Spec change 与具体 terminal session 的运行期绑定，解决同目录多 session 时定位不准的问题。
- 当系统不能唯一判断目标 session 时，提供轻量选择器让用户手动绑定。
- 支持用户在选错后从卡片重新打开选择器并修改绑定。
- 仅展示已经具备 specs artifact 的 Spec change 卡片，隐藏没有 `specs/**/*.md` 的 change。
- 新增 `Command + D` 默认快捷键，用于切换 Terminal 侧边栏的 `Terminal / Spec` 模式。
- 在 `Spec` 模式下复用现有“上一个/下一个 Terminal Tab”快捷键，按可见 Spec change 卡片顺序切换并定位右侧 terminal。
- 保持 artifact 入口、“下一步”入口和目标 session 选择规则不变。
- 保持切换到 `Spec` 模式本身不自动定位第一个 Spec 对应 terminal。

**Non-Goals:**

- 不重新设计 Spec 卡片视觉布局。
- 不新增 terminal session 创建、恢复或持久化能力。
- 不改变左侧文件预览区 `Files / OpenSpec` Dashboard。
- 不改变 SDD Command Router 生成 payload 的规则。
- 不把物理方向键新增为全局快捷键输入格式，本次只复用现有可配置快捷键动作。
- 不做跨应用重启的绑定持久化，因为当前 terminal session id 是运行期 PTY 身份。

## Decisions

1. 解耦 Spec 卡片点击与侧边栏模式切换。

   Spec 卡片主区域点击仍调用现有目标 session 解析逻辑和 `handleSelectSession`，但不再调用 `setSidebarMode('terminal')`。这样右侧 terminal 会切换，左侧仍保留 Spec change 导航。

   备选方案是切到 `Spec` 模式时自动定位第一个 Spec 对应 terminal。该方案会让模式切换产生隐藏副作用，用户只是打开导航面板时也会丢失当前 terminal 上下文，因此不采用。

2. 移除 Spec 卡片点击后的 Terminal tab 节点滚动依赖。

   由于点击后仍停留在 `Spec` 模式，Terminal tab 节点并不可见，滚动到节点没有实际价值。实现上只需要让目标 terminal 成为右侧活跃 terminal，并在需要时 focus 目标 terminal。

3. 保持“下一步”入口不强制切换右侧 terminal。

   “下一步”已经绑定到 change 所属项目关联的目标 session，并直接把 payload 写入该 session。该行为适合批量处理 Spec，不需要额外切换侧边栏模式或右侧可见 terminal。

4. 引入运行期 change-session 绑定。

   在 `TerminalPanel` 内维护 `Record<string, string>`，key 使用 `rootPath + workflow + changeName`，value 为 session id。点击 Spec change 卡片或执行“下一步”时优先使用已绑定 session；若绑定 session 已不存在，则清理该绑定并进入重新选择流程。

   自动绑定规则只在能唯一判断时生效：同项目 session 中若恰好只有一个 agent status 为非 idle 的 Codex/Claude Code/OpenCode session，则绑定到该 session；否则弹出选择器，让用户从同项目 session 中选择目标 terminal。选择器中标识 session 名称、workspace 和 agent 状态，避免用户在同目录多 tab 中误选。

5. 在 Spec 卡片上提供显式重新绑定入口。

   卡片主体继续表示“使用当前绑定定位右侧 terminal”。卡片 footer 增加目标 terminal 入口，点击后 stopPropagation，不触发卡片主体定位，直接打开同一个 terminal 选择器并允许用户覆盖当前绑定。该入口复用已有 `pendingSpecTerminalSelect` 状态和选择器 UI。

6. Spec 模式只渲染包含 specs artifact 的 change 卡片。

   在 `renderSpecProjectGroup` 读取 workflow summary 后，对 `changes` 做展示层过滤：仅保留 `change.artifacts.specs.state === 'present'` 且 spec count 大于 0 的 change。过滤只影响 Terminal 侧边栏 `Spec` 模式卡片展示，不改变 workflow summary 数据、不删除 change、不影响左侧文件预览区 OpenSpec Dashboard。若项目下所有 change 都被过滤，项目分组 SHALL 不渲染，避免在 Spec tab 下显示无意义的空项目块。

7. 新增独立的 Terminal / Spec 模式切换快捷键。

   在 `ShortcutContext` 中新增 `toggle-terminal-sidebar-mode` action，默认绑定为 `Meta+D`。`TerminalPanel` 注册该 action 后只切换 `sidebarMode`，不创建 session、不刷新 workflow、不自动定位任何 Spec change。这样 `Command + D` 的语义等同于点击顶部 `Terminal / Spec` 分段控件。

8. 在 Spec 模式下复用上下 Terminal Tab 快捷键切换可见卡片。

   `select-previous-terminal-tab` / `select-next-terminal-tab` 的 action handler 根据当前 UI 状态分支：当侧边栏展开且 `sidebarMode === 'spec'` 时，构建当前可见 Spec change 卡片的扁平列表，并按列表顺序循环选择上一张或下一张；其他状态继续保持原来的 terminal session 切换行为。Spec 卡片快捷键选择复用 `handleSelectSpecProjectSession`，因此绑定解析、自动绑定、选择器和轻量错误反馈都与鼠标点击一致。

## Risks / Trade-offs

- [Risk] 用户点击 Spec 卡片后看不到 Terminal tab 列表中哪个节点被选中。→ Mitigation：右侧 terminal 内容立即切换，Spec 卡片 title/反馈文案表达“切换右侧 terminal”；用户需要查看 tab 归属时可手动切回 `Terminal` 模式。
- [Risk] 现有自动滚动逻辑在 Spec 模式下不再触发，可能影响只依赖侧边栏节点定位的用户。→ Mitigation：保留手动切回 `Terminal` 模式后的现有 active session 高亮和可视区域保持逻辑。
- [Risk] 键盘 Enter/Space 激活卡片需要与鼠标点击保持一致。→ Mitigation：键盘 handler 继续复用同一个卡片选择函数。
- [Risk] agent status 不一定总能覆盖所有 Codex session。→ Mitigation：只在候选唯一时自动绑定；其他情况让用户显式选择。
- [Risk] 绑定 session 被关闭后 stale id 导致定位失败。→ Mitigation：每次使用绑定前检查 session 是否仍存在，不存在则清理绑定并提示重新选择。
- [Risk] 重新绑定入口与卡片主体点击区域冲突。→ Mitigation：入口按钮阻止事件冒泡，卡片主体和绑定修改保持独立。
- [Risk] 用户看不到没有 specs artifact 的 active change 或对应项目分组。→ Mitigation：该过滤仅作用于 Terminal 侧边栏 Spec 卡片；完整 active change 状态仍可在 OpenSpec Dashboard 或文件系统中查看。
- [Risk] 复用 Terminal Tab 上下切换快捷键后，动作名称与 Spec 模式下行为不完全一致。→ Mitigation：该行为只在用户已经切到 `Spec` 模式且侧边栏展开时生效，保持“当前导航列表上一项/下一项”的局部语义。
- [Risk] `Command + D` 与用户已有自定义绑定冲突。→ Mitigation：现有快捷键校验继续阻止重复绑定；已有 localStorage 配置会在 fallback 中补齐新动作默认值。
