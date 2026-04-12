## 1. 全部文件扫描 IPC 通道

- [x] 1.1 在 `src/main.ts` 中新增 `scanAllWithFd` 函数，使用 `fd --type f --no-hidden --exclude node_modules --exclude .git --exclude dist --exclude build --exclude out --exclude .next` 扫描全部文件，复用 `buildTreeFromPaths` 构建树
- [x] 1.2 在 `src/main.ts` 中新增 `scanAllWithNodeFs` 回退函数，递归遍历目录，排除隐藏文件、gitignore 文件和常见大目录，返回所有文件的树结构
- [x] 1.3 在 `src/main.ts` 中注册 `fs:scan-all-files` IPC handler，与 `fs:scan-md-files` 逻辑对称，优先使用 `fd`，失败回退 Node.js
- [x] 1.4 在 `src/preload.ts` 的 `FileApi` 接口中新增 `scanAllFiles(rootPath: string)` 方法，调用 `fs:scan-all-files` IPC 通道

## 2. 文件类型过滤切换 UI

- [x] 2.1 在 `src/components/FileTree.tsx` 的 `ToolbarProps` 中新增 `mdOnly: boolean` 和 `onToggleMdOnly: () => void` 属性
- [x] 2.2 在 `Toolbar` 组件中刷新按钮左侧新增过滤切换按钮，使用 lucide-react 的 `FileText`（mdOnly=true）/ `Files`（mdOnly=false）图标，附带 `title` tooltip
- [x] 2.3 在 `FileTree` 组件中接收 `mdOnly` prop，根据其值在 `useEffect` 中调用 `window.fileApi.scanMdFiles` 或 `window.fileApi.scanAllFiles`
- [x] 2.4 在 `src/components/FilePreviewPanel.tsx` 中管理 `mdOnly` 状态（默认 `true`），从 `localStorage` 读取/写入持久化偏好，传递给 `FileTree`

## 3. 右键菜单增强

- [x] 3.1 在 `src/components/FileTree.tsx` 的 `ContextMenu` 组件中新增"复制文件名"菜单项，位于"复制相对路径"之前
- [x] 3.2 实现 `handleCopyFileName` 函数，从 `nodePath` 中提取文件名（`path.split('/').pop()`），调用 `navigator.clipboard.writeText` 写入剪贴板
- [x] 3.3 在 `src/main.ts` 中注册 `fs:show-in-folder` IPC handler，调用 `shell.showItemInFolder(path)` 打开系统文件管理器
- [x] 3.4 在 `src/preload.ts` 的 `FileApi` 接口中新增 `showInFolder(filePath: string)` 方法
- [x] 3.5 在 `ContextMenu` 组件末尾新增"在访达中显示"菜单项，点击后调用 `window.fileApi.showInFolder(nodePath)`

## 4. 终端 CWD 变化检测与推送

- [x] 4.1 在 `src/pty-manager.ts` 中为 `PtySession` 新增 `lastKnownCwd: string` 字段，初始值为创建时的 `cwd`
- [x] 4.2 在 `src/pty-manager.ts` 中新增 `checkAndUpdateCwd(id: string)` 函数，调用 `getSessionLiveCwd` 比较与 `lastKnownCwd`，若不同则更新并返回新 CWD，否则返回 `null`
- [x] 4.3 在 `src/main.ts` 的 `session.ptyProcess.onData` 回调中，新增节流逻辑（1 秒节流），调用 `checkAndUpdateCwd`，若返回新 CWD 则通过 `mainWindow.webContents.send('terminal:cwdChanged', { id, cwd })` 推送
- [x] 4.4 在 `src/preload.ts` 中为 `TerminalApi` 新增 `onCwdChanged(callback)` 方法，监听 `terminal:cwdChanged` 事件，返回取消监听函数

## 5. 文件树自动响应 CWD 变化

- [x] 5.1 在 `src/components/FilePreviewPanel.tsx` 中新增 `useEffect`，调用 `window.terminalApi.onCwdChanged` 监听 CWD 变化事件
- [x] 5.2 当收到的 CWD 变化事件对应当前 `activeSessionId` 且新 CWD 与当前 `rootPath` 不同时，更新 `rootPath` 触发文件树刷新
- [x] 5.3 确保 effect cleanup 中调用返回的取消监听函数，避免内存泄漏
