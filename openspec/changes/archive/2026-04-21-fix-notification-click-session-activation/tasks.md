## 1. 通知点击激活链路修正

- [x] 1.1 梳理 `terminal:activateSession` 从 main 到 renderer 的调用路径，并在 renderer 中补充通知专用恢复流程
- [x] 1.2 确保通知点击后会激活 terminal 面板并切换到目标 session，而不是仅更新 `activeSessionId`
- [x] 1.3 保持侧边栏展开与缺失 session 静默忽略等现有约束不回退

## 2. 规格与回归验证

- [x] 2.1 更新 `agent-attention-notifications` 相关实现，使其满足“目标 terminal 内容真正可见”的要求
- [x] 2.2 手动验证点击系统通知后，应用回到前台且对应 terminal 内容显示在 terminal 面板中
- [x] 2.3 手动验证 session 已关闭、侧边栏收起、当前位于其他面板时不会报错且行为符合预期
