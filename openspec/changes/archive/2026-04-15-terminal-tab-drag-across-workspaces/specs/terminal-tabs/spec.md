## ADDED Requirements

### Requirement: terminal tab 拖动排序
terminal 面板 SHALL 支持通过拖动二级 terminal tab 调整其在所属 workspace 内的显示顺序，且排序完成后保持原会话可用。

#### Scenario: 在同一 workspace 内向前重排 terminal tab
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到同一 workspace 中另一个 terminal tab 之前
- **THEN** 系统 SHALL 按放置结果更新该 workspace 下二级 terminal tab 的顺序
- **THEN** 被移动 terminal tab 对应的 PTY 会话 SHALL 继续运行，不得被销毁或重建

#### Scenario: 在同一 workspace 内向后重排 terminal tab
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到同一 workspace 中另一个 terminal tab 之后
- **THEN** 系统 SHALL 以放置后的顺序重排该 workspace 下的二级 terminal tab
- **THEN** 当前活跃 terminal 会话 SHALL 保持原样，除非用户主动切换

#### Scenario: 取消拖动后顺序不变
- **WHEN** 用户开始拖动某个二级 terminal tab，但在未命中有效放置目标时取消拖动
- **THEN** 系统 SHALL 保持原有 workspace 结构和二级 terminal tab 顺序不变

### Requirement: terminal tab 跨 workspace 拖动
terminal 面板 SHALL 支持将二级 terminal tab 拖动到其他已有 workspace，并在放置后维护 workspace 结构与活跃态一致性。

#### Scenario: 将 terminal tab 移动到另一个 workspace
- **WHEN** 用户拖动某个二级 terminal tab，并将其放到另一个已有 workspace 的 session 列表中
- **THEN** 系统 SHALL 将该 terminal tab 从源 workspace 移除并插入目标 workspace 的放置位置
- **THEN** 该 terminal tab 对应的 PTY 会话 SHALL 继续运行，不得被销毁或重建

#### Scenario: 拖动活跃 terminal tab 到其他 workspace
- **WHEN** 用户将当前活跃的二级 terminal tab 拖动到另一个已有 workspace
- **THEN** 系统 SHALL 保持该 terminal tab 仍为当前活跃终端
- **THEN** 系统 SHALL 使其移动后的所属 workspace 保持可见，便于用户识别新的归属

#### Scenario: 源 workspace 因移动而为空时自动移除
- **WHEN** 用户将某个 workspace 中最后一个剩余的二级 terminal tab 拖动到其他 workspace
- **THEN** 系统 SHALL 自动移除已无任何二级 terminal tab 的源 workspace
- **THEN** 若应用内仍存在其他 workspace，系统 SHALL 不额外创建新的默认 workspace
