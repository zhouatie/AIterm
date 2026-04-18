## 1. 后端：简化 readSpecRootDirectory

- [x] 1.1 修改 `src/main.ts` 中 `readSpecRootDirectory()` 函数：对每个 spec 目录只做 `fs.promises.stat()` 获取 mtime，不再调用 `readTreeDirectory()` 预加载子项。返回的 `ScanTreeNode` 的 `children` 字段设为 `undefined`
- [x] 1.2 验证 `readTreeDirectory()` 在接收到 spec 目录展开请求时（非根路径），仍能正常返回该目录的直接子项（现有逻辑不需改动，但需确认 `isSpecRootDirectory` 判断正确）

## 2. 前端：移除 spec 目录自动展开逻辑

- [x] 2.1 删除 `src/components/FileTree.tsx` 中 `loadTree()` 的 spec 根目录自动展开代码（约 lines 644-653），使 spec 目录以折叠状态呈现
- [x] 2.2 确认展开状态恢复循环（lines 655-676）在 spec 模式下正常工作：之前展开过的 spec 子目录能通过恢复机制按需加载

## 3. 验证

- [x] 3.1 测试首次开启 spec 模式：应只显示折叠的 spec 目录列表，无子项预加载
- [x] 3.2 测试点击展开 spec 目录：应按需加载该目录的直接子项
- [x] 3.3 测试展开多层后刷新或切换终端：展开状态应通过恢复机制正确还原
- [x] 3.4 测试 spec 模式"展开全部"按钮：应仍能正常全量扫描 spec 目录树
- [x] 3.5 测试关闭 spec 模式：应恢复到普通文件树全部文件展示
