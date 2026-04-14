## Why

应用当前只有终端和文件预览功能，用户在开发过程中需要频繁切换到外部浏览器查看页面、查文档或搜索。在标题栏增加一个内嵌浏览器面板，可以让用户在同一个窗口内完成浏览和开发，减少上下文切换。后续还将支持 AI 控制浏览器，为自动化工作流打基础。

## What Changes

- 标题栏新增 🌐 按钮（紧挨 Live View 按钮右侧），点击切换浏览器面板的打开/关闭
- 新增 `Cmd+L` 快捷键，切换浏览器面板显示
- 新增 BrowserPanel 组件：绝对定位覆盖内容区（文件树 + 终端），从上往下滑出，关闭时从下往上收起
- 浏览器面板支持多 Tab：新建 Tab、关闭 Tab、切换 Tab
- 每个 Tab 使用 Electron `<webview>` 标签渲染网页内容
- 新 Tab 默认打开 Google 搜索页
- 地址栏支持 URL 直接导航，输入非 URL 文字时走搜索引擎搜索
- 导航栏包含后退、前进、刷新按钮
- Electron 主进程配置启用 `webviewTag: true`

## Capabilities

### New Capabilities
- `browser-panel`: 内嵌浏览器面板，包含多 Tab 管理、地址栏导航、webview 渲染、滑出/收起动画

### Modified Capabilities
- `keyboard-shortcuts`: 新增 `Cmd+L` 快捷键绑定，用于切换浏览器面板
- `electron-shell`: 主进程 webPreferences 新增 `webviewTag: true` 配置

## Impact

- **新增文件**: `src/components/BrowserPanel.tsx` — 浏览器面板组件
- **修改文件**:
  - `src/App.tsx` — 新增 🌐 按钮、BrowserPanel 挂载、isBrowserOpen 状态管理
  - `src/main.ts` — webPreferences 新增 `webviewTag: true`
  - 快捷键相关配置 — 注册 `Cmd+L`
- **新增依赖**: 无（`<webview>` 是 Electron 内置标签）
- **安全影响**: 启用 `webviewTag` 允许渲染进程创建独立进程的 webview，需注意 webview 的 `webpreferences` 和 `partition` 配置以控制权限
