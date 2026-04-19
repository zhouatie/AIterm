## Why

当前笔记模块把 `最近`、`收藏`、`全部` 三种视图与文件树导航混在一起，导致左侧导航的信息架构分裂、交互语义不稳定，也无法承载“在应用里切换当前 Obsidian Vault”的新需求。现在需要把笔记模块收敛成更接近 Obsidian 文件浏览器心智的单一 Vault Explorer，让用户先切换当前 Vault，再在该 Vault 内完成树形浏览与编辑。

## What Changes

- 将笔记模块从“单笔记目录 + 最近/收藏/全部视图”重构为“当前 Vault 切换器 + 当前 Vault 文件树 + 单文档编辑区”。
- 移除左侧 `最近`、`收藏` 视图 rail 及其对应导航模式，左侧仅保留当前 Vault 的单一文件树。
- 将文件夹交互改为“单击只选中，展开/收起仅由箭头触发”，避免目录选择与展开动作耦合。
- 去掉文件与文件夹节点上的双击重命名入口，将重命名收敛为显式操作，降低误触风险。
- 重做笔记文件树的顶部控制区与节点视觉层级，收敛为搜索、`新建笔记`、`新建文件夹`、`更多` 这组高频入口。
- 为当前 Vault 文件树补齐基础右键菜单，仅保留笔记场景的核心文件操作。
- 为当前 Vault 文件树补齐文件与文件夹拖拽移动能力，支持把节点移动到其他文件夹下。
- 将当前单一 `noteDir` 配置升级为可持久化的 Vault 列表与当前激活 Vault，使用户可以在应用内切换当前 Vault。

## Capabilities

### New Capabilities
- `note-vault-switching`: 管理多个已保存 Vault、切换当前激活 Vault，并驱动笔记面板与设置面板同步使用当前 Vault。

### Modified Capabilities
- `note-navigation`: 移除 `最近` / `收藏` / `全部` 视图导航，改为面向当前 Vault 的单一文件树导航与上下文恢复。
- `note-panel`: 将笔记工作台布局改为 Vault Explorer 结构，并重定义文件树交互、顶部工具区与右键菜单。
- `note-storage`: 从单个笔记目录配置扩展为 Vault 列表与当前 Vault 的存储模型。
- `settings-panel`: 将笔记目录配置调整为 Vault 管理入口，支持维护多个 Vault 并切换当前激活项。

## Impact

- 受影响代码：`src/components/NotePanel.tsx`、`src/components/NoteFileList.tsx`、`src/components/ContextMenu.tsx`、`src/components/SettingsPanel.tsx`、`src/utils/note-settings.ts`、`src/utils/note-workbench-state.ts`、以及文件树拖拽移动涉及的路径更新与文件系统调用逻辑。
- 受影响状态：现有 `recent` / `favorites` / `activeView` 笔记导航状态将被移除或迁移。
- 受影响体验：笔记模块左侧导航、右键菜单、当前目录选择行为、设置面板中的笔记目录配置入口都会发生变化。
