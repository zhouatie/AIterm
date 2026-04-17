## 1. 设置与依赖准备

- [x] 1.1 为项目引入 `@xterm/addon-webgl`，并补充 terminal renderer 偏好的本地持久化工具
- [x] 1.2 在 `App` 与 `SettingsPanel` 中接入“优先尝试 WebGL renderer”配置项，完成默认值、保存与读取链路

## 2. 主进程输出链路重构

- [x] 2.1 将终端输出从全局广播改为按 session 路由，补齐 preload/renderer 所需的 session-scoped 订阅接口
- [x] 2.2 在主进程为每个 session 实现微批次输出聚合，并确保 flush 延迟控制在短时间预算内
- [x] 2.3 为非活跃 session 增加待消费输出缓冲与激活时补写机制，保证输出顺序正确

## 3. 终端实例生命周期与 renderer 策略

- [x] 3.1 调整 `TerminalPanel` 与 `TerminalInstance` 的活跃/非活跃会话管理，使非活跃实例不再持续参与实时输出写入与尺寸观察
- [x] 3.2 在终端实例初始化路径中接入 WebGL renderer 尝试启用逻辑，并在不支持或初始化失败时自动回退默认 renderer
- [x] 3.3 补齐会话重新激活时的尺寸同步、待消费输出补写与焦点恢复，确保切回终端时状态正确

## 4. 验证与回归

- [x] 4.1 验证单 terminal、多 terminal、AI 流式输出和 TUI 高频重绘场景下的输出正确性与交互流畅性
- [x] 4.2 验证 WebGL renderer 开启、关闭、环境不支持和初始化失败时的行为均符合预期
- [x] 4.3 验证设置保存后对后续终端初始化生效，且不影响现有主题切换、复制选择、滚动回看与 session 切换能力
