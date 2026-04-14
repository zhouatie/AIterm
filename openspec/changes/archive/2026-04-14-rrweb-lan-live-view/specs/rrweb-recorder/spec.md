## ADDED Requirements

### Requirement: 录制 DOM 变化
系统 SHALL 在 Live View 开启时，使用 rrweb 在 Renderer Process 中录制完整的 DOM 快照和增量 mutation，并通过 IPC 传递给 Main Process。

#### Scenario: 开启录制
- **WHEN** 用户开启 Live View
- **THEN** Renderer Process SHALL 调用 `rrweb.record()` 开始录制
- **THEN** 第一个事件 SHALL 为 full-snapshot 类型
- **THEN** 后续 DOM 变化 SHALL 生成对应的 incremental snapshot 事件

#### Scenario: 停止录制
- **WHEN** 用户关闭 Live View
- **THEN** Renderer Process SHALL 调用 rrweb stop 函数停止录制
- **THEN** 不再产生新的 rrweb 事件

#### Scenario: 事件传递
- **WHEN** rrweb 产生新事件
- **THEN** Renderer Process SHALL 通过 `ipcRenderer.send('rrweb:event', event)` 发送给 Main Process
- **THEN** Main Process IPC handler SHALL 将事件加入广播队列

---

### Requirement: 性能影响可控
rrweb 录制 SHALL 不对 app 正常使用造成明显卡顿。

#### Scenario: 正常终端操作时的性能
- **WHEN** 用户在终端执行普通命令（ls、git、vim 等）
- **THEN** rrweb 录制的 CPU 占用 SHALL 不超过额外 5%

#### Scenario: 录制关闭时无性能开销
- **WHEN** Live View 处于关闭状态
- **THEN** app SHALL 不运行任何 rrweb 录制逻辑，零性能开销
