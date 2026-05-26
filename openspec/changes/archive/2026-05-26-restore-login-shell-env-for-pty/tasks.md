## 1. 环境恢复实现

- [x] 1.1 在主进程终端环境构造代码中新增 macOS 登录 shell 环境快照解析函数
- [x] 1.2 为环境快照解析添加超时、错误捕获和进程生命周期缓存
- [x] 1.3 使用可解析的环境输出格式，避免用户 shell 启动输出污染 PATH 解析

## 2. PTY 环境接入

- [x] 2.1 调整 PTY 会话创建流程，使其在创建 node-pty 前合并当前进程环境和登录 shell 环境
- [x] 2.2 确保 `SHELL`、`TERM`、`COLORTERM` 和 AIterm 通知相关变量在最终 PTY 环境中保持最高优先级
- [x] 2.3 将环境恢复逻辑限制在 macOS，非 macOS 平台保持现有行为

## 3. 验证

- [x] 3.1 验证 `npm run start` 开发态仍能正常创建终端并继承当前环境
- [x] 3.2 验证 `npm run package` 后的 macOS 产物中，终端可找到 `/opt/homebrew/bin` 下的 CLI（如 `starship`、`rbenv`、`lazygit`）
- [x] 3.3 验证登录 shell 环境解析失败或超时时，终端仍能创建并使用当前进程环境回退
