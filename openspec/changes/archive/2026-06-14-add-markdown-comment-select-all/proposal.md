## Why

Markdown 评论列表已经支持逐条多选、发送选中评论和删除选中评论，但当一个文件中评论较多时，用户需要逐个勾选才能批量处理全部评论，操作成本明显偏高。

本次变更补齐评论批量操作的基础入口，让用户可以在当前文件评论列表中一键全选或取消全选评论。

## What Changes

- 在 Markdown 评论列表工具栏中新增全选控制，用于选中当前文件的全部评论。
- 当所有评论已选中时，同一控制可取消全选并清空当前评论选择。
- 当只选中部分评论时，全选控制显示部分选中状态，并可继续切换到全选。
- 全选范围限定为当前 Markdown 文件已加载的评论列表，包含已定位和未定位评论。
- 不改变评论持久化数据结构、agent payload 格式、Markdown 源文件内容或跨文件评论行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `file-preview`: 扩展 Markdown 评论列表的批量选择交互，增加当前文件评论全选和取消全选要求。

## Impact

- 主要影响 `src/components/FilePreviewPanel.tsx` 中 Markdown 评论面板的选择状态和工具栏渲染。
- 可能需要少量调整 `src/index.css` 中评论列表工具栏和复选框样式。
- 不影响主进程 IPC、preload API、评论 JSON 存储格式、Markdown 锚点恢复、预览查找或终端输入链路。
