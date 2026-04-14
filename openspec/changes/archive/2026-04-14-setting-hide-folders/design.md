## Context

文件树的目录扫描完全在主进程（`src/main.ts`）中完成，通过 `readTreeDirectory()`、`scanAllTree()` 等函数实现多层过滤（隐藏文件、gitignore、硬编码排除列表）。渲染层通过 IPC 接收已过滤的 `ScanTreeNode[]`，再在 `FileTree.tsx` 中渲染。

用户希望能够自定义需要隐藏的文件夹名称，且过滤必须在主进程扫描阶段完成，而非在渲染层做展示过滤。

## Goals / Non-Goals

**Goals:**
- 设置面板新增「隐藏文件夹」配置项，支持用户增删文件夹名称。
- 隐藏逻辑在主进程扫描阶段执行，IPC 返回的结果中不包含被隐藏的文件夹。
- 配置持久化至 `localStorage`，应用重启后生效。
- 覆盖懒加载（`readTreeDirectory`）与全量展开（`scanAllFiles`）两条代码路径。

**Non-Goals:**
- 不支持通配符或正则匹配，只做精确文件夹名匹配。
- 不同 workspace 共用同一份隐藏列表（不做 per-root 隔离）。
- 不影响 `fs:scan-md-files` 通道（该通道仅扫描 `.md` 文件，文件夹隐藏对其无实际意义）。

## Decisions

### 决策 1：在主进程过滤，而非渲染层过滤

**选择**：主进程 `readTreeDirectory()` 直接跳过被隐藏的文件夹，IPC 结果中不含这些节点。

**备选方案**：渲染层收到完整树后，在 `buildVisibleRows()` 或 `toTreeNodes()` 中过滤掉隐藏文件夹。

**拒绝原因**：
- 渲染层过滤只隐藏显示，树的内部状态（`expandedPaths`、搜索索引）仍包含隐藏节点，可能导致状态不一致。
- 后续「展开全部」等操作也会加载隐藏文件夹，需在多处重复过滤。
- 主进程过滤一次即可，逻辑集中，无泄漏风险。

### 决策 2：通过 IPC options 传递隐藏列表

**选择**：渲染层从 `localStorage` 读取 `hiddenFolderNames`，在调用 `window.fileApi.readTreeDirectory(path, options)` 和 `window.fileApi.scanAllFiles(path, options)` 时，将其注入 `options.hiddenFolderNames`。

**备选方案**：主进程从磁盘配置文件读取，或通过单独的 IPC 通道同步。

**拒绝原因**：现有的 `options` 参数已具备扩展性（`spec` 目录名就是通过 options 传递的），复用此机制最小化改动量。主进程读取磁盘配置会引入额外 I/O 和状态同步复杂度。

### 决策 3：与现有 spec 目录名配置保持一致的存储方式

**选择**：使用 `localStorage` 键 `file-tree-hidden-folder-names`，存储 JSON 字符串数组，读写逻辑放在 `src/utils/file-tree-settings.ts`。

**理由**：与 `file-tree-spec-directory-names` 的实现模式完全一致，降低认知负担，减少新增代码量。

## Risks / Trade-offs

- **[风险] 用户误配置后文件夹消失** → 设置面板提供明确的「隐藏文件夹」标签，避免误解；未来可考虑加灰色提示"X 个文件夹已隐藏"。
- **[风险] 全量扫描（fd 路径）漏过滤** → `scanAllWithFd()` 需同步添加 `--exclude` 参数，与 `getExcludedDirNames` 的处理方式一致，需在实现时覆盖所有扫描路径。
- **[取舍] 不支持 per-root 隔离** → 简化实现；如果未来需要，可升级存储格式为 `Record<rootPath, string[]>`。

## Migration Plan

- 无破坏性变更，默认 `hiddenFolderNames` 为空数组，行为与现有版本完全一致。
- 无需数据迁移，直接发布。

## Open Questions

（无）
