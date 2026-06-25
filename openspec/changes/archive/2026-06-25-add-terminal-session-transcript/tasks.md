## 1. Transcript 标识与生命周期

- [x] 1.1 为 terminal tab/session 状态增加稳定 `transcriptId`，并纳入 tab-state 持久化快照
- [x] 1.2 在创建新的 workspace/session 时分配新的 `transcriptId`
- [x] 1.3 在应用重启恢复 tab 时恢复原有 `transcriptId`，并让新 PTY session 继续关联该 transcript
- [x] 1.4 在关闭 terminal tab/session 时触发对应 transcript 清理
- [x] 1.5 在应用启动后清理没有任何恢复 tab 引用的孤立 transcript 文件

## 2. 主进程 Transcript 存储

- [x] 2.1 新增 transcript 存储管理逻辑，负责 userData 下 transcript 目录、文件路径、追加写入、读取和删除
- [x] 2.2 建立 PTY `sessionId` 到 `transcriptId` 的主进程映射，并在 session 创建、恢复和销毁时维护该映射
- [x] 2.3 在 PTY output 入口追加写入 transcript，确保活跃和后台 session 输出都会记录
- [x] 2.4 确保 `terminal:input` 链路不写入 transcript，避免额外记录 stdin
- [x] 2.5 在 PTY exit 时将进程退出提示按输出语义追加到 transcript
- [x] 2.6 实现 transcript 文本规范化读取，去除 ANSI/VT 控制序列并处理常见回车重写

## 3. IPC 与类型

- [x] 3.1 扩展 terminal 创建或注册 IPC，使 renderer 能把 `transcriptId` 传递给主进程并建立关联
- [x] 3.2 在 preload/global 类型中暴露 transcript 读取、搜索、导出和删除相关 IPC
- [x] 3.3 实现 transcript 搜索 IPC，返回匹配项数量、当前位置和可跳转的匹配上下文
- [x] 3.4 实现 transcript 导出 IPC，将当前 transcript 写出为用户可保存的文本文件
- [x] 3.5 确保 transcript IPC 对不存在或已删除的 transcript 返回可处理的空状态或错误信息

## 4. Transcript 查看 UI

- [x] 4.1 在当前 terminal tab 可触达位置新增打开 transcript 的紧凑入口
- [x] 4.2 新增只读 transcript 视图，展示当前 terminal tab 的完整文本历史
- [x] 4.3 在 transcript 视图中实现搜索输入、匹配数量展示和上一个/下一个匹配跳转
- [x] 4.4 在 transcript 视图中实现导出操作，并保持本地 transcript 不被截断或删除
- [x] 4.5 transcript 视图打开期间定期或按事件刷新新增输出，同时不改变 xterm viewport 或 PTY 状态
- [x] 4.6 处理空 transcript、已删除 transcript、搜索无匹配和读取失败状态

## 5. 验证

- [x] 5.1 验证长输出超过 xterm scrollback 后，transcript 仍能查看早期输出
- [x] 5.2 验证后台 session 持续输出时 transcript 不遗漏内容，重新激活后 xterm 补写行为不变
- [x] 5.3 验证应用重启恢复 tab 后，新输出继续追加到同一 transcript
- [x] 5.4 验证关闭 terminal tab 后对应 transcript 文件被删除，启动清理能删除孤立文件
- [x] 5.5 验证 transcript 搜索、无匹配状态和导出文本文件行为
- [x] 5.6 验证用户输入不会通过 stdin 链路额外落盘，只有 PTY 回显内容进入 transcript
