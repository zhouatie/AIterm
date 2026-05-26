## Context

AIterm 的终端会话由主进程通过 `node-pty` 创建。当前实现会把 Electron 主进程的 `process.env` 复制给 PTY，并设置 `SHELL`、`TERM`、`COLORTERM` 和通知相关变量。

在 `npm run start` 开发态，Electron 由用户终端启动，主进程天然继承了完整的 shell 环境；在 macOS 打包产物中，用户通常通过 Finder、Dock 或 LaunchServices 启动应用，主进程只获得 GUI 应用的精简环境，`PATH` 通常不包含 `/opt/homebrew/bin`、用户 shims 或其他 CLI 安装目录。内置 zsh 读取 `.zshrc` 后会尝试执行 `starship`、`rbenv`、`lazygit` 等命令，但这些命令不在 PATH 中，因此出现 command not found。

## Goals / Non-Goals

**Goals:**

- 打包后的 macOS App 创建 PTY 时使用接近用户登录 shell 的环境变量。
- 保持开发态行为稳定，避免破坏 `npm run start` 从外部终端继承的环境。
- 保留 AIterm 注入的 PTY 运行时变量，并保证这些变量优先于恢复出的 shell 环境。
- 登录 shell 环境解析失败时仍能创建终端，不让环境恢复失败变成终端不可用。

**Non-Goals:**

- 不实现应用内 PATH 配置 UI。
- 不修改用户的 `.zshrc`、`.zprofile` 或其他 shell 配置文件。
- 不为每个常见命令写硬编码兼容路径。
- 不改变终端 IPC 协议、终端渲染、tab 管理或 shell 选择策略。

## Decisions

### 通过登录 shell 快照恢复环境

实现一个主进程侧环境解析函数，在 macOS 下使用用户默认 shell 执行登录 shell 命令，输出环境快照，再解析为键值对。推荐形态是调用 shell 的登录模式并执行 `env` 或等价命令，而不是手工拼接 Homebrew 路径。

理由：

- 用户真实 PATH 可能来自 `.zprofile`、`.zshenv`、Homebrew、rbenv、pnpm、公司工具链等多个来源，硬编码少数目录会不断漏项。
- 登录 shell 快照与终端类应用的用户预期一致。
- 这个行为只影响 PTY 环境构造，不改变业务 IPC 边界。

备选方案：

- 在 `.zshrc` 里补 PATH：只能修当前用户机器，不能解决产品能力。
- 在代码里固定追加 `/opt/homebrew/bin`：能解决本次报错，但不能覆盖 rbenv shims、pnpm、bun、公司 CLI 等目录。
- 引入第三方 `fix-path` 类依赖：可以减少实现量，但当前需求不需要新增依赖。

### 对恢复结果做缓存

登录 shell 环境解析应在进程生命周期内缓存。首次创建终端时解析一次，后续 PTY 会话复用该环境。

理由：

- 解析登录 shell 可能触发用户 shell 配置，耗时不可预测。
- 每次创建 terminal tab 都重新执行登录 shell 会放大延迟和副作用。
- 用户通常期望同一次 App 运行期间环境稳定；修改 shell 配置后重启 App 再生效是可接受的。

### 环境合并以 AIterm 运行时变量优先

PTY 环境应按以下优先级合并：

1. 当前主进程 `process.env`
2. macOS 登录 shell 环境快照
3. AIterm 强制设置的运行时变量：`SHELL`、`TERM`、`COLORTERM`、通知相关变量

理由：

- 登录 shell 环境用于补足 GUI 启动缺失的 PATH 和工具链变量。
- AIterm 自身注入变量必须保持准确，不能被用户 shell 配置覆盖。
- 保留 `process.env` 可避免丢失 Electron 或系统注入的必要变量。

### 失败时软回退

登录 shell 环境解析应设置超时并捕获错误。失败时记录诊断信息，并使用当前 `process.env` 创建 PTY。

理由：

- 用户 shell 配置可能有交互命令、输出污染或长时间阻塞。
- 终端可用性优先于环境完整性。
- 失败回退后行为等价于当前实现，风险可控。

## Risks / Trade-offs

- [Risk] 用户 shell 配置在登录模式下输出非环境内容，导致解析失败或污染结果 → Mitigation: 使用可解析的分隔格式输出环境，解析失败时丢弃快照并回退。
- [Risk] 首次创建终端需要等待登录 shell 环境解析 → Mitigation: 加超时并缓存结果；超时后回退当前环境。
- [Risk] 某些用户的登录 shell 配置依赖交互式终端能力 → Mitigation: 仅执行环境快照命令，不进入交互会话；失败时不阻断终端创建。
- [Risk] 非 macOS 平台行为被误改 → Mitigation: 环境恢复逻辑仅在 `process.platform === 'darwin'` 时启用，其他平台保持现状。
