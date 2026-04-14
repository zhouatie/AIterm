## 1. 工具函数 & 类型定义

- [x] 1.1 在 `src/utils/file-tree-settings.ts` 中新增 `HIDDEN_FOLDER_NAMES_KEY` 常量及 `getHiddenFolderNames()` / `setHiddenFolderNames()` 读写函数
- [x] 1.2 在 `src/main.ts` 的 `ReadTreeOptions`（或相关类型）中新增可选字段 `hiddenFolderNames?: string[]`

## 2. 主进程过滤逻辑

- [x] 2.1 在 `readTreeDirectory()` 中读取 `options.hiddenFolderNames`，对目录条目新增过滤：名称在列表内的文件夹直接跳过
- [x] 2.2 在 `scanAllWithNodeFs()` / `scanAllTree()` 中同样应用 `hiddenFolderNames` 过滤
- [x] 2.3 在 `scanAllWithFd()` 中将 `hiddenFolderNames` 追加为 `--exclude` 参数，与 `getExcludedDirNames` 的处理方式保持一致

## 3. 渲染层透传

- [x] 3.1 在 `FileTree.tsx` 的 `loadTree()` 调用 `readTreeDirectory` 时，将 `getHiddenFolderNames()` 的值注入 `options.hiddenFolderNames`
- [x] 3.2 在 `FileTree.tsx` 的「展开全部」调用 `scanAllFiles` 时，同样注入 `options.hiddenFolderNames`
- [x] 3.3 确认 `options` 变化时（如保存设置后）能触发文件树刷新（复用现有 `refreshKey` 机制或类似方式）

## 4. 设置面板 UI

- [x] 4.1 在设置面板组件中新增「隐藏文件夹」配置区，展示当前隐藏文件夹名称列表
- [x] 4.2 实现添加文件夹名称的交互（输入框 + 确认）
- [x] 4.3 实现删除文件夹名称的交互（每项旁边的删除按钮）
- [x] 4.4 在保存操作中调用 `setHiddenFolderNames()` 持久化到 localStorage
- [x] 4.5 保存成功后触发文件树刷新，使配置立即生效

## 5. 缺陷修复（Review 发现）

- [x] 5.1 在 `src/main.ts` 的 `readSpecRootDirectory()` 中，将子级 `readTreeDirectory(dirPath)` 调用改为 `readTreeDirectory(dirPath, options)`，确保 spec 模式下懒加载首层内容同样应用隐藏文件夹过滤
- [x] 5.2 在 `src/components/SettingsPanel.tsx` 的 `isDirty` 比较中，改用排序后的数组比较（`[...arr].sort().join('\n')`），避免名称顺序差异导致的误判
