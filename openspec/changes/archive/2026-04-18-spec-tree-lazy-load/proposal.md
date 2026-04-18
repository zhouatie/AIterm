## Why

Spec 模式下文件树加载慢。根因是 `readSpecRootDirectory()` 会预加载每个 spec 目录的子项（readdir + git check-ignore + stat×N），再加上前端串行恢复展开状态的循环，展开目录越多，初始加载越慢。非 spec 模式只加载第一层、按需展开，体验流畅。Spec 模式应采用相同策略。

## What Changes

- **后端** `readSpecRootDirectory()` 不再递归调用 `readTreeDirectory()` 预加载 spec 目录子项，只返回 spec 目录本身（name、path、mtime），children 留空
- **前端** `loadTree()` 移除 spec 目录自动展开逻辑，spec 目录和普通目录一样以折叠状态呈现，由用户点击或展开状态恢复机制按需加载
- **前端** 展开状态恢复流程无需特殊处理，与非 spec 模式行为统一

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `file-preview`：明确 spec 模式初始加载只返回 spec 目录条目本身，不预加载子项；移除 spec 目录自动展开行为

## Impact

- `src/main.ts`：`readSpecRootDirectory()` 函数简化，不再调用 `readTreeDirectory` 获取子项
- `src/components/FileTree.tsx`：`loadTree()` 中移除 spec 根目录自动展开逻辑（约 10 行）
- 用户行为变化：开启 spec 模式后看到的是折叠的 spec 目录列表，需点击展开（与非 spec 模式一致）
