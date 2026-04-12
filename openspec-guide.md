# OpenSpec 指令完全指南

> OpenSpec 是一套 spec-driven 的变更管理工作流，通过结构化的产物（proposal、specs、design、tasks）驱动从需求到实现再到归档的全流程。本文档覆盖所有 `/openspec-xxx` 指令的用途、适用场景和使用技巧。

---

## 目录

1. [核心概念](#核心概念)
2. [指令总览](#指令总览)
3. [完整生命周期](#完整生命周期)
4. [各指令详解](#各指令详解)
5. [使用技巧与最佳实践](#使用技巧与最佳实践)
6. [常见工作流模式](#常见工作流模式)
7. [FAQ](#faq)

---

## 核心概念

### Change（变更）

一个 change 是 OpenSpec 中的基本工作单元，对应一次功能开发、bug 修复或重构。每个 change 拥有一组结构化产物，存放在 `openspec/changes/<name>/` 目录下。

### Artifact（产物）

每个 change 包含以下核心产物（以 spec-driven schema 为例）：

| 产物 | 文件 | 作用 |
|------|------|------|
| **Proposal** | `proposal.md` | 描述变更的"为什么"和"做什么" |
| **Specs** | `specs/<capability>/spec.md` | 定义需求、场景和验收条件 |
| **Design** | `design.md` | 记录技术方案和设计决策 |
| **Tasks** | `tasks.md` | 分解实现步骤，可勾选追踪进度 |

产物之间存在依赖关系：`proposal → specs → design → tasks`，前置产物完成后才能创建后续产物。

### Delta Spec（增量规格）

change 中的 specs 是增量规格（delta spec），记录本次变更对主规格的增删改。归档时可同步到 `openspec/specs/` 下的主规格。

---

## 指令总览

按使用阶段分为五组：

### 创建阶段 - "我要做什么"

| 指令 | 一句话说明 | 适用场景 |
|------|-----------|---------|
| `/openspec-new-change` | 创建新 change，逐步引导 | 第一次用、想仔细规划 |
| `/openspec-propose` | 创建 change 并一次性生成全部产物 | 快速启动，已经想清楚了 |
| `/openspec-explore` | 思考探索模式，不写代码 | 还没想清楚，需要先探索 |

### 产物阶段 - "细化方案"

| 指令 | 一句话说明 | 适用场景 |
|------|-----------|---------|
| `/openspec-continue-change` | 创建下一个待完成的产物 | 逐步推进，想每步确认 |
| `/openspec-ff-change` | 快进生成所有剩余产物 | 产物已有部分，想快速补齐 |

### 实现阶段 - "动手写代码"

| 指令 | 一句话说明 | 适用场景 |
|------|-----------|---------|
| `/openspec-apply-change` | 按 tasks 逐个实现代码 | 开始编码实现 |
| `/openspec-update-change` | 根据反馈更新 change 产物 | 实现中发现产物需要调整 |

### 审查阶段 - "检查质量"

| 指令 | 一句话说明 | 适用场景 |
|------|-----------|---------|
| `/openspec-verify-change` | 轻量级验证实现是否匹配产物 | 快速自检 |
| `/openspec-review-prepare` | 生成改动-任务映射报告 | 正式审查前的准备 |
| `/openspec-review` | 基于映射报告执行结构化审查 | 正式代码审查 |

### 收尾阶段 - "完成归档"

| 指令 | 一句话说明 | 适用场景 |
|------|-----------|---------|
| `/openspec-sync-specs` | 同步 delta specs 到主规格 | 只想同步规格，不归档 |
| `/openspec-archive-change` | 归档单个已完成的 change | 单个 change 完工 |
| `/openspec-bulk-archive-change` | 批量归档多个 change | 多个并行 change 同时完工 |

---

## 完整生命周期

一个 change 的典型生命周期：

```
  [想法/需求]
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  探索阶段（可选）                                  │
  │  /openspec-explore                               │
  │  想清楚了？                                       │
  └──────────────────────┬──────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
  ┌─────────────────┐       ┌─────────────────────┐
  │  逐步创建        │       │  快速提案             │
  │  /openspec-new   │       │  /openspec-propose   │
  │       +          │       │  (一步到位)           │
  │  /openspec-      │       └────────┬────────────┘
  │   continue       │                │
  │  (逐个产物)      │                │
  └────────┬─────────┘                │
           │                          │
           └─────────────┬────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────┐
  │  实现阶段                                        │
  │  /openspec-apply-change                          │
  │                                                  │
  │  发现问题？ ──→ /openspec-update-change           │
  │  继续探索？ ──→ /openspec-explore                 │
  └──────────────────────┬──────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────┐
  │  审查阶段                                        │
  │  /openspec-verify-change     (轻量自检)           │
  │  /openspec-review-prepare    (准备审查报告)        │
  │  /openspec-review            (正式审查)           │
  │                                                  │
  │  有问题？ ──→ /openspec-update-change             │
  └──────────────────────┬──────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────┐
  │  收尾阶段                                        │
  │  /openspec-sync-specs        (同步规格)           │
  │  /openspec-archive-change    (归档)              │
  │  /openspec-bulk-archive      (批量归档)           │
  └─────────────────────────────────────────────────┘
```

---

## 各指令详解

### 1. `/openspec-explore` - 探索模式

**什么时候用**：在动手之前，还没想清楚要做什么、怎么做的时候。

**做什么**：
- 进入"思考伙伴"模式，AI 会通过提问、画图、分析代码来帮你理清思路
- 可以读代码、搜索代码库，但不会写代码
- 可以创建 OpenSpec 产物（proposal、design 等），但不实现功能

**典型场景**：
- "我想加个实时协作功能，但不确定用什么方案"
- "认证系统一团糟，帮我理一下"
- "SQLite 还是 Postgres？"

**输出**：没有固定输出格式。可能是一段分析、一个 ASCII 图、一个对比表，或者最终建议创建一个 change。

**技巧**：
- 可以随时关联已有的 change：`/openspec-explore add-auth-system`
- 探索过程中如果形成了决策，AI 会主动提议是否写入对应产物
- 这是唯一一个"没有固定流程"的指令，跟着思路走就好

---

### 2. `/openspec-new-change` - 创建新变更（逐步）

**什么时候用**：确定要做某个功能/修复，想要一步步引导创建。

**做什么**：
1. 创建 change 目录 `openspec/changes/<name>/`
2. 展示产物状态（有哪些产物需要创建）
3. 展示第一个产物的模板
4. **停下来等你确认**，不会自动创建任何产物

**典型场景**：
- 第一次使用 OpenSpec
- 比较复杂的功能，想逐步控制每个产物的内容
- 想选择不同的 workflow schema

**输出**：change 目录 + 第一个产物的模板指引

**技巧**：
- change name 必须是 kebab-case（如 `add-user-auth`）
- 创建后用 `/openspec-continue-change` 逐个创建产物
- 如果想快速补齐所有产物，切换到 `/openspec-ff-change`

---

### 3. `/openspec-propose` - 快速提案（一步到位）

**什么时候用**：已经想清楚了，想快速走完产物创建流程直接进入编码。

**做什么**：
1. 创建 change 目录
2. **按依赖顺序自动生成所有需要的产物**（proposal → specs → design → tasks）
3. 展示最终状态

**典型场景**：
- 功能明确，不需要逐步确认
- 小型改动，产物内容不多
- 想快速进入实现阶段

**输出**：完整的 change 目录，所有产物就绪，可以直接 `/openspec-apply-change`

**技巧**：
- 描述越详细，生成的产物质量越高
- 如果某个产物不满意，后续可以用 `/openspec-update-change` 修改
- 这是从 0 到"可以写代码"最快的路径

---

### 4. `/openspec-continue-change` - 继续创建下一个产物

**什么时候用**：change 已经存在，还有产物没创建完。

**做什么**：
1. 找到下一个可创建的产物（依赖已满足）
2. 获取该产物的指令和模板
3. **创建这一个产物**
4. 展示进度，等待下一步指示

**典型场景**：
- 用 `/openspec-new-change` 创建后，逐步推进
- 暂停了一段时间，回来继续
- 想在每个产物之间有手动确认的机会

**输出**：一次调用创建一个产物

**技巧**：
- 不指定 change name 时，会列出最近修改的 change 让你选
- 每次只创建一个产物，想批量创建用 `/openspec-ff-change`
- 如果所有产物都完成了，会提示可以开始实现或归档

---

### 5. `/openspec-ff-change` - 快进创建全部产物

**什么时候用**：change 存在但产物不全，想一次性补齐。

**做什么**：
1. 创建 change（如果还没创建）
2. 按依赖顺序一次性生成所有剩余产物
3. 展示最终状态

**典型场景**：
- 已经有了 proposal，想快速生成剩余的 specs、design、tasks
- 和 `/openspec-propose` 类似，但适用于已有部分产物的情况

**输出**：所有产物就绪

**技巧**：
- 可以先用 `/openspec-new-change` + `/openspec-continue-change` 手动创建前几个关键产物，然后用 `/openspec-ff-change` 快进剩余的
- 这在"关键产物手动把控 + 其余自动生成"的场景下特别有用

---

### 6. `/openspec-apply-change` - 实现代码

**什么时候用**：产物就绪，准备写代码了。

**做什么**：
1. 读取所有产物（proposal、specs、design、tasks）作为上下文
2. 按 tasks 列表逐个实现
3. 每完成一个 task 勾选 checkbox
4. 遇到问题暂停等待指导

**典型场景**：
- `/openspec-propose` 或 `/openspec-ff-change` 之后
- 被中断后继续实现（会自动识别已完成的 task）

**输出**：代码改动 + tasks.md 中对应 checkbox 被勾选

**技巧**：
- 实现中发现设计有问题？暂停后用 `/openspec-update-change` 修正产物，再回来继续
- 可以多次调用，每次会从上次暂停的地方继续
- 如果 tasks 还没就绪（缺产物），会提示先用 `/openspec-continue-change`

---

### 7. `/openspec-update-change` - 更新变更产物

**什么时候用**：实现或审查过程中，发现产物需要调整。

**做什么**：
1. 收集待收敛事项（来自 review 报告、apply 问题、explore 发现、用户指令）
2. 判断每条事项的处理路径（仅改产物、仅改代码、两者都改）
3. 更新对应的 change 产物
4. 校验一致性
5. 推荐下一动作（Apply 或 Review Prepare）

**典型场景**：
- `/openspec-review` 发现问题后需要修正产物
- 实现过程中发现需求理解有偏差
- 用户要求调整 change 的范围或设计

**输出**：更新后的产物 + 下一步建议

**技巧**：
- 这个指令只修改产物，不修改应用代码（代码修复交给 `/openspec-apply-change`）
- 如果变更范围已经超出当前 change 的边界，会建议新建 change
- 配合 review 流程形成闭环：review → update → apply → review

---

### 8. `/openspec-verify-change` - 轻量验证

**什么时候用**：想快速检查实现是否匹配产物，不需要完整审查流程。

**做什么**：
从三个维度验证：
- **完整性**：task 是否都完成了？spec 中的需求是否都有实现？
- **正确性**：实现是否匹配需求意图？场景是否覆盖？
- **一致性**：是否遵循了 design 中的决策？代码风格是否统一？

**典型场景**：
- 实现完成后的自检
- 归档前的快速确认
- 不需要完整 review 流程的小改动

**输出**：带评分的验证报告（CRITICAL / WARNING / SUGGESTION）

**技巧**：
- 比 review 流程轻量得多，适合频繁使用
- 只有 CRITICAL 问题需要必须修复
- 没有 CRITICAL 问题就可以考虑归档

---

### 9. `/openspec-review-prepare` - 审查准备

**什么时候用**：正式审查前，需要建立代码改动与 task 的映射关系。

**做什么**：
1. 读取 change 产物（proposal、design、tasks、specs）
2. 收集 git diff（支持多仓库）
3. 逐 hunk 建立代码改动到 task 的映射
4. 生成结构化的审查准备报告

**典型场景**：
- 准备 code review
- 多人协作时需要清晰展示"哪些代码对应哪个任务"
- 变更涉及多个仓库

**输出**：Review Preparation Report（包含 task 分组、文件映射、超出范围变更）

**技巧**：
- 这是只读操作，不修改任何文件
- 默认对比 HEAD，可以指定其他对比基准
- 生成的报告是 `/openspec-review` 的前置输入
- 如果代码或产物发生变化，需要重新执行

---

### 10. `/openspec-review` - 正式审查

**什么时候用**：基于审查准备报告，执行结构化代码审查。

**做什么**：
1. 消费 `/openspec-review-prepare` 的报告
2. 从四个维度审查：正确性、设计一致性、完整性、代码质量
3. 记录问题并分级（CRITICAL / WARNING / SUGGESTION）
4. 推荐下一动作（Archive / Update Change / User Clarification）

**典型场景**：
- 正式 code review
- 归档前的终审
- 需要结构化的审查报告

**输出**：Review Report（问题列表 + 推荐下一动作）

**技巧**：
- 必须先执行 `/openspec-review-prepare`
- 只读操作，不修改文件
- Review Result 为 `pass` 时可以归档
- 有问题时会推荐 `/openspec-update-change`，形成闭环

---

### 11. `/openspec-sync-specs` - 同步规格

**什么时候用**：想把 change 中的 delta specs 同步到主规格，但不归档 change。

**做什么**：
1. 读取 change 中的 delta specs
2. 智能合并到 `openspec/specs/` 下的主规格
3. 支持增删改和重命名

**典型场景**：
- change 实现完成，想先同步规格
- 需要其他 change 看到最新的主规格
- 不想立即归档但想更新规格

**输出**：更新后的主规格文件

**技巧**：
- 这是"智能合并"而不是简单替换，会保留未提及的内容
- 幂等操作，多次执行结果相同
- 归档时也会触发同步，所以如果直接归档可以跳过这步

---

### 12. `/openspec-archive-change` - 归档变更

**什么时候用**：change 实现完成，准备收尾。

**做什么**：
1. 检查产物完成状态
2. 检查 task 完成状态
3. 评估是否需要同步 delta specs（如有，会询问）
4. 将 change 目录移到 `openspec/changes/archive/YYYY-MM-DD-<name>/`

**典型场景**：
- 单个 change 完工
- verify 或 review 通过后

**输出**：归档完成摘要

**技巧**：
- 未完成的产物或 task 会有警告，但不会阻止归档（确认后可继续）
- 归档目录名包含日期，方便追溯
- 有 delta specs 时会询问是否同步到主规格

---

### 13. `/openspec-bulk-archive-change` - 批量归档

**什么时候用**：多个并行 change 同时完成，想一次性归档。

**做什么**：
1. 列出所有活跃 change，让你多选
2. 检测 spec 冲突（多个 change 修改同一 capability 的规格）
3. 通过检查代码库智能解决冲突
4. 批量归档

**典型场景**：
- 迭代结束，多个 feature 同时完工
- 并行开发的 change 需要统一归档
- 存在 spec 冲突需要智能合并

**输出**：批量归档报告（含冲突解决摘要）

**技巧**：
- 冲突解决策略：检查代码库中实际实现了什么，只同步已实现的规格
- 两个 change 都实现了同一 capability 时，按时间顺序合并（新的覆盖旧的）
- 即使有一个 change 归档失败，其他的不受影响

---

## 使用技巧与最佳实践

### 1. 选择正确的启动方式

```
想清楚了吗？
  ├── 没有 → /openspec-explore
  ├── 大致有方向 → /openspec-new-change + /openspec-continue-change
  └── 非常清楚 → /openspec-propose
```

### 2. 控制粒度的艺术

| 风格 | 指令组合 | 适用 |
|------|---------|------|
| 全自动 | `/openspec-propose` → `/openspec-apply-change` | 小改动、已想清楚 |
| 半自动 | `/openspec-new-change` → 手动写 proposal → `/openspec-ff-change` | 关键产物手动，其余自动 |
| 全手动 | `/openspec-new-change` → 多次 `/openspec-continue-change` | 大功能、需要精细控制 |

### 3. 闭环审查流程

最严谨的质量保证流程：

```
apply → review-prepare → review
                           │
                     有问题？
                      ├── 是 → update-change → apply → (重新 review)
                      └── 否 → archive
```

### 4. 灵活切换指令

OpenSpec 的指令不是死板的线性流程，可以在任何阶段灵活切换：

- 实现到一半发现思路不对？ → `/openspec-explore` 重新思考
- 探索出结论了？ → 直接 `/openspec-propose` 或 `/openspec-update-change`
- review 发现需求有问题？ → `/openspec-update-change` 修正产物
- 产物都好但代码有 bug？ → `/openspec-apply-change` 继续修复

### 5. Change 命名规范

- 使用 kebab-case：`add-user-auth`、`fix-login-bug`、`refactor-api-layer`
- 前缀建议：
  - `add-` 新功能
  - `fix-` 修复
  - `refactor-` 重构
  - `update-` 增强现有功能

### 6. 何时创建新 Change vs 更新现有 Change

**更新现有 Change**：
- 同一意图下的修正
- 范围收缩或细化
- 实现中的微调

**新建 Change**：
- 意图已根本改变
- 范围扩展到另一项独立工作
- 原 change 已可独立完成

---

## 常见工作流模式

### 模式 A：快速开发（适合小功能）

```bash
/openspec-propose add-dark-mode        # 一步生成所有产物
/openspec-apply-change add-dark-mode   # 直接实现
/openspec-verify-change add-dark-mode  # 快速验证
/openspec-archive-change add-dark-mode # 归档
```

### 模式 B：精细控制（适合大功能）

```bash
/openspec-explore                          # 先探索，想清楚
/openspec-new-change add-realtime-collab   # 创建 change
/openspec-continue-change                  # 手动创建 proposal
# （review proposal 内容，确认没问题）
/openspec-continue-change                  # 手动创建 specs
/openspec-ff-change                        # 快进剩余产物
/openspec-apply-change                     # 实现
/openspec-review-prepare                   # 准备审查
/openspec-review                           # 正式审查
/openspec-archive-change                   # 归档
```

### 模式 C：迭代修正（适合有审查流程的团队）

```bash
/openspec-propose fix-checkout-flow        # 快速提案
/openspec-apply-change                     # 实现
/openspec-review-prepare                   # 准备审查
/openspec-review                           # 发现 2 个问题
/openspec-update-change                    # 修正产物
/openspec-apply-change                     # 修复代码
/openspec-review-prepare                   # 重新准备审查
/openspec-review                           # 通过
/openspec-archive-change                   # 归档
```

### 模式 D：多 Change 并行

```bash
# 同时开发多个功能
/openspec-propose add-oauth
/openspec-propose add-2fa

# 分别实现
/openspec-apply-change add-oauth
/openspec-apply-change add-2fa

# 一次性归档
/openspec-bulk-archive-change              # 选择多个 change，自动处理冲突
```

---

## FAQ

### Q: `/openspec-propose` 和 `/openspec-ff-change` 有什么区别？

**`/openspec-propose`** 是从零开始：创建 change + 生成所有产物。
**`/openspec-ff-change`** 适合已有部分产物的情况：补齐剩余产物。

如果 change 还不存在，两者效果相同。

### Q: `/openspec-verify-change` 和 `/openspec-review` 有什么区别？

**`/openspec-verify-change`** 是轻量级自检，一步完成，适合开发者自己用。
**`/openspec-review`** 是完整审查流程，需要先 `/openspec-review-prepare`，输出更详细的结构化报告，适合正式 code review。

### Q: 产物可以手动编辑吗？

可以。OpenSpec 产物就是普通的 markdown 文件，随时可以手动编辑。但建议通过 `/openspec-update-change` 来修改，它会确保产物间的一致性并做校验。

### Q: 不想写 spec，只想直接实现怎么办？

可以用 `/openspec-propose` 快速生成产物，描述简单一点就好。OpenSpec 的价值在于给 AI 提供足够的上下文来高质量地实现代码，而不是给人增加负担。

### Q: 归档后的 change 还能找回吗？

可以。归档后的 change 在 `openspec/changes/archive/YYYY-MM-DD-<name>/` 目录下，所有产物完整保留，可以随时查看。

### Q: review-prepare 报告过时了怎么办？

如果代码或产物在 review-prepare 之后发生了变化，需要重新执行 `/openspec-review-prepare`。`/openspec-review` 会检测报告是否仍然适用。

---

## 指令速查表

| 我想... | 用这个指令 |
|---------|-----------|
| 想清楚再动手 | `/openspec-explore` |
| 开始一个新功能 | `/openspec-propose` 或 `/openspec-new-change` |
| 继续推进产物 | `/openspec-continue-change` |
| 快速补齐产物 | `/openspec-ff-change` |
| 开始写代码 | `/openspec-apply-change` |
| 修正 change 产物 | `/openspec-update-change` |
| 快速自检 | `/openspec-verify-change` |
| 正式审查 | `/openspec-review-prepare` → `/openspec-review` |
| 同步规格到主线 | `/openspec-sync-specs` |
| 归档完成的 change | `/openspec-archive-change` |
| 批量归档 | `/openspec-bulk-archive-change` |
