## 1. 基础设施与依赖

- [x] 1.1 安装 Milkdown 依赖（`@milkdown/kit`, `@milkdown/react`）
- [x] 1.2 在 `main.ts` 中新增 `fs:ensure-dir` IPC handler（递归创建目录）
- [x] 1.3 在 `main.ts` 中新增 `app:get-user-data-path` IPC handler（返回 userData 路径）
- [x] 1.4 在 `preload.ts` 中暴露 `fileApi.ensureDir()` 和 `fileApi.getUserDataPath()` 方法

## 2. 笔记存储与配置

- [x] 2.1 创建 `src/utils/note-settings.ts`：笔记目录路径读写（localStorage），默认值为 `{userData}/notes/`
- [x] 2.2 在 `SettingsPanel.tsx` 中新增笔记目录配置项（输入框 + 保存，复用现有设置项样式）

## 3. 快捷键注册

- [x] 3.1 在 `ShortcutContext.tsx` 中新增 `toggle-notes` action（标题、描述、默认绑定 `Meta+O`）
- [x] 3.2 在 `SettingsPanel.tsx` 的快捷键配置区中展示笔记面板快捷键

## 4. Milkdown 编辑器组件

- [x] 4.1 创建 `src/components/NoteEditor.tsx`：封装 Milkdown 编辑器（commonmark + gfm + history + listener）
- [x] 4.2 实现编辑器主题适配：headless 模式 + CSS variables 适配 light/dark/system 主题
- [x] 4.3 实现 `markdownUpdated` 回调，向外部传递最新 Markdown 字符串

## 5. 自动保存逻辑

- [x] 5.1 创建 `src/utils/note-autosave.ts`：实现 debounce 保存（2s）、脏检查（lastSavedContent 比较）、写入锁（防并发）
- [x] 5.2 实现事件触发即时保存：Tab 切换 flush、面板关闭 flush、窗口 blur flush
- [x] 5.3 实现兜底定时器（2 分钟间隔）
- [x] 5.4 实现 beforeunload 同步保存

## 6. 笔记文件列表组件

- [x] 6.1 创建 `src/components/NoteFileList.tsx`：扫描笔记目录（复用 `fs:scan-md-files` IPC），按 mtime 降序展示
- [x] 6.2 实现点击文件打开/切换 Tab 逻辑
- [x] 6.3 实现当前编辑笔记的高亮状态
- [x] 6.4 实现新建笔记功能（`未命名.md` + 自动递增命名）
- [x] 6.5 实现删除笔记功能（确认提示 + 文件删除 + 关闭对应 Tab）

## 7. NotePanel 主面板

- [x] 7.1 创建 `src/components/NotePanel.tsx`：overlay 容器（复用 BrowserPanel 的 absolute 定位 + translateY 动画模式）
- [x] 7.2 实现 Tab 栏（多 Tab 管理、关闭按钮、新建 Tab 按钮）
- [x] 7.3 集成 NoteFileList（左侧）+ NoteEditor（右侧）布局
- [x] 7.4 实现空状态提示（无 Tab 打开时的引导界面）
- [x] 7.5 实现笔记目录初始化（首次打开时通过 `fs:ensure-dir` 创建目录）

## 8. App 集成

- [x] 8.1 在 `App.tsx` 中扩展 `OverlayPanel` 类型为 `'none' | 'browser' | 'git-diff' | 'notes'`
- [x] 8.2 在标题栏新增笔记按钮（lucide-react `NotebookPen` 图标），绑定 toggleNotes
- [x] 8.3 挂载 `<NotePanel isOpen={...} onClose={...} />`
- [x] 8.4 注册 `toggle-notes` 快捷键 handler（`registerAction`）

## 9. 新建笔记后编辑器自动获焦

- [x] 9.1 新建笔记后，编辑器 SHALL 自动获得输入焦点，用户可直接开始打字

## 10. 文件列表工具栏改造

- [x] 10.1 将 NoteFileList 底部 footer 按钮区替换为顶部 icon 工具栏（32px 高，包含 FilePlus 和 FolderPlus icon 按钮）
- [x] 10.2 工具栏样式与现有 FileTree 风格保持一致

## 11. 重命名功能

- [x] 11.1 在 `main.ts` 中新增 `fs:rename` IPC handler（重命名文件或文件夹，若目标已存在则返回错误）
- [x] 11.2 在 `preload.ts` 中暴露 `fileApi.rename(oldPath, newPath)` 方法
- [x] 11.3 在 NoteFileList 中实现 inline 重命名编辑状态（双击文件/文件夹名触发，Enter 确认，Escape 取消）
- [x] 11.4 笔记重命名时自动补 `.md` 后缀
- [x] 11.5 重命名后刷新文件列表；若文件在 Tab 中已打开，同步更新 Tab 的 filePath 和 fileName
- [x] 11.6 重命名冲突时阻止操作并提示

## 12. 新建文件夹功能

- [x] 12.1 在 NoteFileList 工具栏中新增「新建文件夹」按钮（FolderPlus icon）
- [x] 12.2 实现新建文件夹逻辑（`新建文件夹` + 自动递增命名，通过 `fs:ensure-dir` 创建）
- [x] 12.3 新建文件夹后自动进入 inline 重命名状态
- [x] 12.4 文件夹重命名时校验名称不含 `/` 或 `\`

## 13. 编辑器空白区域点击聚焦修复

- [x] 13.1 编辑器 wrapper 容器铺满整个编辑区域高度（min-height: 100%），点击编辑器 wrapper 内任意位置（含内容下方空白区域）SHALL 聚焦 ProseMirror 编辑器

## 14. 新建文件夹不可见修复

- [x] 14.1 NoteFileList 的 loadTree 改用支持显示空文件夹的扫描方式（scanAllFiles 或调整 scanMdFiles），确保新建的空文件夹在文件列表中可见

## 15. 一键关闭所有 Tab

- [x] 15.1 在 NotePanel Tab 栏右侧新增"关闭所有标签"按钮（仅 2 个以上 Tab 时显示）
- [x] 15.2 点击后调用 flushAll() 并清空所有 Tab，回到空状态

## 16. 笔记文件搜索

- [x] 16.1 在 NoteFileList 工具栏中新增搜索功能（Search icon 按钮 + 展开的搜索输入框）
- [x] 16.2 实现前端实时过滤：按文件名（不含 .md 后缀）不区分大小写匹配关键词
- [x] 16.3 过滤时保留包含匹配文件的文件夹，隐藏无匹配内容的文件夹
- [x] 16.4 清空搜索框后恢复完整列表
