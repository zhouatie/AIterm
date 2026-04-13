## Why

当前多个分隔条在拖拽时仍带宽度过渡动画，导致鼠标位置与面板尺寸变化不同步；同时文件树和分栏尺寸缺少完整的可恢复状态，用户重新打开应用后需要重复调整布局。

## What Changes

- 拖拽文件树与预览区之间的分隔条时，拖动过程取消宽度 / 间距过渡动画，释放鼠标后再恢复非拖拽态过渡。
- 拖拽文件预览模块与终端模块之间的分隔条时，拖动过程取消宽度 / 间距过渡动画，避免拖拽滞后。
- 持久化保存用户拖动后的主左右分栏比例，以及文件树 / 文件预览内部分栏比例；下次打开应用时恢复上次布局。
- 终端内容区左侧增加固定间距，避免终端文字贴住边界。
- xterm 终端滚动条样式与文件系统区域使用同一套滚动条视觉变量，避免终端滚动条突兀。
- 文件预览面板内部支持通过 icon 单独收起文件树区域，仅保留文件预览区域；不为内部文件树收起新增或复用快捷键。

## Capabilities

### New Capabilities


### Modified Capabilities
- `panel-layout`: 主左右分栏拖拽需要在拖动中取消动画，并持久化用户调整后的分栏比例。
- `file-preview`: 文件树 / 预览内部分栏拖拽需要在拖动中取消动画、持久化比例，并支持单独收起文件树面板。
- `embedded-terminal`: xterm 内容左侧间距和滚动条视觉样式需要与应用整体滚动条规范保持一致。

## Impact

- 主要影响 `src/components/SplitLayout.tsx`、`src/App.tsx`、`src/components/FilePreviewPanel.tsx`、`src/components/TerminalInstance.tsx` 与 `src/index.css`。
- 需要新增或复用 `localStorage` key 保存主分栏比例、文件树内部分栏比例和文件树内部收起状态。
- 不涉及主进程 IPC、PTY 创建逻辑或新增第三方依赖。
