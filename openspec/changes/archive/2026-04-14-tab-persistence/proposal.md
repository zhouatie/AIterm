## Why

当前应用关闭后，所有 workspace 和终端 tab 状态全部丢失，用户每次重新打开 app 都需要重新创建 workspace、打开对应目录的终端，恢复之前的工作上下文。对于日常频繁使用终端的场景，这种体验不可接受。需要在应用退出时自动保存 tab 布局，启动时自动恢复。

## What Changes

- 应用退出前自动将当前 workspace/session 树结构及相关元数据序列化并持久化到本地存储
- 应用启动时读取持久化数据，恢复 workspace 列表、session 布局、活跃 tab 选择、workspace 展开/收起状态、session 重命名等 UI 状态
- 恢复的每个 session 需要在对应 cwd 下重新创建 PTY 进程（PTY 进程本身不可序列化，仅恢复目录和布局）
- 若持久化数据损坏或为空，回退到当前默认行为（创建一个新 workspace 和一个终端）

## Capabilities

### New Capabilities

_无_

### Modified Capabilities

- `terminal-tabs`: 增加 tab 状态持久化与恢复的需求 —— 应用退出时保存 workspace/session 树结构，启动时自动恢复布局并重建 PTY 会话

## Impact

- **TerminalPanel.tsx**: 初始化逻辑需从"固定创建一个 workspace"改为"先尝试从持久化数据恢复，失败则创建默认 workspace"
- **pty-manager.ts / main.ts**: 恢复流程中需要批量创建 PTY 会话并关联到已有 session ID 映射
- **持久化存储**: 使用 localStorage（与现有偏好设置一致）存储序列化的 workspace 树 JSON
- **preload.ts**: 可能无需改动（localStorage 在 renderer 进程直接可用）
- **无新增依赖**: 不引入额外存储库，复用现有 localStorage 模式
