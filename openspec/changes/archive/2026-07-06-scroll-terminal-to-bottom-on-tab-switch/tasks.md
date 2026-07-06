## 1. 活跃态滚动行为

- [x] 1.1 在 `TerminalInstance` 活跃态恢复流程中，在 attach output、bufferedData 写入和 fit 完成后滚动到普通 buffer 底部。
- [x] 1.2 确保自动滚动后立即上报 scroll state，使首尾滚动控件状态正确刷新。
- [x] 1.3 确保 alternate screen/TUI 场景不通过发送输入或额外按键改变 PTY 状态。

## 2. 切换入口覆盖

- [x] 2.1 验证鼠标点击二级 terminal tab 切换时会自动滚到底部。
- [x] 2.2 验证上一/下一 terminal tab 快捷键和编号快捷键切换时会自动滚到底部。
- [x] 2.3 验证 Agent Inbox、通知激活和 Spec Dashboard 激活 session 时复用同一滚动行为。
- [x] 2.4 确认点击一级 workspace 展开/收起不会改变当前活跃 terminal viewport。

## 3. 回归与边界

- [x] 3.1 确认切换后仍保留每个 terminal 的输出历史、运行进程和 tab 结构。
- [x] 3.2 确认用户在当前活跃 terminal 内手动滚动回看时，未切换 session 前 viewport 不被自动拉回底部。
- [x] 3.3 确认后台 session 输出缓存重新 attach 后，目标 terminal 最终显示在最新输出底部。
- [x] 3.4 如现有测试可覆盖相关逻辑，补充聚焦测试；否则执行 `tsc --noEmit` 并做手动验证记录。
