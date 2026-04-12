## Why

当前文件树按名称字母序排列，用户无法快速找到最近修改或新建的文件/文件夹。在日常使用中，最近操作的文件往往是用户最需要访问的，按时间倒序排列能显著提升查找效率。

## What Changes

- 在文件扫描阶段（主进程）收集每个文件/文件夹的修改时间（`mtime`）
- 将 `ScanTreeNode` 数据模型扩展，增加 `mtime` 字段
- 将四处排序逻辑从按名称字母序改为按修改时间倒序（最新在最上面）
- 保持"目录在前、文件在后"的分组规则不变，仅在每个分组内按时间倒序排列

## Capabilities

### New Capabilities

_无新增能力。_

### Modified Capabilities

- `file-preview`: 文件树排序规则从"按名称排序"变更为"按修改时间倒序排列"，需要在扫描节点数据模型中增加 `mtime` 字段

## Impact

- **数据模型**: `ScanTreeNode` 接口（`main.ts`、`preload.ts`）新增 `mtime` 字段
- **主进程扫描逻辑**: `buildTreeFromPaths()`、`scanAllWithNodeFs()`、`scanWithNodeFs()` 需要获取文件 stat 信息并修改排序比较器
- **fd 扫描路径**: `scanWithFd()` / `scanAllWithFd()` 产出的路径列表不含时间信息，`buildTreeFromPaths()` 需要额外获取 `mtime`
- **IPC 通信**: 序列化数据量略有增加（每节点多一个时间戳字段），影响可忽略
- **渲染层**: `FileTree.tsx` 的 `TreeNode` 类型同步扩展，但无需修改渲染逻辑（排序已在主进程完成）
