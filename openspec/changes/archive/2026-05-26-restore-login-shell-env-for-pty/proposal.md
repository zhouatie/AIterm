## Why

打包后的 macOS GUI 应用从 Finder/LaunchServices 启动时只能拿到精简环境，导致内置终端的 `PATH` 缺少 Homebrew 和用户工具目录。结果是同一套终端功能在 `npm run start` 下可用，但在打包产物中出现 `starship`、`rbenv`、`lazygit` 等命令找不到。

## What Changes

- 在创建 PTY 会话前，为 macOS 打包应用恢复用户登录 shell 可见的环境变量，尤其是 `PATH`。
- PTY 环境继续保留 AIterm 注入的终端会话变量、`TERM`、`COLORTERM` 等运行时变量。
- 当登录 shell 环境解析失败时，终端仍可创建，并使用当前进程环境作为回退。
- 不引入用户配置项，不要求用户手动修改 `.zshrc` 或 shell 配置。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `embedded-terminal`: PTY 创建时的环境继承要求从“继承当前系统环境变量”扩展为“在 macOS GUI 打包启动场景下恢复用户登录 shell 环境后再创建 PTY”。

## Impact

- 主要影响 [src/pty-manager.ts](/Users/zhoushitie/My/AItem/src/pty-manager.ts) 中 PTY 环境构造与会话创建逻辑。
- 可能影响主进程启动后的首个终端创建耗时，需要避免明显阻塞 UI。
- 不改变渲染进程 IPC 协议，不新增依赖，不改变终端输入输出链路。
