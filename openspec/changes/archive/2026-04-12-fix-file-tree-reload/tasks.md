## 1. FileTree 组件改造

- [x] 1.1 在 `FileTreeProps` 接口中新增可选的 `refreshKey?: number` 属性（`src/components/FileTree.tsx`）
- [x] 1.2 在 FileTree 加载 `useEffect` 的依赖数组中添加 `refreshKey`，使其变化时触发重新扫描
- [x] 1.3 为 `scanFn` Promise 添加 `.catch()` 处理：扫描失败时将 `loading` 设为 `false`，`nodes` 设为空数组

## 2. FilePreviewPanel 刷新逻辑重构

- [x] 2.1 在 `FilePreviewPanel` 中新增 `refreshKey` 状态：`const [refreshKey, setRefreshKey] = useState(0)`
- [x] 2.2 重写 `handleRefresh` 函数：获取最新 CWD 后，若路径相同则递增 `refreshKey`，若路径不同则更新 `rootPath` 并清除选中状态
- [x] 2.3 将 `refreshKey` 作为 prop 传递给 `<FileTree>` 组件

## 3. 验证与清理

- [x] 3.1 删除 `handleRefresh` 中原有的 `setRootPath('')` + `queueMicrotask` hack 代码
- [ ] 3.2 手动验证：在终端中创建新文件后点击刷新按钮，确认文件树立即更新显示新文件
- [ ] 3.3 手动验证：刷新过程中应显示 loading 状态指示器
