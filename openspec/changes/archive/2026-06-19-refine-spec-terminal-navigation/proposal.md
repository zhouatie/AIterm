## Why

Terminal 侧边栏切到 `Spec` 模式后，用户主要是在浏览和选择 SDD change；点击 change 卡片时如果自动切回 `Terminal` 模式，会打断用户继续比较多个 Spec 的上下文。当前行为也把“切换右侧 terminal”和“切换左侧侧边栏模式”绑定在一起，交互语义不够清晰。

当同一项目目录下存在多个 terminal session 时，仅按目录无法判断某个 Spec change 应该定位到哪一个 terminal，尤其是只有其中一个 session 正在运行 Codex/Agent 的场景。需要让 Spec change 与具体 terminal session 建立明确绑定，避免每次按“当前/最近活跃”猜测导致定位不准。

在 Spec 模式下用户也需要和 Terminal tab 一样通过快捷键连续切换卡片；同时 Terminal / Spec 模式本身需要一个直接的键盘切换入口，减少在鼠标和键盘之间来回切换。

## What Changes

- 用户在 Terminal 侧边栏点击 `Spec` 模式入口时，右侧当前活跃 terminal session 保持不变。
- 用户点击 Spec change 卡片主区域时，只切换右侧活跃 terminal session 到该 change 所属项目关联的 terminal，不再把左侧侧边栏切回 `Terminal` 模式。
- 系统为每个 Spec change 支持运行期 terminal 绑定，绑定键为 `rootPath + workflow + changeName`，绑定值为具体 terminal session。
- 当 change 尚未绑定且同项目下只有一个 Codex/Agent 候选 session 时，系统自动绑定并切换到该 session。
- 当 change 尚未绑定且同项目下存在多个候选或无法唯一判断时，系统展示轻量选择器让用户选择目标 terminal；用户选择后保存绑定。
- 用户可以从 Spec change 卡片显式重新打开 terminal 选择器，修改已绑定的目标 terminal。
- Terminal 侧边栏 `Spec` 模式只展示已存在 `specs/**/*.md` 的 change 卡片；没有 spec artifact 的 change 不显示卡片，过滤后没有可展示卡片的项目分组也不显示。
- 系统新增 `Terminal / Spec` 模式切换快捷键，默认绑定为 `Command + D`。
- 当 Terminal 侧边栏展开且处于 `Spec` 模式时，“上一个/下一个 Terminal Tab”快捷键按可见 Spec change 卡片顺序切换卡片，并复用卡片主区域定位右侧 terminal 的行为。
- Spec change 卡片内的 artifact 入口继续只打开文件预览，不切换 terminal、不执行命令。
- Spec change 卡片内的“下一步”入口继续把 payload 发送到该 change 绑定或选定的目标 terminal，不要求先切换左侧侧边栏模式。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `terminal-tabs`: 调整 Terminal 侧边栏 `Spec` 模式下 change 卡片定位 terminal 的交互契约，使卡片点击只影响右侧活跃 terminal，不改变左侧 `Terminal / Spec` 模式，并支持 Spec change 到具体 terminal session 的运行期绑定。
- `keyboard-shortcuts`: 新增 `Terminal / Spec` 模式切换动作，默认绑定为 `Command + D`，并使快捷键设置支持该动作。

## Impact

- 影响 `src/components/TerminalPanel.tsx` 中 Spec change 卡片点击、快捷键导航与目标 terminal 激活逻辑。
- 影响 `src/ShortcutContext.tsx` 中快捷键动作定义、默认绑定和设置项。
- 不新增依赖，不修改 IPC API，不修改 PTY/session 生命周期。
- 不改变左侧文件预览区 `Files / OpenSpec` Dashboard 行为。
- terminal 绑定仅在当前应用运行会话内有效，不作为跨重启持久化数据。
