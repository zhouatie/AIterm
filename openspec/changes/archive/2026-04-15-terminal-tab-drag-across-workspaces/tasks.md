## 1. 拖放状态与数据更新

- [x] 1.1 在 `TerminalPanel.tsx` 中为二级 terminal tab 增加拖动中的源 session、目标 workspace 和插入位置状态
- [x] 1.2 实现基于 `sessionId` 的 session 重排/跨 workspace 移动函数，统一处理“源数组删除后再插入目标数组”的更新逻辑
- [x] 1.3 在移动后复用现有活跃态与空 workspace 清理规则，确保不销毁或重建已有 PTY 会话

## 2. 终端导航拖放交互

- [x] 2.1 为二级 terminal tab 接入拖动开始、悬停和放置事件，并把目标位置解析为 `targetWorkspaceId + insertIndex`
- [x] 2.2 在同一 workspace 内提供可见的插入反馈，确保用户能判断 terminal tab 将被放到哪里
- [x] 2.3 在跨 workspace 拖动时提供目标 workspace 高亮与放置反馈，并处理取消拖动后状态恢复

## 3. 验证与收尾

- [x] 3.1 验证同一 workspace 内向前、向后拖动后，terminal tab 顺序与活跃终端表现符合 spec
- [x] 3.2 验证跨 workspace 拖动后，session 名称、活跃态和 PTY 会话保持不变，源 workspace 为空时会被移除
- [x] 3.3 补充或更新与 terminal tab 拖放相关的测试/验证步骤，覆盖取消拖动和边界放置场景
