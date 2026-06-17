## Context

AIterm 是 Electron + React 工作台。主窗口标题栏已经在 `App.tsx` 中集中渲染文件树开关、主题切换、Live View 和更新检查入口；这些按钮共享 28px icon-only 样式，并通过 `WebkitAppRegion: 'no-drag'` 保证标题栏拖拽区域内的按钮可点击。主内容区由左侧文件预览和右侧 `PanelContainer` 组成，右侧目前主要承载 terminal 面板。

本次变更要增加的是开发者临时工具，而不是新的长期工作区面板。JSON 格式化、二维码生成和 Mermaid 预览都以用户输入文本为核心，不需要主进程能力，也不应该打断 terminal 与文件预览的上下文。

## Goals / Non-Goals

**Goals:**
- 在标题栏提供一个清晰的“开发者工具” icon-only 入口，避免把同类工具拆散成多个标题栏按钮。
- 用一个大尺寸统一工具面板承载三个工具，支持工具间切换、关闭和状态保留。
- 所有处理尽量在 renderer 本地完成，不引入新的 IPC 面。
- QR 生成复用现有 `qrcode` 依赖，Mermaid 预览使用本地 `mermaid` 依赖。
- 工具面板视觉遵循现有主题变量、标题栏按钮反馈和桌面窗口 chrome 层级。

**Non-Goals:**
- 不新增应用级快捷键配置项。
- 不把工具输入内容写入文件、终端或持久化存储。
- 不支持 JSON 修复、JSON Schema 校验、二维码批量生成或 Mermaid 编辑器级功能。
- 不改变 Live View 的二维码行为；通用二维码工具与 Live View 保持独立。

## Decisions

### 1. 使用覆盖式工具面板，而不是注册为右侧主面板

点击顶部工具 icon 时，在当前工作台之上显示一个覆盖式 `UtilityToolsPanel`。工具面板内提供 JSON、二维码和 Mermaid 标签，首次打开默认显示 JSON，后续在同一 renderer 会话内恢复上次激活的工具。面板关闭后不卸载状态，保留本次输入、输出和错误信息。

选择原因：
- 这些工具是短时辅助操作，不应替换 terminal 主面板。
- 复用 `PanelManager` 会把右侧主区域切到工具页，增加用户回到 terminal 的成本。
- 覆盖式面板可以复用 Live View / SettingsPanel 类似的关闭交互和主题表达。

备选方案：
- 注册为 `PanelManager` 面板：状态保留天然简单，但会打断 terminal 视图。
- 三个独立弹窗：实现直观，但状态、样式和焦点管理会重复。

### 2. JSON 工具使用原生 JSON API

JSON 工具使用 `JSON.parse` 校验输入；格式化输出使用 `JSON.stringify(value, null, 2)`，压缩输出使用 `JSON.stringify(value)`。解析失败时展示错误消息，并保留输入和上一次成功输出，避免失败操作破坏用户文本。

选择原因：
- 原生 API 足以覆盖格式化和压缩，不需要新增依赖。
- 错误语义与浏览器运行时一致，易于调试。

备选方案：
- 引入更宽容的 JSON5/修复库：会扩大功能范围，也可能让“非法 JSON”行为变得不明确。

### 3. 二维码工具复用 `qrcode` 并生成 SVG

二维码工具沿用 `LiveViewPanel` 已使用的 `QRCode.toString(..., { type: 'svg' })` 路径。输入为空时显示空状态；生成失败时显示错误；生成成功后显示固定尺寸的 SVG 预览，并提供复制输入文本和复制 SVG 的能力。

选择原因：
- 项目已有 `qrcode` 与类型依赖，避免新增 QR 相关包。
- SVG 在 Electron renderer 中显示清晰，也便于复制或后续扩展下载。

备选方案：
- 生成 canvas/PNG：适合下载图片，但当前需求只要求前端生成与预览，SVG 更简单。

### 4. Mermaid 使用本地依赖并启用严格安全配置

Mermaid 工具新增 `mermaid` 前端依赖，在 renderer 中初始化并渲染 SVG。初始化配置使用 `securityLevel: 'strict'`，主题根据当前 AIterm 主题选择 `default` 或 `dark`。每次输入变化时使用唯一 render id，避免多个预览实例互相冲突。

选择原因：
- 不依赖 CDN，保证桌面应用离线可用。
- Mermaid 源码可能包含链接或 HTML，严格安全配置能降低注入风险。
- 本地依赖能被 Vite 打包，交付路径稳定。

备选方案：
- 使用外部在线 Mermaid 渲染服务：会引入网络依赖和隐私风险。
- 手写 Mermaid 解析：范围过大，且不应重复成熟库能力。

### 5. 顶部入口保持 icon-only，使用 tooltip 表达语义

标题栏新增一个开发者工具按钮，沿用 `toggleButtonStyle`、`applyChromeButtonHover` 和 `resetChromeButtonHover` 的交互规则。按钮只显示工具类图标，`title` / `aria-label` 表达“开发者工具”语义，并保证按钮区域为 `no-drag`。

选择原因：
- 与现有标题栏控件一致。
- JSON、二维码和 Mermaid 都属于同一类临时工具，合并入口比三个并列按钮更符合信息架构。
- 避免标题栏工具按钮过多，压缩版本号和更新状态空间。

备选方案：
- 三个并列工具按钮：打开对应工具更直接，但标题栏变拥挤，且把同类工具拆散。
- 使用一个“工具”下拉菜单：标题栏同样省空间，但菜单无法承载输入和预览状态，仍需要再打开面板。

### 6. 工具面板使用更大的工作区尺寸

`UtilityToolsPanel` 应使用接近主窗口可用区域的大尺寸覆盖层，并采用左右分栏：左侧输入，右侧输出或预览。面板宽高应优先满足 Mermaid 图表预览可读性，在窗口空间足够时避免沿用 Live View 那类小卡片尺寸。

选择原因：
- JSON 和 Mermaid 都需要较大的文本输入区，Mermaid 还需要足够大的图表预览区。
- 小弹窗会让 Mermaid 图表默认状态下难以辨认，用户还需要额外缩放或滚动。
- 大面板仍然是覆盖式交互，不会销毁底层 terminal 和文件预览状态。

备选方案：
- 小型弹窗：实现简单，但 Mermaid 图表不可读。
- 全屏替换主面板：空间最大，但会打断 terminal 工作区上下文。

## Risks / Trade-offs

- [Risk] Mermaid 包体积增加，可能影响 renderer 打包体积。→ Mitigation：只在工具面板组件中引入 Mermaid，必要时后续改为动态 import。
- [Risk] Mermaid 渲染异步完成顺序可能与当前输入不一致。→ Mitigation：渲染时记录输入版本或 render id，只采纳最新一次渲染结果。
- [Risk] 工具覆盖层变大后更明显地遮挡正在查看的终端输出。→ Mitigation：面板支持关闭，且不切换或销毁底层终端状态。
- [Risk] 单一工具入口降低 JSON、二维码、Mermaid 的直接可发现性。→ Mitigation：工具按钮 tooltip 明确表达“开发者工具”，面板打开后首屏展示三个工具标签。
- [Risk] 标题栏新增工具入口后在窄窗口挤压版本号区域。→ Mitigation：只新增一个工具入口，版本号区域继续保持 `margin-left: auto`、省略号和收缩规则。
- [Risk] 使用 `dangerouslySetInnerHTML` 展示 QR/Mermaid SVG 有注入风险。→ Mitigation：QR SVG 来自本地库；Mermaid 使用 strict securityLevel，并只把库生成的 SVG 放入预览容器。

## Migration Plan

1. 新增大尺寸工具面板组件和必要样式，不改变既有终端、文件预览、Live View 行为。
2. 更新 `package.json` / lockfile，引入 `mermaid`。
3. 将顶部栏新增单一工具 icon 入口接入工具面板状态。
4. 通过 lint 和本地启动验证标题栏、JSON、QR、Mermaid 交互。

Rollback 策略：移除新增工具入口、工具面板组件和 `mermaid` 依赖即可恢复现状。现有数据和 IPC 不需要迁移。

## Open Questions

- Mermaid 预览是否需要第一版支持导出 SVG/PNG？当前建议不纳入首版，只保证预览和错误展示。
- 工具面板是否需要记住上次激活工具跨应用重启？当前建议只保留当前 renderer 会话状态，不持久化。
