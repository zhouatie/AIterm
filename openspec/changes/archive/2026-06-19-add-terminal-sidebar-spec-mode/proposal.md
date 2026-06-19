## Why

用户在语音驱动 SDD 时，需要频繁在多个 terminal tab 与 OpenSpec/RavenSpec change 之间切换。当前 Terminal 侧边栏只展示 workspace / terminal tab，SDD change 状态只能从左侧文件预览区的 OpenSpec 面板查看，导致“找 change、定位对应 terminal、继续执行”的路径偏长。

## What Changes

- 在 Terminal 侧边栏增加 `Terminal / Spec` 模式切换。
- `Terminal` 模式保持现有 workspace / terminal tab 双层导航行为。
- `Spec` 模式按已打开 terminal session 的项目目录聚合展示 OpenSpec/RavenSpec active change 卡片。
- Spec change 卡片展示 workflow、change 名称、artifact 完整度、任务进度、推荐下一步等摘要信息。
- 点击 change 卡片时，系统切回 `Terminal` 模式并定位到承载该项目目录的对应 terminal tab，右侧显示该 tab 的终端。
- Spec change 卡片提供“下一步”入口，点击后展示 Skill 选择弹窗；弹窗只展示当前推荐阶段及之后的可用 Skill，避免把 Explore/Propose 等已过去流程放入候选项。
- 用户在 Skill 选择弹窗中选定具体 Skill 后，低风险操作可写入对应 terminal 执行，高风险操作需要确认。
- 点击卡片中的 artifact 入口时，系统打开对应 Markdown artifact 到现有文件预览区；缺失 artifact 不可打开。
- Spec 模式不销毁、不重建、不暂停任何已有 PTY 会话。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `terminal-tabs`: Terminal 侧边导航新增 `Terminal / Spec` 模式切换、Spec change 卡片展示、从 Spec 卡片定位回 terminal tab，以及从卡片选择并触发后续 SDD Skill 的行为。

## Impact

- 影响 `src/components/TerminalPanel.tsx`：新增侧边栏模式状态、Spec 模式渲染、change 卡片点击定位逻辑、下一步 Skill 选择弹窗和确认/执行逻辑。
- 影响 SDD workflow 数据读取：复用或抽取现有 OpenSpec/RavenSpec change summary 数据结构与读取路径。
- 影响 SDD 命令路由：下一步 Skill 执行需要复用现有 OpenSpec/RavenSpec action 到 payload 的映射，避免重复维护 CLI 文案。
- 影响文件预览联动：artifact 入口需要复用现有文件预览打开通道。
- 影响样式：新增 Terminal 侧边栏模式切换和紧凑 Spec 卡片样式。
- 不新增外部依赖，不改变 PTY/session IPC 协议，不改变现有 Terminal 模式的 workspace/session 操作语义。
