## 1. Electron 主进程配置

- [x] 1.1 在 `src/main.ts` 的 `webPreferences` 中新增 `webviewTag: true`

## 2. BrowserPanel 组件核心结构

- [x] 2.1 创建 `src/components/BrowserPanel.tsx`，定义组件 props（`isOpen`、`onClose`）和 Tab 数据结构（`BrowserTab` 接口）
- [x] 2.2 实现面板容器：绝对定位覆盖内容区，使用 `transform: translateY` + `transition` 实现滑出/收起动画（300ms）
- [x] 2.3 实现隐藏状态下 `pointer-events: none`，确保不遮挡下层交互

## 3. 多 Tab 管理

- [x] 3.1 实现 Tab 状态管理：`tabs` 数组和 `activeTabId`，首次打开默认创建一个加载 Google 首页的 Tab
- [x] 3.2 实现 Tab 栏 UI：显示各 Tab 标签（页面标题，过长截断省略）、关闭按钮、[+] 新建按钮
- [x] 3.3 实现新建 Tab：点击 [+] 创建新 Tab 并加载 `https://www.google.com`，自动激活
- [x] 3.4 实现关闭 Tab：销毁对应 webview，关闭活跃 Tab 时自动激活相邻 Tab
- [x] 3.5 实现关闭最后一个 Tab 时显示空状态页面（像素风 hello world + New Tab / Close 按钮）
- [x] 3.6 实现切换 Tab：点击非活跃 Tab 时切换显示对应的 webview（`display: none/block`）

## 4. 地址栏与导航

- [x] 4.1 实现导航栏 UI：后退、前进、刷新按钮 + 地址栏输入框 + 关闭面板按钮
- [x] 4.2 实现地址栏输入处理：URL 检测（含 `://` 或 `.` 后缀）直接导航，无协议自动补 `https://`，非 URL 走 Google 搜索
- [x] 4.3 监听 webview 的 `did-navigate`/`did-navigate-in-page` 事件，更新地址栏显示当前 URL
- [x] 4.4 监听 webview 的 `page-title-updated` 事件，更新 Tab 标签标题
- [x] 4.5 实现后退/前进按钮：调用 webview 的 `goBack()`/`goForward()`，根据 `canGoBack`/`canGoForward` 控制禁用状态
- [x] 4.6 实现刷新按钮：调用 webview 的 `reload()`

## 5. webview 配置与弹窗处理

- [x] 5.1 配置 webview 使用 `partition="persist:browser"` 隔离 session
- [x] 5.2 监听 webview 的 `new-window` 事件，将弹窗请求（`target="_blank"`、`window.open`）在浏览器面板中以新 Tab 打开

## 6. 标题栏按钮与快捷键

- [x] 6.1 在 `src/App.tsx` 标题栏 Live View 按钮右侧新增 🌐 按钮（使用 `Globe` 图标），点击切换 `isBrowserOpen` 状态
- [x] 6.2 在 `src/App.tsx` 挂载 `<BrowserPanel isOpen={isBrowserOpen} onClose={...} />`，定位在内容区容器内
- [x] 6.3 使用 `registerAction` 注册 `toggle-browser` 动作，默认绑定 `Cmd+L`，切换浏览器面板显示/隐藏
