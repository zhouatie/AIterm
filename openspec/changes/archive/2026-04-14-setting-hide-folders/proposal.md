## Why

用户在文件树中需要过滤掉某些不关心的文件夹（如 `coverage`、`docs`、`.aws` 等），这些文件夹既不在 gitignore 中，也不在硬编码的排除列表里。当前没有任何用户可配置的忽略机制，导致文件树杂乱，影响效率。

## What Changes

- 设置面板新增「隐藏文件夹」配置项，允许用户自定义需要在文件树中隐藏的文件夹名称列表。
- 隐藏逻辑在后端 `readTreeDirectory()` 及相关扫描函数中实现，读取配置后直接过滤，不在渲染层做二次过滤。
- IPC 选项透传：`fs:read-tree-directory` / `fs:scan-all-files` 的 `options` 字段新增 `hiddenFolderNames` 字段，由渲染层从 `localStorage` 读取后传入。
- 配置持久化至 `localStorage`，与现有 spec 目录名配置保持一致的存储方式。

## Capabilities

### New Capabilities

（无新能力，本次变更属于对现有能力的扩展。）

### Modified Capabilities

- `settings-panel`：新增「隐藏文件夹」配置区，要求在面板中展示、编辑并保存用户自定义的隐藏文件夹名称列表；文件树在加载每一层目录时，须从后端直接排除这些文件夹，而非在前端过滤。

## Impact

- `src/main.ts`：`readTreeDirectory()`、`scanAllTree()`/`scanAllWithFd()`、`scanAllWithNodeFs()` 等扫描函数需读取并应用 `hiddenFolderNames`。
- `src/components/SettingsPanel.tsx`（或同路径设置组件）：新增隐藏文件夹配置 UI。
- `src/utils/file-tree-settings.ts`：新增 `hiddenFolderNames` 的读写工具函数。
- `src/components/FileTree.tsx`：在调用 `readTreeDirectory` / `scanAllFiles` 时，将 `hiddenFolderNames` 注入 `options`。
- 无 API 变更，无破坏性兼容影响。
