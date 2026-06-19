## 1. 数据模型与读取

- [x] 1.1 在 TerminalPanel 内定义侧边栏模式状态，支持 `terminal` 与 `spec` 两种模式
- [x] 1.2 基于现有 workspaces/session 列表计算唯一项目根目录，优先使用 `session.gitRoot`，没有 gitRoot 时使用 `session.cwd`
- [x] 1.3 为每个项目根目录调用现有 `openspecWorkflowApi.read(rootPath)` 读取 OpenSpec/RavenSpec workflow summary
- [x] 1.4 聚合同项目下可定位的 terminal session 信息，保存 workspace 名称、session id、session 展示名和最近活跃优先级
- [x] 1.5 为项目读取中的 loading、error、empty 状态建立渲染所需的数据结构

## 2. Terminal 侧边栏模式 UI

- [x] 2.1 在 Terminal 侧边栏 header 中加入 `Terminal / Spec` segmented mode switch
- [x] 2.2 保持 `Terminal` 模式下现有 workspace/session 树、右键菜单、拖拽、重命名、关闭和快捷键行为不变
- [x] 2.3 在 `Spec` 模式下按项目根目录分组渲染 Spec 导航内容
- [x] 2.4 为 Spec 模式添加 loading、error、empty 轻量状态展示
- [x] 2.5 添加紧凑 Spec change 卡片样式，避免文字挤压或与按钮重叠

## 3. Spec change 卡片内容

- [x] 3.1 在 change 卡片中展示 workflow 来源、change 名称和所属项目摘要
- [x] 3.2 展示 OpenSpec artifact 完整度：`proposal`、`design`、`specs`、`tasks`
- [x] 3.3 展示 RavenSpec artifact 完整度：`PRD`、`DESIGN`、`specs`、`TASK`
- [x] 3.4 展示任务总数、已完成数量和无 checkbox 时的等效状态
- [x] 3.5 展示推荐下一步状态，但不自动写入或执行 terminal 命令

## 4. 定位与预览交互

- [x] 4.1 实现点击 change 卡片主区域时选择该项目对应 terminal session
- [x] 4.2 点击 change 卡片后切回 `Terminal` 模式，并确保目标 session 节点滚动到可视区域
- [x] 4.3 多个 session 对应同一项目时优先选择当前活跃或最近活跃的同项目 session，否则选择第一个可用 session
- [x] 4.4 目标 session 不存在时不创建新 session，并展示轻量无法定位反馈
- [x] 4.5 实现 artifact 入口打开已存在 Markdown artifact 到现有文件预览区
- [x] 4.6 缺失 artifact 入口保持禁用或轻量提示，且不尝试打开文件
- [x] 4.7 点击 artifact 入口不改变当前活跃 terminal session，也不向 terminal 写入命令
- [x] 4.8 将 Spec change 卡片中的一键操作按钮替换为“下一步”按钮，并与卡片主区域定位行为、artifact 入口区分点击区域
- [x] 4.9 点击“下一步”后展示 Skill 选择弹窗，弹窗展示目标 workflow、change 和 terminal session
- [x] 4.10 根据 change 推荐下一步计算 Skill 候选项，只包含当前阶段及之后流程，不展示 Explore/Propose 等已过去流程
- [x] 4.11 用户选择 Skill 后复用 SDD Command Router，根据 change workflow、change 名称和所选 action 生成 payload
- [x] 4.12 选择低风险 Skill 后将 payload 写入该 change 所属项目关联的目标 terminal session 并执行
- [x] 4.13 选择高风险、需确认或包含跳过门禁的 Skill 后先展示确认界面，确认前不写入 terminal
- [x] 4.14 目标 terminal session 不可用时不创建新 session、不写入 payload，并展示轻量错误反馈

## 5. 验证

- [ ] 5.1 手动验证默认仍进入 `Terminal` 模式，现有 terminal tab 创建、切换、关闭、重命名、拖拽行为不受影响
- [ ] 5.2 手动验证存在 OpenSpec active change 的项目在 `Spec` 模式下显示 change 卡片与 artifact/任务摘要
- [ ] 5.3 手动验证存在 RavenSpec active change 的项目在 `Spec` 模式下显示 change 卡片与 artifact/任务摘要
- [ ] 5.4 手动验证点击 change 卡片会切回 `Terminal` 模式并定位到对应 terminal tab
- [ ] 5.5 手动验证点击 artifact 入口打开文件预览，但不切换 terminal tab、不执行命令
- [ ] 5.6 手动验证“下一步”会打开 Skill 选择弹窗，候选项不包含已过去流程，选择低风险 Skill 会写入对应项目 terminal，高风险 Skill 会先展示确认
- [x] 5.7 运行 TypeScript 检查，确认新增类型和组件代码无类型错误
