## 1. 调整快捷键动作定义

- [x] 1.1 在 `src/ShortcutContext.tsx` 中新增 `create-terminal-tab` 动作 ID、标题和说明
- [x] 1.2 在 `src/ShortcutContext.tsx` 中新增 `rename-current-workspace`、`rename-current-terminal-tab`、`close-current-terminal-tab`、`close-current-workspace` 动作 ID、标题和说明
- [x] 1.3 将 `create-workspace` 的默认绑定从 `Meta+T` 调整为 `Meta+N`
- [x] 1.4 为 `create-terminal-tab`、`rename-current-workspace`、`rename-current-terminal-tab`、`close-current-terminal-tab`、`close-current-workspace` 配置默认绑定
- [x] 1.5 确认新增动作继续复用现有快捷键规范化、冲突校验、持久化和显示逻辑

## 2. 接入 terminal 管理快捷键

- [x] 2.1 在 `src/components/TerminalPanel.tsx` 中基于 `activeSessionId` 解析当前激活 workspace
- [x] 2.2 通过 `registerAction('create-terminal-tab', ...)` 注册当前 workspace 下新增 terminal tab 的处理函数
- [x] 2.3 复用现有 `createSessionInWorkspace` 逻辑，确保快捷键创建行为与 workspace 节点右侧 `+` 按钮一致
- [x] 2.4 为当前 workspace 重命名和当前 terminal tab 重命名新增快捷键入口，并进入对应可编辑状态
- [x] 2.5 为当前 terminal tab 关闭和当前 workspace 关闭新增快捷键入口，并复用现有 session 关闭 / 资源清理逻辑
- [x] 2.6 保持 `create-workspace` 快捷键继续创建新的一级 workspace，并自动切换到新 workspace

## 3. 支持二级 terminal tab 手动命名覆盖

- [x] 3.1 在 `src/components/TerminalPanel.tsx` 中为二级 terminal tab 增加手动重命名输入态
- [x] 3.2 为 session 增加手动名称覆盖状态，展示时优先使用手动名称而不是自动 `displayLabel`
- [x] 3.3 确认 session info 更新时不会覆盖已手动命名的 terminal tab
- [x] 3.4 确认 workspace 重命名和 terminal tab 重命名的输入态互斥，避免同时进入多个编辑状态

## 4. 更新设置面板展示

- [x] 4.1 确认 `src/components/SettingsPanel.tsx` 自动展示新增的 terminal 管理动作
- [x] 4.2 更新设置面板中对可配置快捷键范围的说明文案，使其包含新的终端创建、重命名和关闭动作

## 5. 验证终端快捷键行为

- [x] 5.1 手动验证默认绑定中“新增 workspace”为 `Command + N`
- [x] 5.2 手动验证 `Command + T` 会在当前激活 workspace 下新增二级 terminal tab，而不是创建新的 workspace
- [x] 5.3 手动验证通过快捷键创建二级 terminal tab 时，初始工作目录继承当前 workspace 路径；无有效路径时回退到 HOME
- [x] 5.4 手动验证 `Command + Shift + R` 会重命名当前 workspace，`Command + R` 会重命名当前二级 terminal tab
- [x] 5.5 手动验证二级 terminal tab 手动重命名后，即使 cwd / git 分支变化也保持手动名称
- [x] 5.6 手动验证 `Command + W` 关闭当前二级 terminal tab，`Command + Shift + W` 关闭当前 workspace 下所有二级 terminal tab
- [x] 5.7 手动验证关闭最后一个 workspace 后，系统会自动补回新的 `workspace_{index}` 与首个终端
- [x] 5.8 手动验证终端获焦时以上快捷键仍可触发对应动作
- [x] 5.9 手动验证 workspace 或 terminal tab 的重命名输入框获焦时，不会误触发全局快捷键
- [x] 5.10 手动验证设置面板中可重新绑定新增动作，并能阻止重复绑定
