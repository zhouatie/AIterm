## 1. 重构侧边栏容器为双层 div 结构

- [x] 1.1 在 `TerminalPanel.tsx` 侧边栏容器（约 934 行）拆分为外层宽度控制 div 和内层内容 div，外层保留 `width`、`flexShrink: 0`、`overflow: hidden`，内层承载原有侧边栏内容（header、workspace 列表、footer）
- [x] 1.2 将外层 div 的 `transition` 从 `width 0.18s ease` 改为：收起时 `width 0s 180ms`（延迟至动画结束后瞬间归零），展开时 `width 0s`（立即恢复宽度）
- [x] 1.3 为内层 div 添加 `transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)'` 和 `transition: transform 180ms ease`，驱动 compositor-only 滑出/滑入动画

## 2. 样式与边框适配

- [x] 2.1 将 `borderRight`、`background`、`boxShadow`、`backdropFilter` 等视觉样式从外层 div 移至内层 div，确保动画滑出时视觉效果随内容一起移走
- [x] 2.2 确认收起态下 `borderRight: 'none'` 的判断在 width 延迟归零后仍正确生效，侧边栏完全收起后不残留 1px 边框

## 3. 验证与回归

- [x] 3.1 手动验证收起/展开动画流畅度——使用 DevTools Performance 面板确认动画期间无 layout reflow 事件
- [x] 3.2 验证收起后终端内容区正确扩展至全宽，展开后终端内容区正确收缩
- [x] 3.3 验证收起/展开不影响现有功能：workspace 列表状态保留、活跃 session 不变、快捷键正常工作
- [x] 3.4 验证浮动展开按钮在收起态正确显示、可点击
