## Why

Markdown 预览当前能渲染 GFM 任务列表 checkbox，但用户点击 checkbox 不会改变任务状态，只能回到源文件手动编辑。让预览区支持直接勾选/取消并写回源 Markdown，可以把预览从只读查看升级为轻量任务处理入口。

## What Changes

- Markdown 预览中的 GFM task list checkbox 支持点击切换状态。
- 点击 checkbox 后，系统将对应源 Markdown 行中的任务标记在 `[ ]` 与 `[x]` 之间切换，并写回当前文件。
- 写回成功后，预览区立即使用新内容重新渲染，后续刷新或重新打开文件仍保留状态。
- 写回失败时，不应伪造成功状态；预览内容保持与文件实际内容一致，并向用户反馈失败。
- 新增渲染进程到主进程的受控文件写入能力，仅用于写回当前预览文件内容。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `file-preview`: Markdown 文件预览从只读渲染扩展为支持点击 GFM 任务列表 checkbox 并写回源文件。

## Impact

- 影响 `src/components/MarkdownPreview.tsx`：需要为 task checkbox 接入点击事件，并把任务项索引/状态变更传给上层。
- 影响 `src/components/FilePreviewPanel.tsx`：需要管理写回流程、更新 `fileContent`、处理写入失败反馈。
- 影响 `src/preload.ts`、`src/global.d.ts`、`src/main.ts`：需要新增文件写入 IPC API。
- 影响 `openspec/specs/file-preview/spec.md`：新增 Markdown checkbox 交互写回需求。
