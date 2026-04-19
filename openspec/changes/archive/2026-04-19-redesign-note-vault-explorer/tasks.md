## 1. Vault 数据模型与迁移

- [x] 1.1 将 `src/utils/note-settings.ts` 从单一 `noteDir` 模型升级为 `vaults + activeVaultId` 的持久化读写接口
- [x] 1.2 实现旧 `note-directory` 配置向新 Vault 注册表的首次迁移，并保留默认 `{userData}/notes` Vault 的创建逻辑
- [x] 1.3 重构 `src/utils/note-workbench-state.ts`，移除 `activeView`、`recent`、`favorites`，改为按 Vault 维度持久化 `selectedFolderPath` 与 `currentNotePath`

## 2. NotePanel 与当前 Vault Explorer

- [x] 2.1 重构 `src/components/NotePanel.tsx`，接入当前 Vault 读取、Vault 切换与按 Vault 恢复上下文的加载流程
- [x] 2.2 移除笔记面板中的 `最近/收藏/全部` rail 与相关状态分支，收敛为“当前 Vault Explorer + 编辑区”的两段式布局
- [x] 2.3 调整笔记面板顶部与空状态文案，使其围绕“当前 Vault”而不是“当前视图”组织

## 3. 笔记文件树交互与右键菜单

- [x] 3.1 重构 `src/components/NoteFileList.tsx` 顶部控制区，加入当前 Vault 切换器、搜索、新建笔记、新建文件夹与 `更多` 入口
- [x] 3.2 调整树节点交互为“文件夹单击只选中、箭头负责展开/收起、文件单击打开”，并保证当前文档自动保持可见
- [x] 3.3 移除树节点上的 hover 删除按钮，改为接入笔记文件树的基础右键菜单
- [x] 3.4 复用并扩展 `src/components/ContextMenu.tsx`，为空白区、文件夹节点和笔记节点接入最小菜单集合
- [x] 3.5 去掉文件与文件夹节点的双击重命名行为，仅保留显式重命名入口
- [x] 3.6 为文件与文件夹实现可实际使用的拖拽移动能力，并同步更新当前文档与上下文路径

## 4. 设置面板中的 Vault 管理

- [x] 4.1 将 `src/components/SettingsPanel.tsx` 的单笔记目录输入改为 Vault 管理区，展示已保存 Vault 列表与当前激活项
- [x] 4.2 实现新增 Vault 的路径校验、去重和保存逻辑，并与 `note-settings` 新接口对接
- [x] 4.3 实现从设置面板切换当前激活 Vault 后驱动笔记面板刷新当前 Vault 内容

## 5. 验证与收尾

- [x] 5.1 手工验证默认 Vault、旧 `note-directory` 迁移、自定义 Vault 保存与当前 Vault 切换流程
- [x] 5.2 手工验证文件树搜索、文件夹单击选中、箭头展开、右键菜单、新建/重命名/删除在当前 Vault 下的行为
- [x] 5.3 手工验证文件与文件夹双击都不会进入重命名，以及显式重命名入口仍然可用
- [x] 5.4 手工验证文件与文件夹都可被拖起、拖拽移动、非法落点拒绝、当前文档路径同步与树刷新行为
- [x] 5.5 手工验证重新打开笔记面板或切换回某个 Vault 时，上下文恢复与空状态降级是否符合 spec
