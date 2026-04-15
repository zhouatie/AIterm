## Why

当前文件预览模块支持 Markdown 渲染、代码高亮和文件树搜索，但右侧预览区缺少“在当前文件内查找文本”的能力。用户阅读较长 Markdown 或代码文件时，只能依赖肉眼滚动定位内容，效率低，也与常见编辑器和预览器的交互预期不一致。

## What Changes

- 为文件预览模块新增面向右侧预览区的内容查找入口，支持通过 `Command + F` 唤起查找框。
- 查找框作用域限定为当前选中文件的预览内容，不影响左侧文件树搜索框。
- Markdown 预览和代码预览均支持输入关键词后高亮匹配结果，并在当前文件内导航到上一个/下一个匹配项。
- 查找框打开后支持继续输入、关闭和重复唤起，且不应干扰现有全局快捷键与终端快捷键行为。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `file-preview`: 增加右侧预览区内容查找框、匹配高亮、结果导航与关闭行为
- `code-file-preview`: 增加代码预览对查找匹配高亮与结果滚动定位的要求
- `keyboard-shortcuts`: 增加文件预览查找动作的默认绑定与触发约束
- `settings-panel`: 增加文件预览查找动作的快捷键配置项展示与保存

## Impact

- 影响渲染层文件：`src/components/FilePreviewPanel.tsx`、`src/components/MarkdownPreview.tsx`、`src/components/CodePreview.tsx`
- 影响全局快捷键注册与设置入口：`src/ShortcutContext.tsx`、`src/components/SettingsPanel.tsx`
- 影响 OpenSpec delta：`file-preview`、`code-file-preview`、`keyboard-shortcuts`、`settings-panel`
