## 1. 组件拆分与 TerminalInstance 提取

- [x] 1.1 创建 `src/components/TerminalInstance.tsx`，将当前 `TerminalPanel.tsx` 中 xterm.js 初始化、PTY 会话绑定、输入输出传输、尺寸同步的核心逻辑提取到此组件。组件接收 `sessionId` 和 `isActive` props
- [x] 1.2 `TerminalInstance` 支持通过 `isActive` prop 控制可见性（`visibility: hidden/visible`），非活跃时保持 DOM 挂载和 PTY 连接
- [x] 1.3 `TerminalInstance` 在从隐藏切换为可见时（`isActive` 从 false 变为 true），自动调用 `fitAddon.fit()` 重新适配容器尺寸

## 2. Tab 栏 UI 组件

- [x] 2.1 创建 `src/components/TerminalTabBar.tsx`，实现 Tab 栏组件：水平排列 Tab 标签 + 右侧新建按钮（`+`）
- [x] 2.2 每个 Tab 标签显示名称（"Terminal N"）和关闭按钮（`×`），活跃 Tab 有明显的视觉区分（底部边框高亮）
- [x] 2.3 Tab 栏样式适配白色主题，高度固定 36px

## 3. TerminalPanel 多 Tab 管理逻辑

- [x] 3.1 重构 `src/components/TerminalPanel.tsx` 为 Tab 容器组件，管理 Tab 列表状态（id、名称、sessionId）和活跃 Tab ID
- [x] 3.2 实现新建 Tab 逻辑：创建 PTY 会话，生成递增编号名称 "Terminal N"，将新 Tab 设为活跃
- [x] 3.3 实现 Tab 切换逻辑：点击 Tab 切换活跃 Tab，所有 TerminalInstance 保持挂载
- [x] 3.4 实现关闭 Tab 逻辑：销毁 PTY 会话，移除 Tab。关闭活跃 Tab 时自动切换到相邻 Tab（优先右侧），关闭最后一个 Tab 时自动创建新终端
- [x] 3.5 启动时默认创建一个 "Terminal 1" Tab

## 4. 集成验证

- [x] 4.1 验证 `npm start` 启动后终端面板正常显示 Tab 栏和默认终端
- [x] 4.2 验证新建、切换、关闭 Tab 功能正常工作，切换时终端状态完整保留
- [x] 4.3 验证 TypeScript 编译无类型错误
