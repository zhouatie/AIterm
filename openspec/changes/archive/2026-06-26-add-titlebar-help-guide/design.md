## Context

AIterm 当前标题栏已经承载文件树开关、主题切换、Live View、开发者工具、Agent Inbox、版本号与更新检查。应用内也已经具备 agent hook 通知链路：主进程提供本地通知入口，PTY 会话注入 `AITEM_*` 环境变量，`scripts/aiterm-notify.mjs` 负责把 Codex / Claude Code hook 事件转成 terminal agent status。

现有安装说明主要在 `docs/codex-hook-notifications.md`，用户需要知道文档位置并离开主工作流才能查看。这个变更把帮助入口放到标题栏，通过应用内面板展示使用指南和 hook 安装说明。

## Goals / Non-Goals

**Goals:**
- 在标题栏提供一个问号帮助入口，并保持既有标题栏控件和拖拽区域可用。
- 提供应用内帮助面板，覆盖核心入口说明、agent hook 安装、验证和排查。
- 允许用户复制 hook 配置片段和验证命令，降低手动配置成本。
- 复用现有 UI 风格、图标按钮交互和主题变量。

**Non-Goals:**
- 不自动修改用户的全局 Codex 配置文件。
- 不改变 agent 通知入口、token 校验、PTY 环境注入或系统通知行为。
- 不引入新的文档渲染依赖或外部服务。
- 不在第一版覆盖完整在线文档系统。

## Decisions

### 决策 1：帮助入口放在标题栏右侧元信息区

新增问号按钮使用 icon-only 形式，复用标题栏现有按钮尺寸、hover 行为和 `WebkitAppRegion: no-drag` 设置。入口位置放在标题栏右侧元信息区末尾，靠近版本号和更新检查，使它成为稳定的右上角帮助入口；右侧文本信息继续通过收缩和省略号避免与帮助入口重叠。

替代方案是把帮助入口放入设置面板。设置入口当前不是标题栏常驻控件，用户不容易发现；本需求明确要求“顶部增加一个问号”，因此标题栏常驻入口更符合预期。

### 决策 2：帮助内容使用应用内面板而不是外部文档跳转

点击问号后显示应用内帮助面板，采用覆盖层或弹出面板承载结构化内容。面板内按“使用指南”和“Agent Hook 安装”分区，让用户不用离开 AIterm 即可查看步骤。

替代方案是点击问号直接打开 `docs/codex-hook-notifications.md` 或 GitHub 页面。该方案实现更小，但无法满足“查看当前应用程序的使用指南”的完整目标，也不利于复制关键片段。

### 决策 3：第一版提供复制片段，不做一键安装

帮助面板提供 Codex hook `config.toml` 片段、验证命令和排查要点的复制操作，但不自动写入 `~/.codex/config.toml`。写用户全局配置涉及合并 TOML、保留现有 hooks、避免重复追加、处理 `CODEX_HOME` 和容器路径等问题，需要单独确认交互和失败回滚。

替代方案是一键安装。它能减少手动步骤，但会触碰用户全局配置，且本项目已有规则要求不确定设计先问 atie；因此第一版先把自动安装作为开放问题。

### 决策 4：帮助文案以组件内结构化内容维护

第一版将帮助内容写成结构化 React 内容和常量片段，直接复用现有文档中的关键步骤。这样无需新增 Markdown 文件读取 IPC 或打包资源处理，也便于在 UI 中加入复制按钮。

替代方案是运行时读取 `docs/codex-hook-notifications.md` 并渲染 Markdown。该方案能减少内容重复，但需要处理打包后资源路径、Markdown 渲染样式和代码块复制，复杂度高于当前需求。

## Risks / Trade-offs

- [Risk] 帮助内容与 `docs/codex-hook-notifications.md` 后续出现漂移。→ Mitigation: 在实现时将面板内容限定为关键步骤，并在任务中要求对照现有文档更新。
- [Risk] 标题栏按钮增加后窄窗口空间不足。→ Mitigation: 复用现有按钮尺寸，保持版本号和更新状态文本可收缩省略。
- [Risk] 用户误以为复制配置等于已安装 hook。→ Mitigation: 面板文案明确区分“复制配置”“写入配置”“重启/验证”步骤。
- [Risk] 未来加入一键安装时需要安全处理全局配置。→ Mitigation: 本变更不实现自动安装，后续通过单独 change 设计配置合并和回滚。

## Open Questions

- atie 是否希望后续增加“一键安装 Codex hook”能力，自动更新 `~/.codex/config.toml` 或 `$CODEX_HOME/config.toml`？
- 帮助面板第一版是否只覆盖 Codex hook，还是也展示 Claude Code / OpenCode 的安装说明？
