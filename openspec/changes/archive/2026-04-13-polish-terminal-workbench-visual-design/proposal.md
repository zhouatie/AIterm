## Why

当前 terminal tab 与整体工作台界面的视觉风格偏工具化，标题栏、终端侧边导航、分隔层次和终端内容区之间缺少统一的视觉语言。随着 terminal workspace / tab 功能逐步完善，现有界面已经能满足功能需求，但在长时间使用时仍显得生硬，不符合用户期望的 macOS 风格下那种克制、优雅、层次清晰的桌面应用体验。

这次变更希望在不改变现有终端组织模型和快捷键行为的前提下，集中优化 terminal tab 及其周边 UI 的视觉表现，让应用从“能用的开发工具”提升到“更精致的桌面工作台”。

## What Changes

- 优化 terminal 面板的整体视觉层次，统一标题栏、终端侧边导航、终端内容区与分隔区域的窗口气质。
- 重构 workspace / terminal tab 的视觉表达，改进一级与二级节点的层级关系、选中态、hover 态、注意力提示与行内操作按钮样式。
- 调整主题变量与表面样式，提供更贴近 macOS 风格的背景、描边、阴影、选中与强调色策略，并保证浅色 / 深色模式保持一致的设计语言。
- 优化应用主内容区的分栏边界、标题栏控件区和面板容器过渡关系，让整体窗口更完整、克制、精致。
- 本次变更不新增 terminal 功能，不改变 workspace / tab 的创建、切换、关闭、重命名或快捷键语义。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `terminal-tabs`: 调整终端侧边导航的视觉层级、选中样式、交互反馈和收起 / 展开控件的界面表现。
- `panel-layout`: 调整标题栏、主分栏容器和面板边界的视觉结构，使窗口 chrome 与内容区形成一致的桌面应用风格。
- `theme-system`: 扩展主题语义变量覆盖范围，支持更细腻的表面层次、描边、阴影与强调色表达。

## Impact

- 影响 `src/components/TerminalPanel.tsx`：终端侧边导航、workspace / session 行、收起展开入口和相关视觉状态。
- 影响 `src/App.tsx` 与 `src/components/SplitLayout.tsx`：标题栏区域、主内容容器、分栏分隔表现。
- 影响 `src/index.css`、`src/components/TerminalInstance.css` 与 `src/ThemeContext.tsx`：主题 token、终端容器背景层次与明暗主题视觉一致性。
- 影响 `openspec/specs/terminal-tabs/spec.md`、`openspec/specs/panel-layout/spec.md`、`openspec/specs/theme-system/spec.md` 的用户可感知界面要求。
