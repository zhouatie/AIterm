## 1. Terminal Sidebar 布局调整

- [x] 1.1 在 `TerminalPanel.tsx` 中拆分 terminal sidebar toggle 控件的展开态与收起态渲染位置
- [x] 1.2 为展开态 sidebar 增加内嵌 footer 区域，并将收起按钮移动到 tab 面板内侧
- [x] 1.3 保持 workspace 列表区域独立滚动，避免 footer 按钮挤压或覆盖列表内容

## 2. 收起入口与交互验证

- [x] 2.1 为收起态保留稳定可点击的展开入口，确保不遮挡 terminal 内容区的主要可视区域
- [x] 2.2 验证收起/展开后 active session、workspace 展开状态与终端内容渲染保持正确
- [ ] 2.3 手动检查普通终端输出与 TUI 场景，确认 toggle 控件不再覆盖 terminal 内容
