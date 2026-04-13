## 1. 主题语义与基础样式

- [x] 1.1 扩展 `src/index.css` 中的主题变量，补齐窗口 chrome、导航表面、内容层、柔和选中态、细描边、阴影和 attention 提示所需的语义 token
- [x] 1.2 调整全局基础样式与 `src/components/TerminalInstance.css`，让终端容器背景和工作台表面层次使用新的主题语义

## 2. 窗口 chrome 与主分栏优化

- [x] 2.1 重构 `src/App.tsx` 的标题栏区域样式，使文件树开关、主题切换控件与窗口 chrome 保持统一视觉语言
- [x] 2.2 调整 `src/components/SplitLayout.tsx` 的主分栏边界、hover 和拖拽反馈，使左右区域分隔更细腻且不破坏交互清晰度

## 3. Terminal 导航视觉重塑

- [x] 3.1 优化 `src/components/TerminalPanel.tsx` 的 terminal sidebar 容器、header 和 footer 样式，建立统一导航表面
- [x] 3.2 优化 workspace 行与 session 行的层级、字重、间距、hover 和 active 表现，减少当前高对比工具感
- [x] 3.3 调整行内新增/关闭按钮、attention 提示和收起/展开入口的视觉规则，确保状态提示协调且布局稳定

## 4. 结果校验

- [ ] 4.1 在浅色、深色和跟随系统模式下检查 terminal workbench 的标题栏、分栏、sidebar 和 terminal 内容区层级是否一致
- [ ] 4.2 手动验证 workspace / terminal tab 的创建、切换、重命名、关闭以及侧边栏收起展开过程中视觉状态无明显回退
