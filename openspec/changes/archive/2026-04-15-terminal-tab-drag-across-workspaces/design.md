## Context

AIterm 当前的 terminal 导航采用 `workspace -> session` 双层结构，用户可以创建、关闭、切换和重命名 terminal tab，但 session 顺序基本固定，只能通过删除后重建来调整分组。`TerminalPanel.tsx` 既负责渲染 workspace/session 列表，也直接持有 `workspaces` 和 `activeSessionId` 等状态，因此拖动排序会同时影响交互层和状态写入层。

这个改动的关键约束有两个：

- terminal tab 对应的 PTY/xterm 实例已经独立存在，拖动只允许重排或改挂载归属，不能销毁后重建。
- 当前导航是一棵分层树，拖动目标既可能是“同一 workspace 内某个 session 前后的位置”，也可能是“另一个 workspace 的 session 列表”。

## Goals / Non-Goals

**Goals:**

- 支持在同一个 workspace 内通过拖动调整 terminal tab 顺序。
- 支持把 terminal tab 拖动到另一个已有 workspace，并插入到目标 workspace 的指定位置。
- 拖动完成后保持原 session 的 PTY、名称覆盖、活跃态和滚动状态不变。
- 当源 workspace 因移动而变空时，沿用现有规则自动移除空 workspace。

**Non-Goals:**

- 不支持通过拖动直接创建新的 workspace。
- 不支持拖动一级 workspace 节点本身。
- 不引入新的状态持久化格式或兼容层。
- 不处理触屏手势或键盘拖放等额外交互模式。

## Decisions

### 决策 1：以 session ID 作为拖放载荷，只修改内存中的树结构

**选择**：拖放时仅携带 `sessionId`、`sourceWorkspaceId` 和目标位置信息；放置后通过一次纯状态更新重建新的 `workspaces` 数组。

**理由**：

- session ID 已经是现有切换、关闭、重命名逻辑的稳定锚点，适合复用。
- 将拖放结果收敛为一次 `setWorkspaces` 更新，可以避免交互过程直接触碰 PTY 层。
- 同 workspace 排序和跨 workspace 移动都能归约为“从源数组删除，再插入目标数组”。

**备选方案**：

- 直接在拖动过程中同步修改 DOM 顺序：会让 React 状态与真实数据源脱节，不可取。
- 基于索引而不是 ID 建模：跨 workspace 后索引会失效，且和活跃 session 的关联不稳定。

### 决策 2：目标位置统一建模为插入锚点

**选择**：所有放置目标统一解析为 `targetWorkspaceId + insertIndex`，无论用户落在某个 session 的前方、后方，还是落在 workspace 的空白区域，最终都转换成插入索引。

**理由**：

- 数据层不需要理解复杂的 hover 语义，只要理解最终插入位置。
- 同 workspace 内重排和跨 workspace 移动可以共用同一套更新函数。
- 对空 workspace 或折叠 workspace，仍然可以落成“插入到 index 0”这种简单结果。

**备选方案**：

- 区分“放到 session 上”和“放到 workspace 上”的两套逻辑：实现会重复，边界更难统一。

### 决策 3：活跃 session 不随拖动失焦

**选择**：如果被移动的 session 当前处于活跃态，则拖动前后继续保持 `activeSessionId` 不变；如果移动的是非活跃 session，则当前活跃终端也保持不变。

**理由**：

- 拖动排序是组织结构动作，不应隐式触发终端切换。
- `activeSessionId` 已经足以定位移动后的节点，不需要额外重算。
- 这能保证正在运行的命令和当前可见终端不被打断。

**备选方案**：

- 放置后自动激活目标 workspace 的第一个 session：会造成不可预期的焦点跳转。
- 只要跨 workspace 就切换到被拖动 session：对非活跃 session 的整理场景不合理。

### 决策 4：空 workspace 复用现有清理规则

**选择**：跨 workspace 移动后，如果源 workspace 不再包含任何 session，则立即从 `workspaces` 中移除。

**理由**：

- 现有关闭 tab 语义已经规定空 workspace 自动移除，拖动迁移后应保持一致。
- 避免留下没有实际内容的一级节点，减少额外状态分支。

**备选方案**：

- 保留空 workspace 以便用户后续再拖入：会和当前关闭语义冲突，也增加视觉噪音。

### 决策 5：拖放反馈只服务于放置判断，不追加兼容性兜底

**选择**：通过显式的拖拽占位/高亮反馈标记当前目标 workspace 和插入位置，但不为了兼容多套拖放实现而引入冗余分支。

**理由**：

- 项目已有明确约束，默认不写兼容性代码。
- 只保留当前 UI 所需的一套拖放数据流，后续维护成本更低。

**备选方案**：

- 同时支持多种拖放库或备用实现：增加复杂度，但当前需求没有价值。

## Risks / Trade-offs

- **[Risk] 同一 workspace 内向后拖动时，删除源项后索引偏移导致插入位置错误** → 在计算 `insertIndex` 时先判断源/目标是否同一数组，并对向后移动场景做一次索引校正。
- **[Risk] 折叠 workspace 或空白区域的命中规则不清晰，用户放置感知弱** → 在设计中要求 workspace 级别高亮和明确插入指示，减少歧义。
- **[Risk] 拖动时频繁 hover 更新导致列表抖动** → 仅在目标 workspace 或插入位置真正变化时更新拖放态，避免无意义重渲染。
- **[Trade-off] 这次只支持移动到已有 workspace** → 范围更小、更稳，但用户仍不能通过拖动顺手生成新 workspace。
