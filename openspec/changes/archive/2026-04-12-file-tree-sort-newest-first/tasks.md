## 1. 数据模型扩展

- [x] 1.1 在 `src/main.ts` 的 `ScanTreeNode` 接口中添加可选字段 `mtime?: number`
- [x] 1.2 在 `src/preload.ts` 的 `ScanTreeNode` 接口中添加可选字段 `mtime?: number`
- [x] 1.3 在 `src/components/FileTree.tsx` 的 `TreeNode` 接口中添加可选字段 `mtime?: number`

## 2. Node.js 回退扫描路径添加 mtime

- [x] 2.1 修改 `scanAllWithNodeFs()` —— 在 `readdir` 遍历时使用 `fs.promises.stat()` 获取每个条目的 `mtime`，赋值到节点的 `mtime` 字段
- [x] 2.2 修改 `scanWithNodeFs()` —— 同上，为 Markdown 扫描回退路径添加 `mtime` 获取
- [x] 2.3 修改 `scanAllWithNodeFs()` 的排序逻辑 —— 目录和文件各自按 `mtime` 降序排列，mtime 相同时按名称排序
- [x] 2.4 修改 `scanWithNodeFs()` 的排序逻辑 —— 同上

## 3. fd 扫描路径添加 mtime

- [x] 3.1 修改 `buildTreeFromPaths()` —— 在构建树结构后，使用 `fs.promises.stat()` 为每个节点（文件和目录）获取 `mtime`
- [x] 3.2 修改 `buildTreeFromPaths()` 的排序逻辑 —— 目录和文件各自按 `mtime` 降序排列，mtime 相同时按名称排序

## 4. 验证

- [x] 4.1 启动应用，确认文件树中文件和目录按修改时间倒序排列
- [x] 4.2 在两种扫描模式（Markdown-only 和全部文件）下验证排序正确
- [x] 4.3 确认目录仍然排在文件之前
