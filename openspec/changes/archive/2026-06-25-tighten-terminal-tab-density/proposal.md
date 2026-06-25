## Why

当前 Terminal 侧边栏二级 tab 的状态点、快捷键序号槽位、名称和关闭按钮之间的横向间距偏松，单个 tab 视觉宽度和侧边栏占用面积也偏大。收紧行内间距和侧边栏宽度可以减少 terminal 工作区被导航占用的面积，同时保留快速识别和操作能力。

## What Changes

- 缩短二级 terminal tab 行内元素间距，尤其是状态点与 tab 名称之间的距离。
- 调整二级 terminal tab 名称起点，使其可与上方 workspace 名称形成纵向对齐。
- 缩短二级 terminal tab 左右内边距和固定槽位宽度，减少单行视觉占用。
- 缩短展开态 terminal 侧边栏宽度，让右侧 terminal 内容获得更多横向空间。
- 保持状态点、Command 序号、名称截断和关闭按钮的稳定占位，不因 agent status 或快捷键状态变化造成布局抖动。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `terminal-tabs`: 调整 Terminal 侧边栏二级 tab 的紧凑密度和展开态宽度要求。

## Impact

- 主要影响 `src/components/TerminalPanel.tsx` 中 Terminal 侧边栏常量和二级 tab 行内样式。
- 更新 `openspec/specs/terminal-tabs/spec.md` 对应规格。
- 不改变终端会话生命周期、快捷键、拖拽排序、Spec 模式导航或持久化数据结构。
