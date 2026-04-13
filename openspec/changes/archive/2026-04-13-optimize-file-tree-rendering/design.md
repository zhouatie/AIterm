## Context

文件树已经有全量扫描和虚拟列表渲染，但进入大根目录时，主进程仍需要先扫描完整子树，再传给渲染进程。虚拟列表只能减少 DOM 挂载，不能避免全量扫描、mtime stat、IPC 序列化的成本。

新的加载策略是：任意根目录初次都只读取第一层；用户点击目录时再读取该目录的下一层。非高层目录仍保留“展开全部”按钮，点击后才执行全量扫描并展开所有目录。高层目录隐藏“展开全部”，避免用户误触导致扫描系统级目录。

## Goals / Non-Goals

**Goals:**

- 初次加载任何根目录时只请求第一层节点。
- 点击折叠目录时，只请求该目录的直接子节点，并将结果缓存到该节点下。
- 高层目录隐藏“展开全部”按钮。高层目录定义为文件系统根目录、`/Users`、当前用户 Home。
- 非高层目录保留“展开全部”按钮，点击后使用现有全量扫描 IPC 获取完整树并展开所有目录。
- 保留固定行高虚拟列表，限制大量可见节点下的 DOM 挂载数量。
- 保持 Markdown-only / 全部文件切换、刷新、文件选择、右键菜单行为。

**Non-Goals:**

- 不为高层目录提供展开全部。
- 不新增第三方虚拟列表依赖。
- 不调整 Markdown/代码预览渲染逻辑。
- 不改变文件读取大小限制。

## Decisions

### 决策 1：新增直接子节点读取 IPC

**选择**：新增 `fs:read-tree-directory` IPC，参数为 `dirPath` 和 `mdOnly`，返回 `ScanTreeNode[]`，每个节点包含 `name`、`path`、`isDirectory`、`mtime`。目录节点初始不携带 children。

**理由**：

- 现有 `fs:readdir` 返回结构不含 `path` / `mtime`，且 Markdown 模式下会递归检查 containsMarkdown，正是高层目录慢的来源之一。
- 现有 `scanMdFiles` / `scanAllFiles` 保留给“展开全部”使用，不适合作为初始加载。

### 决策 2：Markdown-only 模式下目录始终显示

**选择**：`mdOnly=true` 时，直接子节点读取显示目录和 `.md` 文件；非 Markdown 文件隐藏。

**理由**：

- 初次只读第一层时无法廉价判断目录深处是否包含 Markdown。
- 保留目录可让用户一层层进入查找 Markdown；空目录展开后显示为空即可。

### 决策 3：目录节点按需加载并缓存 children

**选择**：`FileTree` 点击目录展开时，如果节点还没有加载过 children，则调用 `readTreeDirectory(node.path, mdOnly)`，将结果写回对应节点；之后折叠/展开复用缓存。

**理由**：

- 避免重复请求同一目录。
- 保留现有 `expandedPaths` 作为展开状态来源。
- 切换 rootPath、refreshKey 或 mdOnly 时重置树和缓存。

### 决策 4：非高层目录点击展开全部时再全量扫描

**选择**：toolbar 的“展开全部”按钮只在非高层目录显示。点击时调用现有 `scanMdFiles` / `scanAllFiles`，替换当前树为完整树，然后收集所有目录路径写入 `expandedPaths`。

**理由**：

- 普通项目目录通常规模可控，展开全部仍是有用能力。
- 只有用户明确点击后才产生全量扫描成本。
- 全量展开后的渲染仍由虚拟列表保护 DOM 数量。

### 决策 5：高层目录隐藏展开全部

**选择**：高层目录为：

- 文件系统根目录，例如 `/`
- `/Users`
- 当前用户 Home，例如 `/Users/zhoushitie`

这些 rootPath 下 toolbar 不显示展开全部按钮。

**理由**：

- 这些目录下全量扫描收益低、风险高、耗时不可控。
- 用户仍可手动一层层展开。

### 决策 6：Spec 模式不读取根目录全量 entry

**选择**：spec 模式加载根目录时，主进程不调用 `readdir(rootPath)` 后再过滤；而是按配置的 spec 目录名直接构造 `rootPath/specName`，逐个 `stat` 已存在的目录，并读取这些 spec 目录的第一层内容。

**理由**：

- 大根目录下 `readdir(rootPath)` 本身可能很慢，尤其是 Home 或聚合工作区。
- 配置目录名数量很少，直接访问目标路径能把初始 IO 成本限制在 spec 目录集合内。
- 返回的树仍以 spec 目录作为父节点，后续目录展开继续使用按需加载。

### 决策 7：Spec 模式展开全部只扫描 spec 目录树

**选择**：展开全部在 spec 模式下向全量扫描 IPC 传入配置目录名；主进程只扫描存在的 `rootPath/specName` 目录，并把结果挂到对应 spec 目录节点下。

**理由**：

- 避免 spec 模式下误扫并展开项目根目录的非 spec 文件夹。
- 保持“展开全部”结果与 spec 模式可见范围一致。
- 仍复用现有全量扫描和虚拟列表渲染能力。

## Risks / Trade-offs

- **[风险] Markdown-only 模式会显示不含 Markdown 的目录** → 这是避免深度探测的性能取舍；展开为空即可。
- **[风险] 展开目录期间没有逐节点 loading 反馈** → 初版保持最小改动；必要时后续为目录行加加载状态。
- **[风险] 展开全部后仍可能有大量可见行** → 虚拟列表限制 DOM 挂载；扫描成本只在用户主动点击后发生。
- **[风险] 高层目录判定不覆盖所有大目录** → 先按 `/`、`/Users`、Home 处理；后续可扩展为配置项。

## Migration Plan

1. 新增 preload 类型和主进程 `fs:read-tree-directory` IPC。
2. `FileTree` 初始加载改为 `readTreeDirectory(rootPath, mdOnly)`。
3. `FileTree` 展开目录时按需加载该目录直接子节点并缓存。
4. toolbar 根据 rootPath 判断是否显示展开全部。
5. 非高层目录展开全部时调用现有全量扫描，并展开全部目录路径。
6. 运行 TypeScript 检查，手动验证根目录、Home、普通项目目录三种入口。
