## Why

当前应用中 `Command + F` 会同时触发文件预览查找和终端搜索，用户在终端中搜索输出时会意外打开 Markdown / 代码预览查找框。这个冲突来自同一快捷键在应用级与 terminal 面板级重复监听，需要让搜索快捷键按当前焦点归属只触发一个搜索入口。

## What Changes

- 当终端获得焦点时，`Command + F` 只打开或切换终端搜索栏。
- 当焦点不在终端中时，`Command + F` 保持打开文件预览内容查找的行为。
- 终端搜索的最小修复方案不引入新的全局快捷键路由系统，不改变用户自定义快捷键配置模型。
- 文件预览查找与终端搜索不再因同一次按键同时打开。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `keyboard-shortcuts`: 明确文件预览查找快捷键在终端聚焦时不得抢占终端搜索。
- `terminal-search`: 明确终端搜索快捷键仅在终端聚焦时响应，并阻止同次按键继续触发文件预览查找。

## Impact

- 影响 `src/ShortcutContext.tsx` 的快捷键触发判定或 `find-in-file-preview` 处理条件。
- 影响 `src/components/TerminalPanel.tsx` 中 `Command + F` 终端搜索监听的焦点判断。
- 不新增依赖，不改变 IPC、PTY、terminal search addon 或快捷键持久化数据结构。
