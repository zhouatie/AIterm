## 1. 主题基础设施

- [x] 1.1 在 `index.css` 中定义 CSS 变量：`:root`（浅色默认值）和 `[data-theme="dark"]`（深色值），覆盖背景色、前景色、边框色、强调色、hover 色、选中色等全部语义化颜色
- [x] 1.2 在 `index.html` 的 `<head>` 中添加同步脚本，读取 localStorage 主题偏好并立即设置 `<html data-theme="...">`，防止 FOUC 闪烁
- [x] 1.3 创建 `src/ThemeContext.tsx`：实现 ThemeProvider 和 useTheme hook，管理主题模式状态（`light` / `dark` / `system`），提供切换方法
- [x] 1.4 ThemeProvider 中实现 `prefers-color-scheme` 媒体查询监听，`system` 模式下自动响应系统外观变化
- [x] 1.5 ThemeProvider 中实现 localStorage 持久化读写，首次使用默认为 `system` 模式
- [x] 1.6 ThemeProvider 中实现 `data-theme` 属性同步——当生效主题变化时更新 `document.documentElement.dataset.theme`

## 2. Electron 主进程与 Preload 适配

- [x] 2.1 在 `main.ts` 中注册 `theme:set` IPC handler，接收主题模式并设置 `nativeTheme.themeSource`
- [x] 2.2 在 `preload.ts` 中通过 contextBridge 暴露 `themeApi.setNativeTheme(mode)` 方法
- [x] 2.3 在 `global.d.ts` 中为 `window.themeApi` 添加 TypeScript 类型声明
- [x] 2.4 在 ThemeProvider 中调用 `window.themeApi.setNativeTheme()` 同步原生标题栏外观

## 3. 组件颜色迁移——硬编码值替换为 CSS 变量

- [ ] 3.1 迁移 `App.tsx`：将内联 style 中的背景色、文字色等替换为 `var(--color-xxx)` 引用
- [ ] 3.2 迁移 `SplitLayout.tsx`：分隔条颜色、hover 高亮色替换为主题变量
- [ ] 3.3 迁移 `PanelManager.tsx`：面板背景色、边框色替换为主题变量
- [ ] 3.4 迁移 `TerminalPanel.tsx`：终端面板背景色、标签栏颜色替换为主题变量
- [ ] 3.5 迁移 `TerminalTabBar.tsx`：Tab 按钮颜色、激活态、hover 态替换为主题变量
- [ ] 3.6 迁移 `FilePreviewPanel.tsx`：文件预览面板背景色、文字色、工具栏颜色替换为主题变量
- [ ] 3.7 迁移 `FileTree.tsx`：文件树节点颜色、选中高亮色、hover 色替换为主题变量
- [ ] 3.8 迁移 `MarkdownPreview.tsx`：预览区背景色、文字色替换为主题变量
- [ ] 3.9 迁移 `index.css`：`.markdown-body` 和 `.hljs` 样式中的硬编码颜色替换为 CSS 变量，深色模式下切换 highlight.js 配色

## 4. xterm.js 终端主题适配

- [ ] 4.1 在 `TerminalInstance.tsx` 中定义浅色和深色两套 xterm.js 终端配色方案（ITheme 对象）
- [ ] 4.2 使用 useTheme hook 获取当前主题，初始化终端时应用对应配色方案
- [ ] 4.3 监听主题变化，动态更新已有终端实例的 `options.theme`，无需销毁重建

## 5. 主题切换 UI

- [ ] 5.1 创建主题切换按钮组件，支持 `light → dark → system → light` 循环切换，按钮通过图标指示当前模式
- [ ] 5.2 将主题切换按钮放置在应用标题栏区域（与 sidebar toggle 同层），确保始终可见

## 6. 集成与验证

- [ ] 6.1 在 `renderer.tsx` 中用 ThemeProvider 包裹 App 组件
- [ ] 6.2 全局搜索残留的硬编码颜色值（`#fff`, `#1e1e1e`, `rgb(` 等），确保全部迁移完成
- [ ] 6.3 验证浅色模式下所有组件视觉效果与当前保持一致（无回归）
- [ ] 6.4 验证深色模式下所有组件的可读性和视觉一致性
- [ ] 6.5 验证主题切换时 xterm.js 终端配色即时更新
- [ ] 6.6 验证跟随系统模式下切换系统外观时自动响应
- [ ] 6.7 验证 localStorage 持久化——刷新或重启应用后主题偏好保持
