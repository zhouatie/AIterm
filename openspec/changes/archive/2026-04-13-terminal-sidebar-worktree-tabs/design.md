## Context

当前终端面板由 `TerminalPanel.tsx` 维护一个扁平 `tabs[]` 列表，顶部 `TerminalTabBar.tsx` 负责渲染单层横向 Tab，`TerminalInstance.tsx` 负责每个 session 的 xterm.js 与 PTY 绑定。现有主进程 / preload 只暴露了 `getCwd` 和 `onCwdChanged`，足够驱动文件树根目录同步，但不足以直接产出“git 分支名优先、否则取目录名”的二级标签名称。

文件树右键菜单已经在渲染层实现了一套通用菜单视图与若干基于路径的动作，但目前仍内嵌在 `FileTree.tsx` 内，尚未抽成 terminal tab 可复用的组件。此次改造既涉及终端面板状态模型，也涉及主进程终端元信息查询链路和右键菜单复用，因此适合先落设计再进入实现。

## Goals / Non-Goals

**Goals:**
- 将终端导航改为左侧双层 workspace / terminal 结构
- 支持 terminal 侧边 tab 栏整体收起 / 展开，并在收起后尽量把空间让给终端内容区
- 点击 `+` 时总是创建新的 `workspace_{index}`，并在其下创建一个新的二级终端
- 支持在一级 workspace 右键菜单中通过 `New Tab` 新增同组二级终端
- 一级 workspace 名称保持稳定，仅允许通过右键菜单 `Rename` 手动修改
- 二级终端名称跟随终端上下文变化：git 仓库显示分支名，非 git 目录显示当前目录最后一级名称
- 复用文件树右键菜单的通用能力，并为 workspace 节点补充 `Rename` / `New Tab`
- 一级、二级名称在空间不足时使用尾部省略号截断

**Non-Goals:**
- 不做 workspace / terminal 的拖拽排序
- 不做 workspace 持久化或重启恢复
- 不做系统原生右键菜单，继续沿用渲染层自绘菜单
- 不做终端分屏或跨窗口拖出

## Decisions

### 决策 1：用树状状态替代当前扁平 Tab 列表

**选择**：在 `TerminalPanel` 内将当前 `TerminalTab[]` 改为 `WorkspaceNode[]`，每个 workspace 持有自己的二级 session 列表、当前活跃子节点、展开状态以及最新路径上下文。

建议的数据结构：
- `workspace.id`
- `workspace.name`
- `workspace.userRenamed`
- `workspace.order`
- `workspace.currentPath`
- `workspace.lastActiveSessionId`
- `workspace.sessions[]`

**理由**：一级与二级节点有不同的命名规则、右键菜单能力和交互职责，继续用单层数组会让“同 workspace 下新增 session”“一级右键菜单重命名”“空 workspace 自动移除”等逻辑变得别扭。树状状态更接近最终 UI，也更容易把行为限制在 `TerminalPanel` 内部。

**替代方案**：保留扁平 session 列表，再额外用映射关系维护 workspace 分组。这样会把排序、关闭、激活状态拆散到多份状态里，维护成本更高。

### 决策 2：直接升级终端元信息接口，而不是保留仅有 cwd 的旧接口

**选择**：将当前仅返回 `cwd` 的接口升级为统一的 session info 通道，由主进程基于 session 的最新 cwd 计算：
- `cwd`
- `isGitRepo`
- `branchName`
- `displayLabel`

同时让 `FilePreviewPanel` 与 terminal 侧边栏都消费这份统一元信息，而不是一个模块订阅 `cwdChanged`、另一个模块再自行补 git 信息。

**理由**：渲染进程禁用了 `nodeIntegration`，不能在前端直接调用 git 命令；继续只传 `cwd` 会迫使前端多打一轮 IPC 或引入重复逻辑。把 git 分支解析放在主进程最直接，也能保证文件树和 terminal 导航看到的是同一份 session 上下文。

**替代方案**：保留 `getCwd` / `onCwdChanged`，再新增一套查询分支名的 IPC。这样会把同一份终端上下文拆成两套接口，而且与“不要写兼容性代码”的约束相违背。

### 决策 3：一级 workspace 名称与路径上下文拆开维护

**选择**：workspace 的展示名称只在两个时机变化：
- 新建时自动命名为 `workspace_{index}`
- 用户通过右键菜单 `Rename` 主动修改

终端 cwd 变化只更新 workspace 的 `currentPath` 和二级 session 的显示名，不再改动一级展示名称。

**理由**：用户已经明确要求一级名称不跟随目录自由变化。为了同时支持右键菜单中的路径类动作和同 workspace 下继续新增二级 terminal，workspace 仍需要保留一份“当前路径上下文”，但这份路径上下文不应该再驱动一级标题。

**替代方案**：让 workspace 名称继续绑定当前路径。这样会破坏用户对 workspace 作为“手动管理容器”的预期。

### 决策 4：同 workspace 下的 `New Tab` 继承 workspace 的当前路径上下文

**选择**：从一级 workspace 右键菜单触发 `New Tab` 时，新 session 的初始工作目录使用该 workspace 的 `currentPath`；若尚未解析到有效路径，则回退到用户 HOME 目录。

**理由**：既然一个 workspace 代表同一组开发上下文，在它下面继续创建 terminal 时，默认进入该 workspace 当前对应的路径比重新落到 HOME 更符合“并行维护同一项目多个 worktree”的目标。

**替代方案**：一级菜单下的新 terminal 仍一律从 HOME 启动。这样会让同 workspace 的新增 terminal 失去分组意义，用户还需要再次手动 `cd`。

### 决策 5：抽出共享的路径右键菜单组件，workspace 菜单在其上扩展

**选择**：把 `FileTree.tsx` 里现有的右键菜单视图与路径类动作抽成共享组件 / action 集，然后：
- 二级 terminal 节点直接复用文件树同款路径动作
- 一级 workspace 节点在同样的菜单里额外插入 `New Tab` 和 `Rename`

`Rename` 触发后进入一级节点的行内编辑态，而不是再弹独立对话框。

**理由**：用户明确要求继承文件树右键菜单的所有功能。抽共享组件比复制一份几乎相同的菜单更稳，后续扩展菜单项也更统一。

**替代方案**：为 terminal tab 单独再写一套右键菜单。实现快，但会制造重复代码和视觉漂移。

### 决策 6：侧边导航只以二级 terminal 为“可激活终端”，一级 workspace 负责组织与展开

**选择**：活跃终端始终对应某个二级节点；一级 workspace 主要负责：
- 展开 / 收起子节点
- 暴露右键菜单
- 作为二级节点的分组容器

点击二级节点切换终端；点击一级节点切换展开状态，不直接切换终端会话。

**理由**：终端实例本质上仍然是一对一的 session，对应关系最清晰的是二级节点。让一级节点承担“结构管理”而不是“另一个可激活终端层级”，可以减少状态歧义。

**替代方案**：点击一级节点自动切到该 workspace 最近活跃的子节点。这个交互也成立，但会让“展开”和“切换终端”绑在同一个点击动作上，误触成本更高。

### 决策 7：侧边栏收起只影响导航宽度，不影响终端与 workspace 内部状态

**选择**：为 terminal 面板增加独立的 `sidebarCollapsed` UI 状态。收起时：
- 左侧导航压缩到仅保留一个稳定可点击的展开入口
- workspace 树、展开状态、活跃二级终端、右键菜单能力的内部数据全部保留
- 主终端内容区自动获得释放出的横向空间

展开后恢复原导航宽度与之前的 workspace 展开状态，不重新初始化 session。

**理由**：用户补充的需求本质上是“导航可折叠”，不是“导航销毁重建”。如果把收起做成条件卸载，会把当前 workspace 的展开态、滚动位置甚至可能的行内重命名态全部丢掉，交互会很毛躁。

**替代方案**：收起时完全隐藏并卸载侧边导航。实现更快，但会造成状态丢失和明显闪烁。

## Risks / Trade-offs

- **[git 分支查询频繁触发]** → 只在 session cwd 发生变化时刷新分支信息，并缓存同一路径的最近解析结果，避免每次 PTY 输出都重复跑 git 命令
- **[workspace 当前路径与多个子 terminal 之间可能出现偏差]** → 以该 workspace 的最近活跃二级 terminal 的路径作为 `currentPath`，保证右键菜单与 `New Tab` 的默认路径都有明确来源
- **[侧边栏宽度比原横向 Tab 更紧]** → 一级、二级标题统一使用单行 `ellipsis`，避免因为长分支名或长目录名把布局撑坏
- **[收起 / 展开切换导致布局跳动]** → 用固定的展开宽度和固定的收起宽度，并在切换后只触发活跃终端一次尺寸适配
- **[右键菜单抽取会影响 FileTree 现有行为]** → 优先抽菜单视图和动作定义，保留 FileTree 的调用方式不变，再让 terminal tab 接入同一套组件

## Migration Plan

1. 先升级终端 session info 接口，并同步改造 `FilePreviewPanel` 的调用点
2. 再把 `TerminalPanel` 的状态改成 workspace 树，并替换掉当前顶部 `TerminalTabBar`
3. 为新侧边导航接入整体收起 / 展开状态和宽度切换
4. 最后接入共享右键菜单、一级重命名与二级名称同步逻辑
5. 若实现过程中出现严重交互回归，可暂时回退到旧 `TerminalTabBar` 组件，同时保留新的 session info 链路

## Open Questions

- 无。当前交互规则已经由用户确认完毕。
