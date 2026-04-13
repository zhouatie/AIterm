## 1. 可见行数据模型

- [x] 1.1 在 `src/components/FileTree.tsx` 中新增 `VisibleTreeRow` 类型，包含 `node`、`depth`、`guideFlags`、`rowIndex` 所需信息
- [x] 1.2 将 `expandedPathSet` 改为通过 `useMemo` 从 `expandedPaths` 派生，避免每次 render 重新创建
- [x] 1.3 将 `allDirectoryPaths` 改为通过 `useMemo` 仅在 `nodes` 变化时收集，保持展开全部逻辑不变
- [x] 1.4 实现 `buildVisibleRows(nodes, expandedPathSet)`，只把根节点和已展开目录下的 descendants 加入可见行列表
- [x] 1.5 用 `useMemo` 派生 `visibleRows`，确保折叠目录的后代节点不进入可见行列表

## 2. 虚拟列表渲染

- [x] 2.1 将递归 `TreeNodeItem` 渲染结构改为单行渲染函数或单行组件，复用现有图标、缩进、hover、选中和右键菜单样式
- [x] 2.2 在文件树滚动容器中维护 `scrollTop` 和 `viewportHeight`，初始读取容器高度
- [x] 2.3 使用固定 `ROW_HEIGHT` 计算虚拟窗口起止下标，并加入 overscan 行
- [x] 2.4 使用总占位高度 `visibleRows.length * ROW_HEIGHT` 保持滚动条长度
- [x] 2.5 将虚拟窗口内行用绝对定位渲染到对应 `top` 位置，确保行高和缩进稳定
- [x] 2.6 使用 `ResizeObserver` 或等效机制在文件树区域高度变化时更新 `viewportHeight`

## 3. 交互保持

- [x] 3.1 保持点击目录展开/折叠逻辑使用 `node.path` 更新 `expandedPaths`
- [x] 3.2 保持点击文件时通过 `onSelectFile(node.path)` 触发预览
- [x] 3.3 保持右键菜单使用鼠标坐标和 `node.path`，不受虚拟行绝对定位影响
- [x] 3.4 保持展开全部按钮使用完整树目录路径，收起全部按钮清空展开路径
- [x] 3.5 保持 loading、空树、Markdown-only / 全部文件切换、刷新状态的现有显示语义

## 4. 验证

- [x] 4.1 验证初始化时折叠目录的后代节点不会被挂载，首屏只出现当前可见行
- [x] 4.2 验证展开和折叠多层目录后，可见行数量和展示层级正确
- [x] 4.3 验证大量可见节点滚动时只渲染虚拟窗口范围内的行，滚动条高度对应完整可见行列表
- [x] 4.4 验证展开全部后仍可滚动浏览、点击文件、右键节点，并且 DOM 挂载数量受虚拟窗口限制
- [x] 4.5 验证切换 Markdown-only / 全部文件模式、手动刷新、终端 CWD 切换后虚拟列表状态正常重建

## 5. 按需加载改造

- [x] 5.1 在 `src/preload.ts` 中新增 `fileApi.readTreeDirectory(dirPath, mdOnly)` 类型和暴露方法
- [x] 5.2 在 `src/main.ts` 中新增 `fs:read-tree-directory` IPC，只读取指定目录直接子节点并返回 `ScanTreeNode[]`
- [x] 5.3 直接子节点读取 SHALL 复用系统目录、Home 目录和项目噪音目录排除策略，并在 Markdown-only 模式下显示目录和 `.md` 文件
- [x] 5.4 将 `FileTree` 初次加载从全量扫描改为 `readTreeDirectory(rootPath, mdOnly)`
- [x] 5.5 点击目录展开时，如果该节点尚未加载 children，则请求该目录直接子节点并写回树节点
- [x] 5.6 切换 rootPath、refreshKey 或 mdOnly 时重置按需加载树和滚动状态

## 6. 展开全部策略

- [x] 6.1 在 `FileTree` 中实现高层目录判定：文件系统根目录、`/Users`、当前用户 Home
- [x] 6.2 高层目录隐藏 toolbar 中的展开全部按钮
- [x] 6.3 非高层目录保留展开全部按钮，点击后调用现有全量扫描 API 获取完整树
- [x] 6.4 展开全部成功后替换当前树，并将完整树中的所有目录路径写入 `expandedPaths`
- [x] 6.5 保持收起全部按钮在已有展开状态下可用

## 7. 按需加载验证

- [x] 7.1 验证任意根目录初次只请求第一层，不触发全量扫描
- [x] 7.2 验证逐层展开目录时只请求当前目录下一层
- [x] 7.3 验证 `/`、`/Users`、当前用户 Home 下不显示展开全部按钮
- [x] 7.4 验证普通项目目录显示展开全部按钮，点击后完整展开并继续使用虚拟列表
- [x] 7.5 运行 TypeScript 检查

## 8. 搜索与 Spec 模式

- [x] 8.1 移除文件树 toolbar 中 Markdown-only / 全部文件切换按钮
- [x] 8.2 文件树普通模式默认加载全部文件
- [x] 8.3 在文件树 toolbar 新增搜索框，过滤当前已加载树节点
- [x] 8.4 在文件树 toolbar 新增 spec 模式按钮，并持久化开关状态
- [x] 8.5 spec 模式开启后，根目录只加载配置目录名对应的目录
- [x] 8.6 spec 模式下目录展开继续按需加载下一层

## 9. Spec 目录设置

- [x] 9.1 新增 spec 目录名设置工具，提供默认值 `openspec`、`ravenspec`
- [x] 9.2 在设置面板新增 spec 目录名编辑区
- [x] 9.3 保存设置时规范化 spec 目录名并写入 localStorage
- [x] 9.4 文件树监听 spec 目录配置变化并重新加载

## 10. 验证

- [x] 10.1 运行 TypeScript 检查

## 11. Spec 模式修正

- [x] 11.1 将文件树 spec 模式按钮从图形 icon 改为显示 `spec` 文本
- [x] 11.2 spec 模式根目录加载 SHALL 只访问配置的 spec 目录路径，不先读取根目录所有 entry 后过滤
- [x] 11.3 spec 模式展开全部 SHALL 只扫描并展开配置的 spec 目录树，不包含非 spec 目录
- [x] 11.4 运行 TypeScript 检查
