## Context

当前 spec 模式加载流程与非 spec 模式存在结构性差异：

| | 非 spec 模式 | spec 模式（当前） |
|---|---|---|
| 初始 IPC | 1 次 readdir（根目录） | N 次 readdir（每个 spec 目录） + N 次 git check-ignore |
| 返回数据 | 第一层条目，children 未加载 | spec 目录 + 子项已加载 |
| 展开行为 | 全部折叠，用户按需点击 | spec 目录自动展开 |
| 恢复展开 | 串行循环恢复之前展开的路径 | 同左，但因自动展开导致基数更大 |

`readSpecRootDirectory()` 为每个 spec 目录调用 `readTreeDirectory()`，内含 `readdir` + `git check-ignore`（spawn 子进程）+ N 次 `stat`。前端收到结果后还有自动展开逻辑和串行展开恢复循环。三者叠加导致 spec 目录越多、展开层级越深，加载越慢。

## Goals / Non-Goals

**Goals:**

- spec 模式初始加载行为与非 spec 模式统一：只返回第一层条目（spec 目录本身），不预加载子项
- 消除 spec 模式专有的自动展开逻辑，展开行为完全交给通用的展开状态恢复机制
- 减少首次加载的 IPC 调用数和子进程 spawn 数

**Non-Goals:**

- 不改变展开状态恢复机制（串行循环），该问题是通用问题，不在本次范围
- 不改变 spec 模式"展开全部"功能（`scanAllSpecDirectories`）
- 不改变 `git check-ignore` 的调用策略

## Decisions

### 决策 1：`readSpecRootDirectory()` 只返回 spec 目录条目，不加载子项

**选择**：`readSpecRootDirectory()` 对每个 spec 目录只做 `fs.stat()` 获取 mtime，不调用 `readTreeDirectory()` 读取子项。返回的 `ScanTreeNode` 的 `children` 字段为 `undefined`。

**备选方案**：保留预加载但并行化（`Promise.all` 读取所有 spec 目录子项）。

**为什么选当前方案**：并行化虽能缩短时间，但仍然多做了不必要的工作。与非 spec 模式对齐更简单、更一致，且展开状态恢复机制已经能处理后续按需加载。

### 决策 2：移除前端 spec 目录自动展开逻辑

**选择**：删除 `loadTree()` 中 lines 644-653 的 spec 根目录自动展开代码。spec 目录初始呈折叠状态，由展开状态恢复机制（lines 655-676）统一处理。

**理由**：
- 如果用户之前展开过 spec 目录，恢复机制会自动展开
- 如果是首次进入 spec 模式，用户手动点击展开（与非 spec 模式体验一致）
- 减少一个特殊分支，代码更简单

## Risks / Trade-offs

**[用户体验微变] 首次进入 spec 模式需手动展开**
→ 之前自动展开 spec 目录，现在首次需点击。但只影响"第一次"——之后展开状态会被记住并自动恢复。可接受的折中。

**[展开恢复仍串行] 展开目录多时恢复仍有延迟**
→ 本次不改造恢复机制。但由于初始加载大幅加速（只做 stat 不做 readdir），整体感知会好很多。后续可独立优化恢复循环（并行化、渐进式加载等）。
