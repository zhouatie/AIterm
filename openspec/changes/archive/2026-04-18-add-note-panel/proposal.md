## Why

AIterm 目前的文件预览面板是只读的，用户无法在应用内编辑或管理笔记。作为一个 AI 终端工作台，用户经常需要在终端操作过程中随手记录想法、整理知识、做项目笔记。目前只能切到外部编辑器，打断工作流。增加一个内置的全局笔记面板，让用户无需离开 AIterm 即可管理个人知识库。

## What Changes

- 新增 **NotePanel** overlay 面板，以 `Cmd+O` 或标题栏按钮触发，从顶部滑入（复用 BrowserPanel 的 overlay 模式）
- 集成 **Milkdown**（ProseMirror 基础）作为所见即所得 Markdown 编辑器
- 笔记以标准 `.md` 文件存储在用户可配置的本地目录中（默认 userData/notes）
- 支持多 Tab 编辑，左侧笔记文件列表，新建/删除/重命名笔记
- 支持新增文件夹、文件夹重命名
- 文件列表顶部提供 icon 工具栏（新建笔记、新建文件夹），操作风格与现有文件树一致
- **自动保存**：停止打字 2s 后保存，切换 Tab/关闭面板/窗口失焦时立即保存
- 在设置面板中增加笔记目录配置项

## Capabilities

### New Capabilities

- `note-panel`: 笔记面板的 overlay 交互、Tab 管理、笔记文件列表（顶部 icon 工具栏）、新建/删除/重命名笔记、新建/重命名文件夹
- `note-editor`: Milkdown 所见即所得 Markdown 编辑器封装、主题适配
- `note-autosave`: 自动保存策略（debounce、blur、切换、兜底定时器、脏检查）
- `note-storage`: 笔记存储路径管理、目录初始化、可配置路径

### Modified Capabilities

- `keyboard-shortcuts`: 新增 `toggle-notes` action，默认绑定 `Meta+O`
- `settings-panel`: 新增笔记目录路径配置项

## Impact

- **新增依赖**: `@milkdown/kit`, `@milkdown/react`
- **修改文件**: `App.tsx`（OverlayPanel 类型扩展 + 按钮 + 面板挂载）、`ShortcutContext.tsx`（新 action）、`SettingsPanel.tsx`（新配置项）、`main.ts`（mkdir IPC）、`preload.ts`（暴露 mkdir）
- **新增文件**: `NotePanel.tsx`, `NoteEditor.tsx`, `NoteFileList.tsx`, `note-settings.ts`, `note-autosave.ts`
- **无破坏性变更**: 所有新增功能独立于现有功能，不影响终端、文件预览、浏览器等已有面板
