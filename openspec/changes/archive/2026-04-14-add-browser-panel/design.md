## Context

当前应用（AIterm）是一个基于 Electron 41 + React 19 + TypeScript 的终端工作台。窗口布局为：
- 顶部标题栏（自定义 `titleBarStyle: hiddenInset`）包含侧栏切换、主题切换、Live View 按钮
- 内容区使用 `SplitLayout` 分为左侧文件树预览和右侧终端面板

主进程配置 `contextIsolation: true`、`nodeIntegration: false`，安全策略较严格。目前没有任何 `<webview>` 使用。

应用已有快捷键系统（`ShortcutContext` + `useKeyboardShortcuts`），通过 `registerAction` 注册动作。

## Goals / Non-Goals

**Goals:**
- 在标题栏 Live View 按钮旁新增 🌐 按钮，点击或 `Cmd+L` 切换浏览器面板
- 浏览器面板从上往下滑出，完全覆盖内容区（文件树 + 终端），关闭时从下往上收起
- 支持多 Tab 浏览：新建、关闭、切换，新 Tab 默认打开 Google
- 地址栏支持 URL 导航和搜索引擎搜索
- 导航栏包含后退、前进、刷新按钮

**Non-Goals:**
- 本次不考虑 rrweb 录制浏览器内容
- 本次不实现 AI 控制浏览器的 API（仅预留结构）
- 不实现书签、历史记录、下载管理等高级浏览器功能
- 不实现 Tab 持久化（关闭应用后不保存 Tab 状态）

## Decisions

### 1. 使用 `<webview>` 嵌入网页

**选择**: Electron `<webview>` 标签

**原因**:
- `<webview>` 是 DOM 元素，可直接用 CSS transition 做滑动动画
- 每个 Tab 对应一个 `<webview>` 实例，通过 `display: none/block` 切换，避免页面重载
- 独立进程隔离，外部网页崩溃不会影响主应用

**备选方案**:
- `BrowserView` / `WebContentsView`: 不在 DOM 中，无法用 CSS 控制动画和布局，多 Tab 管理复杂
- `<iframe>`: 受同源策略和 CSP 限制，无法加载大多数外部网站

**配置变更**: `main.ts` 的 `webPreferences` 新增 `webviewTag: true`

### 2. 覆盖式面板 + CSS 动画

**选择**: 绝对定位覆盖 + `transform: translateY` 动画

**实现方式**:
```
BrowserPanel 始终挂载在 DOM 中（不销毁），通过 CSS 控制可见性:

打开状态:  transform: translateY(0);     opacity: 1;
关闭状态:  transform: translateY(-100%); opacity: 0; pointer-events: none;
过渡动画:  transition: transform 300ms ease, opacity 300ms ease;
```

**原因**:
- 面板始终挂载避免 webview 重新创建和页面重载
- `translateY(-100%)` 让面板滑到视口上方，不影响下层布局
- `pointer-events: none` 确保关闭时不遮挡下层交互

**定位**: `position: absolute; top: 0; left: 0; right: 0; bottom: 0;` 相对于内容区容器，高度等同内容区

### 3. Tab 状态管理方案

**选择**: BrowserPanel 内部 `useState` 管理

**数据结构**:
```typescript
interface BrowserTab {
  id: string;           // 唯一标识 (nanoid/crypto.randomUUID)
  url: string;          // 当前 URL
  title: string;        // 页面标题（来自 webview page-title-updated 事件）
  isLoading: boolean;   // 加载状态
  canGoBack: boolean;   // 可后退
  canGoForward: boolean; // 可前进
}

// 组件状态
const [tabs, setTabs] = useState<BrowserTab[]>([initialTab]);
const [activeTabId, setActiveTabId] = useState<string>(initialTab.id);
```

**原因**: 浏览器面板是独立功能，不需要全局状态管理，组件内部状态足够

### 4. 地址栏输入处理

**选择**: URL 检测 + Google 搜索兜底

**逻辑**:
- 输入内容匹配 URL 格式（含 `://` 或 `.` 后缀如 `google.com`）→ 直接导航
- 没有协议前缀的 URL（如 `google.com`）→ 自动补全 `https://`
- 其他输入 → 用 `https://www.google.com/search?q=` 拼接搜索

### 5. 快捷键注册

**选择**: 复用现有 `registerAction` 机制

**实现**: 在 `AppContent` 中注册 `toggle-browser` 动作，绑定到 `Cmd+L`，与现有 `toggle-file-tree` 模式一致

### 6. webview 安全配置

**选择**: 最小权限原则

```html
<webview
  src={url}
  partition="persist:browser"
  allowpopups
/>
```

- 使用 `partition` 隔离浏览器面板的 session/cookie 与主应用
- 不启用 `nodeintegration`、`nodeintegrationinsubframes`
- 允许弹窗（`allowpopups`）以支持 OAuth 等流程，弹窗在新 Tab 中打开

## Risks / Trade-offs

- **内存占用**: 每个 `<webview>` 是独立进程，10 个 Tab 约额外占用 500MB-1GB 内存 → 暂不限制 Tab 数量，后续可根据反馈加上限或懒销毁策略
- **`webviewTag` 安全面**: 启用后渲染进程可创建 webview → 通过 `partition` 隔离 session，不开启 `nodeIntegration`，控制风险在可接受范围
- **动画性能**: 多个 `<webview>` 实例可能影响 CSS 动画流畅度 → 非活跃 Tab 的 webview 用 `display: none` 减少渲染开销
- **某些网站限制**: 部分网站可能检测 Electron webview 环境并阻止访问 → 不在本次范围内处理，后续可考虑自定义 User-Agent
