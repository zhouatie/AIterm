## Why

terminal 侧边栏 tab 当前视觉占用偏大，会压缩终端工作区的空间感。需要在不减少 tab 标题文字可显示范围的前提下，让侧边导航整体更紧凑。

## What Changes

- 缩小 terminal 侧边栏 tab 的整体视觉占用，包括节点高度、内边距、图标/操作按钮间距和列表间距。
- 保持展开态侧边栏的文字显示范围不缩小，避免为了变紧凑而让 workspace 或 terminal 标题更早截断。
- 优化一级 workspace 与二级 terminal 节点的紧凑排布，让导航在相同宽度下显示更多条目。
- 保持现有展开/收起、选中态、hover 态、关闭/新增入口和文本省略规则不变。
- 不改变终端会话、PTY 生命周期、快捷键或持久化数据结构。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `terminal-tabs`：terminal 侧边双层导航的展开态 tab 密度要求调整，要求整体更紧凑，同时不得缩小标题文字可显示范围。

## Impact

- **受影响代码**：terminal 侧边 tab/navigation 相关组件及样式，重点是 workspace 节点、terminal 节点、列表间距、操作按钮和收起/展开控件的布局参数。
- **用户体验**：侧边导航更省空间，相同区域可容纳更多 workspace 与 terminal tab；标题可读宽度保持不低于现状。
- **依赖与数据**：不新增依赖，不改变 IPC、PTY、tab 持久化或快捷键配置。
- **兼容性**：无 breaking changes，属于视觉密度与布局约束调整。
