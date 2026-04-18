## Why

当前文件预览查找会在 Markdown 预览与代码预览中直接改写 React 管理的 DOM。用户在查找框中快速输入时，渲染更新与 DOM 改写会发生冲突，导致 renderer 抛出 `NotFoundError`，严重时整个界面内容区变空，必须修复。

## What Changes

- 重构文件预览查找高亮实现，避免在 Markdown 预览和代码预览中直接改写 React 管理的真实 DOM。
- 明确文件预览查找在连续输入、快速切换匹配项等高频交互下必须保持稳定，不得导致预览区或整个应用渲染崩溃。
- 保持现有 `Command + F` 入口、匹配计数、上下一个导航和滚动定位能力不变，只修正崩溃风险与高亮实现方式。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `file-preview`: 文件预览查找在 Markdown 预览中必须以不会破坏 React 渲染树的方式高亮匹配，并在快速输入时保持稳定
- `code-file-preview`: 代码预览查找高亮必须避免直接改写 React 管理的 DOM，并在连续输入与导航时保持稳定

## Impact

- 受影响实现：`src/components/MarkdownPreview.tsx`、`src/components/CodePreview.tsx`、`src/components/FilePreviewPanel.tsx`、`src/utils/preview-find.ts`
- 受影响行为：Markdown/代码文件预览内的查找高亮、当前匹配定位与连续输入稳定性
- 不涉及新的依赖、IPC 通道或快捷键配置结构变更
