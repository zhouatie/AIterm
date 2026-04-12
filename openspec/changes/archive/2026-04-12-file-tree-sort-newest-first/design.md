## Context

当前文件树排序逻辑为"目录在前、文件在后，按名称字母序排列"，分布在主进程 `src/main.ts` 的四处：
1. `buildTreeFromPaths()` —— fd 扫描路径构建树时排序（行 322、334）
2. `scanAllWithNodeFs()` —— Node.js 全文件扫描回退（行 416-418）
3. `scanWithNodeFs()` —— Node.js Markdown 扫描回退（行 488-490）
4. 渲染层不做排序，直接使用主进程返回的顺序

现有 `ScanTreeNode` 数据模型仅包含 `name`、`path`、`isDirectory`、`children`，不携带任何时间戳信息。

## Goals / Non-Goals

**Goals:**
- 文件树中同级节点按修改时间（`mtime`）倒序排列，最近修改的排在最上面
- 保持"目录在前、文件在后"的分组规则
- 在 fd 扫描和 Node.js 回退两条路径中均支持按时间排序

**Non-Goals:**
- 不提供排序方式切换 UI（本次仅实现按时间排序，替换原有按名称排序）
- 不在渲染层实现排序逻辑（继续由主进程统一排序）
- 不为目录计算"子文件最新 mtime"来排序目录本身（目录使用其自身的 `mtime`）

## Decisions

### 决策 1：mtime 获取方式

**选择**：在 Node.js 回退路径中使用 `fs.promises.stat()` 获取 `mtime`；在 fd 路径中使用 `fs.promises.stat()` 批量获取各节点的 `mtime`。

**备选方案**：
- fd 的 `--changed-within` / `--changed-before` 参数：这些只能过滤而非排序，且不返回精确时间戳
- fd 配合 `--exec stat` 输出时间：跨平台 stat 格式不一致，解析复杂

**理由**：fd 本身不支持输出文件修改时间，但 `buildTreeFromPaths()` 已经在构建树结构后拥有所有文件路径，可以在构建树的同时或之后使用 `fs.promises.stat()` 获取 `mtime`。Node.js 回退路径中 `readdir` 已经在逐目录遍历，加一次 `stat` 调用开销很小。

### 决策 2：数据模型扩展

**选择**：在 `ScanTreeNode` 接口添加可选字段 `mtime?: number`（Unix 毫秒时间戳）。

**理由**：使用 `number` 类型便于比较排序，可选字段保持向后兼容。渲染层的 `TreeNode` 也同步添加该字段但不影响现有渲染逻辑。

### 决策 3：排序比较器

**选择**：排序逻辑改为：先按 `isDirectory` 分组（目录优先），同组内按 `mtime` 降序排列。若 `mtime` 相同则回退到名称字母序作为稳定排序的 tiebreaker。

**备选方案**：
- 纯 mtime 排序不分组：会导致文件和目录混合排列，降低可读性
- 仅在渲染层排序：增加 IPC 数据传输和渲染层复杂度

### 决策 4：fd 路径的 stat 调用策略

**选择**：在 `buildTreeFromPaths()` 构建完树结构后，对每个节点（包括推断出的目录节点）使用 `fs.promises.stat()` 获取 `mtime`，然后对子节点列表排序。

**理由**：fd 输出的路径列表已经是完整的，树构建后节点数量有限（受 UI 展示限制），stat 调用的性能开销可控。使用 `Promise.all` 可以并行获取多个文件的 stat 信息。

## Risks / Trade-offs

- **[性能]** fd 路径新增 stat 调用增加 I/O → 使用 `Promise.all` 并行化 stat 调用，实际增加的延迟在大多数项目中可忽略（通常文件数 < 几千）
- **[目录 mtime 语义]** 目录的 `mtime` 反映的是目录元数据变化（如新增/删除子文件），而非子文件内容变化 → 这是文件系统标准行为，符合用户对"最近有变动的目录"的预期
- **[排序稳定性]** mtime 相同时排序不确定 → 使用名称字母序作为 tiebreaker 保证稳定排序
