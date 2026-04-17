## Context

当前终端栈是 `Electron + node-pty + xterm.js + React`。PTY 进程本身运行在本地，普通 shell 输入输出的基础链路已经足够短；真正拉低体感流畅性的，主要是渲染层和容器层的额外成本：主进程输出通过全局 IPC 广播到渲染层、每个 `TerminalInstance` 再自行过滤，所有 session 的 xterm 实例长期挂载，且每个实例都维护自己的输出监听、`ResizeObserver` 与 fit 逻辑。

这类结构在单 terminal、普通 stdout 输出下问题不明显，但在多 terminal 并存、AI 持续流式输出、TUI 高频重绘和布局变化时，会放大无效唤醒、IPC 次数、`xterm.write` 次数与布局测量成本。与此同时，xterm.js 本身提供可选的 WebGL renderer，但当前项目尚未建立受控启用、失败回退与设置持久化路径。

本次设计需要在不重写终端核心的前提下，降低现有架构的无效工作量，并为 renderer 策略提供可控的配置边界。

## Goals / Non-Goals

**Goals:**

- 将终端输出从“全局广播后过滤”改为“按 session 路由”，降低多 terminal 场景下的无效监听与唤醒成本
- 为高频输出场景增加微批次写入，减少 IPC 和 `xterm.write` 调用频率，同时保持可接受的交互延迟
- 为非活跃 terminal 建立降载策略，减少后台 terminal 对前台流畅性的影响
- 提供可控的 WebGL renderer 路径，在支持环境中尝试启用，并在失败时自动回退
- 为 renderer 策略提供设置面板入口和持久化配置，便于验证、回退与后续迭代

**Non-Goals:**

- 不将现有终端 core 替换为原生渲染实现，不尝试直接追平 Ghostty 的原生上限
- 不在本次引入新的终端协议栈，例如 Kitty graphics、同步输出协议支持或 shell integration 重构
- 不在本次实现终端 buffer 持久化、会话断线重连或跨窗口共享 terminal 状态
- 不在本次对设置面板做大规模视觉重构，仅补充必要配置入口

## Decisions

### Decision 1: 引入按 session 的输出路由与缓冲，而不是继续使用全局 `terminal:output`

**选择**：将主进程的终端输出链路改为 session-scoped 路由。每个 session 在主进程维护独立的输出缓冲和订阅状态，渲染层只接收自己关心的 session 输出；不再让所有 `TerminalInstance` 监听同一个全局输出事件后再本地过滤。

**理由**：
- 当前实现里，单个 noisy session 的输出会唤醒所有 terminal 实例，terminal 数量越多，放大效应越明显。
- 输出源头在主进程，先在主进程按 session 聚合和路由，能同时减少 IPC 次数与渲染层无效工作。
- session-scoped 路由为后续 inactive terminal 降载提供基础，因为只有主进程掌握“该 session 是否有前台消费者”。

**替代方案**：
- 保留全局 `terminal:output`，仅在渲染层做更细粒度 memo 或回调过滤。  
  放弃原因：这样仍然保留了无效 IPC 和无效监听器唤醒，只是把成本从 React 层往回压了一点，收益有限。

### Decision 2: 在主进程对 PTY 输出做微批次聚合

**选择**：为每个 session 建立短时间窗口的输出聚合队列，在单帧预算内批量 flush，而不是每个 `onData` chunk 都立即发送一次 IPC。

**理由**：
- PTY 输出通常以碎片 chunk 到达；直接逐 chunk 发送会增加 IPC 和 `xterm.write` 的调用频率。
- 批处理放在主进程比渲染层更划算，因为它能在进入 IPC 前先削减消息数量。
- 以单帧级别的微批次处理，通常能在不明显拉高交互延迟的前提下显著平滑流式输出场景。

**替代方案**：
- 在渲染层对 `terminal.write` 再做一次 batching。  
  放弃原因：这无法减少主进程到渲染进程的 IPC 次数，只能缓解一部分写入频率问题。

### Decision 3: 非活跃 terminal 采用“保留会话、降低前端工作量”的策略

**选择**：非活跃 session 保持 PTY 继续运行，但不再让后台 terminal 持续参与完整的前端实时写入与尺寸观察链路。主进程继续累计该 session 的输出缓冲；当 session 重新激活时，渲染层先接管该 session，再消费待写入缓冲并同步最新尺寸。

**理由**：
- 目标是减少后台 terminal 对前台交互的干扰，而不是暂停 PTY 本身。
- 让 inactive session 不继续走完整的 DOM/xterm 实时路径，能显著降低多 tab 场景中的主线程竞争。
- 激活时补写缓冲与同步尺寸，能在保持实现复杂度可控的同时维持会话连续性。

**替代方案**：
- 所有 xterm 实例始终实时写入，仅停止 focus 和 resize。  
  放弃原因：这仍然保留了后台终端的大部分解析和渲染成本，无法解决多 terminal 高输出场景下的主因。
- 在 renderer 中为每个 inactive session 维护 headless xterm。  
  放弃原因：复杂度过高，且仍然需要额外的前端解析路径，本次不做。

### Decision 4: WebGL renderer 采用“默认尝试启用 + 显式可关闭 + 失败自动回退”

**选择**：新增终端 renderer 偏好设置，使用布尔开关控制“是否优先尝试 WebGL renderer”。默认开启；在环境支持且设置允许时尝试加载 `@xterm/addon-webgl`，初始化失败时自动回退到默认 renderer，并保持 terminal 可用。

**理由**：
- WebGL renderer 是当前 xterm 栈内最现实的渲染提速路径之一，但稳定性受平台、驱动和布局场景影响。
- 默认尝试启用可以直接为多数支持环境带来收益；显式开关保证出现问题时能够快速回退。
- 自动回退比“启用失败直接终端不可用”更符合终端作为核心工作区的可靠性要求。

**替代方案**：
- 默认关闭，仅供手动实验。  
  放弃原因：会把性能收益锁在高级用户手里，无法成为默认体验优化。
- 彻底自动化，不提供任何设置入口。  
  放弃原因：一旦用户机器上出现兼容问题，将缺少明确的回退手段。

### Decision 5: renderer 配置进入现有设置面板并沿用 localStorage 持久化

**选择**：将 terminal renderer 偏好与现有 terminal 起始目录、隐藏文件夹等设置放在同一设置面板中，继续使用渲染层 localStorage 工具函数读写。

**理由**：
- 现有设置系统已经是本地持久化模型，本次不需要引入主进程配置文件或新的同步机制。
- renderer 偏好是本机、本用户、本应用窗口级别的体验配置，适合与其他 UI 设置并列。
- 沿用现有模式，改动面最小，也便于后续扩展更多 terminal 性能设置。

**替代方案**：
- 通过环境变量或启动参数控制 renderer。  
  放弃原因：对日常用户过重，不适合作为 GUI 应用内的常规回退路径。

## Risks / Trade-offs

- **[风险] session 输出缓冲增长过快导致内存压力上升** → 缓解：为每个 inactive session 设置待消费缓冲上限，并在达到上限时优先合并 chunk，避免无界增长
- **[风险] session 激活时一次性补写积压输出导致瞬时卡顿** → 缓解：激活补写也走批处理 flush，而不是同步一次性全量写入
- **[风险] WebGL renderer 在特定驱动或布局变化下出现闪烁或初始化失败** → 缓解：启用前做能力检测，失败时自动回退默认 renderer，并保留用户显式关闭入口
- **[权衡] inactive session 不再完全实时渲染，切回时可能出现一次补写和重绘** → 这是有意取舍，用切换瞬时成本换取长期多 tab 场景下的整体流畅性
- **[权衡] 输出路由从全局事件变为 session-scoped 后，preload 和 renderer API 会更复杂** → 这是必要的复杂度，用于换取可扩展的性能边界

## Migration Plan

1. 先引入 session-scoped 输出路由和微批次聚合，保持 renderer 行为不变，验证输出正确性与延迟
2. 再接入 inactive session 降载策略，验证多 tab、流式输出和 TUI 切换场景
3. 最后引入 WebGL renderer 与设置面板配置，验证启用、关闭和失败回退路径
4. 若任一阶段出现严重兼容问题，可通过保留的默认 renderer 路径与设置开关回退到非 WebGL 模式；若输出路由变更不稳定，可暂时保留旧事件通道作为过渡实现

## Open Questions

- 当前设计默认将“优先使用 WebGL renderer”设为开启；如果后续验证发现某类机器上失败率或视觉问题偏高，需要在实现前重新评估默认值
