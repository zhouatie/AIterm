## Why

当前 SDD 命令入口已经能降低 OpenSpec 语音输入成本，但 RavenSpec 仍被标记为暂不支持。用户在实际 SDD 工作中同时使用 OpenSpec 与公司 RavenSpec，需要同一套语音友好的入口覆盖 RavenSpec workflow，并允许显式跳过部分质量门禁以提升流转效率。

Dashboard change 卡片现有多个操作按钮容易在窄面板中挤在一行，影响可读性与点击准确性，需要限制操作按钮每行最多两个。

## What Changes

- SDD Command Router 支持 RavenSpec workflow provider，将 RavenSpec 语音口令映射到 `$sdd-*` 与 `$ddd-update-change` skill payload。
- RavenSpec Update Change 明确映射为 `$ddd-update-change <change-name>`。
- 支持用户显式跳过可选门禁动作，例如跳过 Plan Review 直接 Apply、跳过 Verify 直接 Archive。
- 跳过门禁不会自动发生，必须来自用户明确输入或显式按钮动作，并在确认界面展示跳过信息。
- RavenSpec active changes 可作为 SDD Dashboard / 当前 change 的候选来源，使用 `ravenspec/changes` 与 Raven artifact 命名。
- Dashboard change 卡片操作按钮布局改为每行最多两个按钮，避免三个按钮挤在同一行。
- Dashboard 左侧操作按钮从“只准备指令”升级为“执行动作”：低风险动作一键发送并执行，高风险动作确认后发送并执行。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `sdd-command-router`: 增加 RavenSpec provider、Raven skill payload 映射、显式跳过门禁动作解析与确认语义。
- `sdd-workflow-panels`: 增加 RavenSpec change 数据展示与按钮布局约束，每个 change 卡片操作按钮每行最多两个。

## Impact

- 影响 SDD 命令解析与 payload 生成逻辑。
- 影响 OpenSpec Dashboard 的数据模型、active change 扫描来源、当前 change workflow 记录。
- 影响 Dashboard change 卡片操作区 CSS 布局和按钮点击后的 terminal 写入行为。
- 不引入新的远程 API；RavenSpec 状态优先基于本地 `ravenspec/changes` 文件结构读取，必要 CLI 交由右侧 terminal 中的 skill 执行。
