## 1. 项目初始化

- [x] 1.1 使用 Electron Forge + Vite + TypeScript 模板初始化项目
- [x] 1.2 安装核心依赖：xterm, xterm-addon-fit, xterm-addon-web-links, node-pty
- [x] 1.3 配置 node-pty 的 native addon rebuild（@electron/rebuild）
- [x] 1.4 安装并配置 React + ReactDOM + @types/react
- [x] 1.5 验证 `npm start` 能正常启动 Electron 窗口

## 2. Electron 主进程基座

- [x] 2.1 配置 BrowserWindow：默认尺寸、contextIsolation 启用、nodeIntegration 禁用
- [x] 2.2 实现 preload 脚本：通过 contextBridge 暴露终端相关 API（create、input、resize、dispose、onOutput、onExit）
- [x] 2.3 实现 macOS 生命周期处理：关闭所有窗口不退出、dock 点击重建窗口
- [x] 2.4 实现应用退出时清理所有活跃 PTY 进程

## 3. 终端后端（主进程）

- [x] 3.1 实现 PTY 管理模块：创建 PTY 实例（spawn 用户默认 shell、继承环境变量）
- [x] 3.2 注册 IPC handler：`terminal:create` — 创建 PTY 并返回会话 ID
- [x] 3.3 注册 IPC handler：`terminal:input` — 将用户输入写入 PTY stdin
- [x] 3.4 注册 IPC handler：`terminal:resize` — 同步终端 cols/rows 到 PTY
- [x] 3.5 注册 IPC handler：`terminal:dispose` — 终止 PTY 进程并释放资源
- [x] 3.6 实现 PTY stdout 到渲染进程的事件推送（`terminal:output`）
- [x] 3.7 实现 PTY 退出事件通知（`terminal:exit`）

## 4. 终端前端（渲染进程）

- [x] 4.1 创建 React 根组件 App，挂载到渲染进程页面
- [x] 4.2 实现 TerminalPanel 组件：初始化 xterm.js 实例并挂载到 DOM
- [x] 4.3 集成 xterm-addon-fit：终端自动适配容器尺寸
- [x] 4.4 连接 IPC：用户输入 → terminal:input，terminal:output → xterm.write
- [x] 4.5 监听容器尺寸变化，调用 fit 并通过 terminal:resize 同步到主进程
- [x] 4.6 处理 shell 退出事件（terminal:exit），在终端中显示提示信息
- [x] 4.7 基础样式：终端面板占满窗口可用空间，背景色/字体合理

## 5. 面板布局系统

- [x] 5.1 实现 PanelManager：维护面板注册表和 activePanel 状态
- [x] 5.2 实现面板注册接口：通过 id + React 组件注册面板
- [x] 5.3 将 TerminalPanel 注册为默认面板
- [x] 5.4 实现面板切换逻辑：切换时保留非活跃面板状态（不卸载组件）
- [x] 5.5 绑定快捷键切换面板（预留，当前只有一个面板时不触发切换）

## 6. 端到端验证

- [x] 6.1 验证启动后终端面板自动创建 PTY 会话并可交互
- [x] 6.2 验证运行交互式命令（如 vim、htop）时终端行为正常
- [x] 6.3 验证 Ctrl+C / Ctrl+D 等控制键正确传输
- [x] 6.4 验证窗口缩放时终端正确重新适配
- [x] 6.5 验证输入 `exit` 后 shell 退出通知正常
- [x] 6.6 验证关闭窗口时 PTY 进程被正确清理（无孤儿进程）
