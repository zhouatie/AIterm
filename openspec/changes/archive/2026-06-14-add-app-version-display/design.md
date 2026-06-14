## Context

AIterm 当前通过 Electron Forge 打包，版本号由 `package.json` 的 `version` 驱动，发布流程也要求 tag 与该版本一致。渲染进程启用了 `contextIsolation` 且禁用了 `nodeIntegration`，因此客户端 UI 不应直接读取 Node.js 模块或 `package.json`。

当前主窗口已经有自定义 title bar / window chrome，用于放置文件树开关、主题切换和 Live View 入口。版本号属于窗口级元信息，适合以低干扰文本显示在该区域，而不是新增独立弹窗或设置页入口。

## Goals / Non-Goals

**Goals:**

- 在主窗口客户端 chrome 中展示当前运行的 AIterm 版本号。
- 版本号由 Electron runtime 提供，避免渲染层硬编码。
- 通过 preload 暴露只读应用元信息，保持现有安全边界。
- 保持标题栏布局稳定，不影响拖拽区域和现有图标按钮。

**Non-Goals:**

- 不实现应用内自动更新。
- 不联网请求 GitHub Release，也不判断当前版本是否最新。
- 不改变发布包命名、tag 校验或安装流程。
- 不新增设置面板的页面结构。

## Decisions

### Decision: 以 Electron runtime 作为版本来源

实现时在主进程注册 `app:get-info` IPC handler，返回 `{ name, version }`。`version` 使用 `app.getVersion()`，`name` 使用 `app.getName()` 或等价运行时应用名。

**理由：** Electron 打包后的应用元信息已经来自 package metadata。主进程读取 runtime 元信息比在渲染层导入 `package.json` 更符合当前安全模型，也能覆盖 packaged app 的真实版本。

**替代方案：**

- 在 Vite 构建时注入版本常量：实现简单，但开发和打包链路需要新增 define 配置，且容易形成第二个版本来源。
- 在渲染进程读取静态 JSON：违反当前 Node API 隔离方向，也会增加资源包含和路径处理复杂度。

### Decision: 通过 preload 暴露只读 `appInfoApi`

preload 定义 `AppInfoApi`，通过 `contextBridge.exposeInMainWorld('appInfoApi', ...)` 暴露 `get()` 方法。渲染层只调用该方法，不直接访问 `ipcRenderer`。

**理由：** 项目现有 `themeApi`、`liveViewApi`、`tabStateApi` 都使用 preload 作为边界。新增应用元信息 API 应保持同一模式，且只读 API 的行为面较小。

**替代方案：**

- 复用已有 `themeApi` 或 `fileApi`：会混淆 API 职责。
- 将版本号作为窗口初始 HTML 注入：需要改渲染入口加载策略，不如 IPC 清晰。

### Decision: 在 title bar 右侧显示版本号

在 `App.tsx` 的 title bar 中添加一个非交互版本标记，使用 `margin-left: auto` 或等价布局推到右侧。文本建议为 `AIterm v1.0.4` 或 `v1.0.4`，并设置 `title` 表达“当前版本”。

**理由：** title bar 是用户启动后立即可见的客户端面板区域，版本信息属于窗口级状态，不应占用终端或文件预览工作区。

**替代方案：**

- 放在设置面板 footer：实现也可行，但用户必须打开设置才能看到。
- 放在终端面板内：会和终端 session 状态混在一起，且不属于单个终端 tab。

## Risks / Trade-offs

- [Risk] title bar 可用宽度不足导致版本号挤压现有控件 -> Mitigation: 版本标记使用固定最大宽度、`white-space: nowrap`、小字号，并允许在极窄窗口隐藏或省略。
- [Risk] IPC 读取失败导致 UI 报错 -> Mitigation: 渲染层捕获失败，失败时不显示版本号，不阻塞主界面。
- [Risk] 用户误以为应用已具备自动检查最新版本能力 -> Mitigation: UI 文案只表达“当前版本”，不显示“最新”或“可更新”等状态。

## Migration Plan

无需数据迁移。实现可以随普通应用版本发布；回滚时移除新增 IPC/preload API 和 title bar 版本标记即可，不影响已有本地配置。

## Open Questions

无。
