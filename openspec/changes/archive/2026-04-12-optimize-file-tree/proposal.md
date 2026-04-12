## Why

当前文件树模块存在多个体验和性能问题：(1) 始终展开且持续通过 2 秒轮询跟踪终端 CWD，即使不需要查看文件树时也在消耗资源；(2) 缺少右键菜单功能，无法快速复制路径；(3) 目录加载慢——`fs:readdir` 对每个子目录递归调用 `directoryContainsMarkdown()`（深度 5），每层还要 spawn `git check-ignore` 子进程，目录多时耗时严重。

## What Changes

- **移除 CWD 轮询**：去掉 2 秒定时器，改为手动刷新模式，在 toggle icon 旁增加一个刷新按钮
- **展开/收起切换**：在应用顶部（traffic lights 右侧）增加 toggle icon，收起整个左栏（文件树+预览），终端面板占满全宽；展开时恢复分栏布局。使用 `localStorage` 持久化展开/收起状态
- **右键上下文菜单**：为文件/目录节点添加右键菜单，支持"复制相对路径"和"复制绝对路径"
- **文件树加载性能优化**：用 `fd` 命令一次性扫描所有 `.md` 文件，替代逐目录递归 + `git check-ignore` 子进程的方式，大幅提升加载速度

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `file-preview`: 移除 CWD 轮询、增加手动刷新按钮、增加文件树展开/收起切换、右键菜单支持复制相对/绝对路径、用 `fd` 优化目录加载性能

## Impact

- **受影响代码**：`App.tsx`（toggle 状态、`localStorage` 持久化、`SplitLayout.leftCollapsed`）、`SplitLayout.tsx`（新增 `leftCollapsed` prop）、`FilePreviewPanel.tsx`（移除轮询、新增 `visible` prop）、`FileTree.tsx`（刷新 UI、右键菜单）、`main.ts`（`fs:scan-md-files` IPC handler）、`TerminalTabBar.tsx`（paddingLeft 调整）
- **UI 变更**：应用顶部（traffic lights 右侧）新增 toggle icon，收起时左栏完全隐藏；文件树工具栏新增刷新按钮；文件/目录节点新增右键菜单（复制相对路径、复制绝对路径）
- **性能**：移除 2s 轮询、用 `fd` 替代递归遍历 + `git check-ignore`，大幅减少 IPC 和子进程开销
- **依赖**：运行时依赖系统安装的 `fd` 命令；无新增 npm 依赖（使用已有的 `lucide-react` 图标库）
