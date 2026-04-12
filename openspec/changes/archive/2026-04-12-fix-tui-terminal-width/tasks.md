## 1. 修改终端容器布局

- [x] 1.1 将 `TerminalInstance.tsx` 中容器样式的 `left: 8` 改为 `left: 0`，使容器占满父元素完整宽度
- [x] 1.2 确认容器样式 `right: 0`、`top: 0`、`bottom: 0` 保持不变，终端容器完全贴合父元素四边

## 2. 替换 FitAddon 列数计算（根因修复）

- [x] 2.1 移除 `paddingLeft: '4px'` 的临时方案
- [x] 2.2 编写 `fitTerminal()` 自定义函数，通过测量 `.xterm-viewport` 的 `offsetWidth - clientWidth` 获取实际滚动条宽度（macOS overlay = 0px），替代 FitAddon 硬编码的 `DEFAULT_SCROLL_BAR_WIDTH`（~14px）
- [x] 2.3 替换文件中所有 `fitAddon.fit()` 调用为 `fitTerminal()` 调用（初始化、ResizeObserver、窗口 resize、isActive re-fit）
- [x] 2.4 移除不再使用的 `FitAddon` import 和 `fitAddonRef`
- [x] 2.5 TypeScript 编译通过，无类型错误

## 3. 验证与回归测试

- [ ] 3.1 启动应用，运行全屏 TUI 程序（如 htop、vim 或 CodeMaker CLI），确认内容占满终端面板完整宽度
- [ ] 3.2 测试窗口缩放、SplitLayout 拖拽调整宽度时，终端能正确 refit，不出现宽度溢出或空白
- [ ] 3.3 测试多标签页场景，切换标签页后终端宽度正确填满
- [ ] 3.4 测试深色/浅色主题切换后终端宽度和内边距显示正常
