## Why

当前终端依赖 xterm.js 的有限 scrollback 保存可回看的内容，agent 对话变长后早期输出会被裁剪，用户即使滚动到顶部也无法看到完整历史。需要把“完整会话记录”从实时终端缓冲区中拆出来，提供可追溯、可搜索、可跨重启查看的 session transcript。

## What Changes

- 新增 terminal session transcript 能力，对每个终端会话追加保存完整输出记录。
- 提供从当前 terminal session 打开完整历史记录的入口，允许用户查看超过 xterm scrollback 的早期内容。
- 支持 transcript 文本搜索、跳转匹配项和导出，满足长 agent 对话回溯需求。
- transcript 留存不得改变 PTY 输入输出语义、xterm 实时渲染链路或现有 scrollback 行为。
- 首版不做 agent 语义分段解析，不承诺把完整 transcript 回灌进 xterm 无限滚动。

## Capabilities

### New Capabilities

- `terminal-session-transcript`: 终端会话完整输出记录、历史查看、搜索、导出与生命周期清理。

### Modified Capabilities

- 无。

## Impact

- 影响主进程 terminal output 转发链路，需要在按 session 路由输出时追加写入 transcript 存储。
- 影响 preload IPC 与 renderer，新增 transcript 读取、搜索或导出相关接口。
- 影响 `TerminalPanel` 或相邻 UI，新增打开完整历史记录的入口与 transcript 查看面板。
- 需要新增磁盘存储目录与清理策略，避免长期运行产生无界文件增长。
- 不新增外部依赖，优先使用现有 Electron、Node fs、React UI 能力。
