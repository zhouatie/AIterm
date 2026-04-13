## Why

当前 terminal 侧边 tab 栏的收起/展开 icon 以浮层方式绝对定位在终端面板上。展开侧边栏后，这个 icon 会压在 terminal 内容区边缘，遮住终端文本与 TUI 界面，影响可读性和点击体验。

## What Changes

- 调整 terminal 侧边 tab 栏收起/展开 icon 的布局规则：展开态时，icon SHALL 放在 tab 面板内侧，而不是悬浮在 terminal 内容区之上
- 保证 terminal 内容区在侧边栏展开时不再被该 icon 遮挡
- 保持 terminal 侧边栏的收起/展开能力与现有 workspace / session 状态保留行为不变
- 收起态仍需保留一个稳定可点击的展开入口，但该入口不应影响终端内容区的主要可视区域

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `terminal-tabs`: terminal 侧边导航的收起/展开控件位置与布局规则调整为展开态内嵌于 tab 面板，避免遮挡终端内容

## Impact

- `src/components/TerminalPanel.tsx`：需要调整 sidebar toggle 按钮的渲染层级、定位方式与展开/收起态布局
- terminal 侧边导航区域的底部留白、边框或 footer 结构可能需要同步调整
- 不涉及 PTY、IPC、快捷键注册或 session 数据模型变更
