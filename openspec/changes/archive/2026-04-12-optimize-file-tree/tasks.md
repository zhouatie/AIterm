## 1. 移除 CWD 轮询 + 手动刷新按钮

- [x] 1.1 删除 `FilePreviewPanel` 中的 CWD 轮询 `useEffect`（`setInterval` 2 秒定时器）
- [x] 1.2 新增刷新回调函数：手动获取当前终端 CWD，若变化则更新 `rootPath` 并重置选中文件
- [x] 1.3 在文件树工具栏（toggle icon 旁）添加刷新按钮（`RefreshCw` 图标），点击触发刷新回调
- [x] 1.4 为刷新按钮添加 hover 样式和 title 提示，与现有 Toolbar 按钮风格一致

## 2. 侧边栏展开/收起切换

- [x] 2.1 将 `panelVisible` 状态提升到 `App.tsx`（`AppContent`），控制整个左栏（文件树+预览）的显隐
- [x] 2.2 为 `SplitLayout` 新增 `leftCollapsed` prop，收起时左栏 width:0、divider 隐藏，保持两侧子组件 DOM 挂载
- [x] 2.3 `FilePreviewPanel` 新增 `visible` prop，当 `false` 时跳过 CWD 同步和 IPC 调用；变为 `true` 时立即恢复同步
- [x] 2.4 toggle icon 使用绝对定位放在应用顶部（`top:6, left:68`，traffic lights 右侧），`WebkitAppRegion: no-drag`，两种状态下始终可见
- [x] 2.5 使用 `localStorage`（key: `sidebarPanelVisible`）持久化展开/收起状态，下次启动时恢复上次状态
- [x] 2.6 `TerminalTabBar.paddingLeft` 从 80 增加到 96，避免收起状态下 toggle 与 tab 内容重叠
- [x] 2.7 为 toggle icon 添加 hover 样式、title 提示，与现有 Toolbar 按钮风格一致

## 3. 文件树加载性能优化（fd）

- [x] 3.1 在 `main.ts` 中新增 `fd` 可用性检测函数（启动时通过 `which fd` 检测，缓存结果）
- [x] 3.2 新增 `fs:scan-md-files` IPC handler：使用 `fd -e md --type f` 从指定目录扫描所有 `.md` 文件，返回相对路径列表
- [x] 3.3 在 `fs:scan-md-files` handler 中实现路径列表到嵌套树结构的转换（按 `/` 分割路径，构建 `TreeNode[]`）
- [x] 3.4 当 `fd` 不可用时，`fs:scan-md-files` 回退到现有 Node.js 递归方案（复用 `directoryContainsMarkdown` + `readdir` 逻辑）
- [x] 3.5 在 `preload.ts` 和 `global.d.ts` 中暴露 `fileApi.scanMdFiles(rootPath)` 方法
- [x] 3.6 修改 `FileTree` 组件：用 `scanMdFiles` 一次性获取完整树结构，替代原有逐层 `loadDirectory` 懒加载

## 4. 右键上下文菜单

- [x] 4.1 在 `FileTree` 组件中添加右键菜单状态管理：`contextMenu`（包含 `x`, `y`, `nodePath` 信息）
- [x] 4.2 在 `TreeNodeItem` 的行容器上绑定 `onContextMenu` 事件，阻止默认菜单并设置菜单状态
- [x] 4.3 实现 `ContextMenu` 渲染组件：绝对定位、包含"复制相对路径"和"复制绝对路径"菜单项，使用行内样式与项目风格一致
- [x] 4.4 实现菜单定位逻辑：检测是否接近视口边缘，如接近则调整弹出方向
- [x] 4.5 实现点击菜单外区域关闭菜单（通过 `mousedown` 事件监听 document）
- [x] 4.6 实现"复制相对路径"功能：基于 `rootPath` 截取前缀，使用 `navigator.clipboard.writeText()` 写入剪贴板
- [x] 4.7 实现"复制绝对路径"功能：直接使用节点 `path` 属性，使用 `navigator.clipboard.writeText()` 写入剪贴板
- [x] 4.8 将 `rootPath` 从 `FileTree` props 传递到右键菜单上下文，以支持相对路径计算

## 5. 集成验证

- [x] 5.1 验证 CWD 轮询已移除（终端中执行 cd 不再自动触发文件树更新）
- [x] 5.2 验证点击刷新按钮可正确获取终端 CWD 并刷新文件树
- [x] 5.3 验证文件树收起后切换终端 Tab 不触发目录读取
- [x] 5.4 验证文件树展开后自动恢复同步并加载正确目录
- [x] 5.5 验证 `fd` 扫描返回的文件树结构正确，gitignore 文件已排除
- [x] 5.6 验证 `fd` 不可用时回退方案正常工作
- [x] 5.7 验证右键菜单在文件和目录节点上均可触发，复制的相对路径和绝对路径正确
- [x] 5.8 验证右键菜单在视口边缘弹出方向正确，点击外部可关闭
