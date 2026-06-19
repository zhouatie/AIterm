## Context

AIterm 当前已经具备右侧 terminal 工作区、左侧 Files / OpenSpec 模式切换、OpenSpec Dashboard、terminal 写入 API、Markdown 评论发送给 agent 的 payload 生成逻辑，以及从 `openspec/changes/*` 扫描 change 状态的主进程能力。

用户现在主要通过语音输入驱动 SDD，痛点集中在两类输入上：

- 长 skill 名或英文 action 容易识别错误，例如 `$openspec-apply-change`、`archive`、`verify`。
- change slug 容易识别错误，尤其是多个 active changes 并存时。

本设计把“语音输入文本”先归一为结构化 SDD action，再通过确认界面生成 terminal payload。系统只负责降低输入成本和减少误触发，不改变 OpenSpec 的底层工作流。RavenSpec 首版不实现，只在用户输入相关口令时给出暂不支持反馈。

## Goals / Non-Goals

**Goals:**

- 提供统一 SDD 命令入口，支持短口令、中文自然语言和常见语音误识别词。
- 支持当前 SDD change，减少用户反复输入 change slug。
- 支持 OpenSpec workflow 路由。
- 在写入 terminal 前展示确认界面，尤其是 apply / archive 等高风险动作。
- 复用现有 OpenSpec Dashboard 推荐下一步、terminalApi.input 和 Markdown payload 的安全写入习惯。

**Non-Goals:**

- 不实现远程 AI API 调用。
- 不直接执行 OpenSpec CLI。
- 不自动修改 proposal / design / specs / tasks 文件。
- 不自动提交 commit。
- 不在第一版实现跨重启持久化语音草稿。
- 不实现 RavenSpec provider，不猜测 RavenSpec 内部 CLI 或 skill 名称。

## Decisions

### 1. Router 放在渲染层，主进程不参与解析

新增纯前端解析模块，例如 `src/utils/sdd-command-router.ts`，负责把输入文本解析为：

```ts
interface SddCommandIntent {
  workflow: 'openspec' | 'raven' | 'unknown';
  action: 'explore' | 'propose' | 'continue' | 'apply' | 'verify' | 'review' | 'archive' | 'update-change' | 'open-artifact' | 'update-artifact' | 'set-current-change' | 'unknown';
  changeName: string | null;
  artifact: 'proposal' | 'design' | 'specs' | 'tasks' | null;
  originalText: string;
  normalizedText: string;
  confidence: 'ready' | 'needs-confirmation' | 'ambiguous';
  risk: 'low' | 'high';
}
```

解析只依赖输入文本、当前 SDD change、Dashboard change 列表和当前 active terminal 的 rootPath，不需要主进程读写磁盘。这样可以保持实现简单，并避免把语音口令规则散落到 IPC 层。

备选方案是在主进程做解析。没有采用，因为解析没有文件系统权限需求，放主进程会让 UI 确认状态和草稿编辑来回跨 IPC，复杂度更高。

### 2. 使用 OpenSpec provider 生成 payload，而不是直接执行工作流

Router 将 intent 交给 OpenSpec provider：

- OpenSpec provider：生成 `$openspec-*` skill 触发文本或等效中文 agent 指令。
- RavenSpec 输入：首版不生成 provider payload，只展示暂不支持反馈。

provider 的输出统一为：

```ts
interface SddCommandPayload {
  title: string;
  preview: string;
  terminalInput: string;
  risk: 'low' | 'high';
}
```

`terminalInput` 使用与 Markdown 评论类似的 bracketed paste 包裹，减少多行 payload 被 shell 或 TUI 错误解释的概率。

备选方案是直接调用 OpenSpec CLI。没有采用，因为用户当前是在右侧 terminal 中驱动 agent；直接调用 CLI 会绕过 agent 上下文，也会让高风险动作更难确认。

### 3. 当前 SDD change 使用 session-local 状态

当前 SDD change 第一版放在渲染层状态中，关联当前 active terminal session 或当前 rootPath：

```ts
type CurrentSddChange = {
  workflow: 'openspec';
  changeName: string;
  rootPath: string;
};
```

当 Dashboard 刷新后发现该 change 已不存在，清除当前 change 并提示用户重新选择。第一版不跨重启持久化，避免 stale change 影响新项目。

备选方案是写入 localStorage。没有采用，因为 SDD change 与 terminal cwd 强相关，跨重启恢复容易指向错误项目。

### 4. SDD 命令入口首版放在 OpenSpec Dashboard 顶部，Dashboard 显式动作只进入确认流程

首版入口放在 `OpenSpecDashboard` 顶部，和 active changes、推荐下一步使用同一块上下文，避免在标题栏或 terminal 顶部新增全局入口时引入 cwd / 当前 change 语义歧义。

`OpenSpecDashboard` 当前只展示 `nextAction` 标签和 artifact pill。扩展时增加命令输入区和显式动作按钮，例如：

- `设为当前`
- `下一步`
- `更新`
- `Apply`
- `Verify / Review / Archive`

点击这些按钮时，Dashboard 不直接写 terminal，而是调用上层传入的 `onRouteSddCommand`，把 `workflow='openspec'`、`changeName` 和候选 action 交给 SDD Command Router。Router 打开确认界面，用户确认后才调用 `window.terminalApi.input(activeSessionId, payload)`。

这样保留现有 `sdd-workflow-panels` 的原则：推荐状态本身不自动执行。

`更新` 是旁路动作，不参与 `nextAction` 计算。点击后生成 `update-change` intent，确认 payload 使用 `$openspec-update-change <change-name>`。如果用户输入里已经带了收敛事项，则把事项正文追加到命令之后；如果用户未提供事项，payload 只显示命令本身，不自动预填“本轮待收敛事项”或补充说明占位文本。

### 5. 语音纠错先用规则表，不引入模型

第一版使用本地规则表归一常见表达：

```ts
const ACTION_ALIASES = {
  explore: ['探索', '想一下', 'open spec explore', 'openspec explore'],
  propose: ['提案', '生成提案', 'proposal', 'propose'],
  continue: ['继续', '继续当前', '补齐', 'continue'],
  apply: ['执行', '实现', 'apply'],
  verify: ['验证', '验收', 'verify'],
  review: ['评审', 'review'],
  archive: ['归档', 'archive', 'achieve', 'achieve change'],
  updateChange: ['更新当前', '收敛当前', '修正当前 change', 'update change'],
};
```

规则表要保持可测试、可扩展，不把兼容旧行为作为目标；它只处理明确的语音误识别和短口令。

备选方案是使用 LLM 判断 intent。没有采用，因为本地规则足以覆盖高频命令，且确定性更适合高风险动作确认。

### 6. 确认界面同时承担草稿编辑

新增轻量确认面板或命令弹层，展示：

- workflow
- action
- changeName
- artifact
- 原始输入
- 归一结果
- 即将写入 terminal 的 payload

用户可在发送前编辑 payload。取消发送时保留当前会话内草稿，不写 terminal、不改 artifact。

确认界面与 existing terminal 写入链路一致：没有 active terminal session 时展示错误，并保留 payload 草稿。

## Risks / Trade-offs

- [Risk] 语音误识别把低风险 action 解析成高风险 action → 所有高风险 action 必须显式确认，且确认界面展示原始词和归一结果。
- [Risk] 用户输入 RavenSpec 口令时误以为已支持 → 首版展示明确的暂不支持反馈，不生成 payload、不写 terminal。
- [Risk] 当前 change 过期或来自另一个 cwd → 当前 change 绑定 rootPath，Dashboard 刷新时校验存在性。
- [Risk] 命令入口与 terminal 原生输入竞争焦点 → SDD 命令入口独立成弹层或命令条，确认后才写入 terminal。
- [Risk] Dashboard 动作被误认为自动执行 → UI 文案使用“准备 / 发送到 agent / 确认”语义，避免使用“立即执行”。

## Migration Plan

1. 新增纯解析与 payload 生成工具，并覆盖 OpenSpec provider 的高频 action。
2. 在 OpenSpec Dashboard 顶部新增 SDD 命令入口和确认界面。
3. 将 OpenSpec Dashboard 的推荐动作接入 Router，但仍保留 artifact 打开行为。
4. 补充 RavenSpec 输入的暂不支持反馈。
5. 手动验证无 active terminal、多 active changes、当前 change 过期、高风险 action 取消等路径。

## Open Questions

- 暂无。
