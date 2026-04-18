## MODIFIED Requirements

### Requirement: Terminal 导航状态提示协调
terminal 导航中的激活态、agent status 提示与收起 / 展开入口 SHALL 使用协调一致的视觉语言，不得相互争抢用户注意力。

#### Scenario: agent status 提示独立于活跃态
- **WHEN** 某个终端存在 agent status 提示，且该终端不是当前活跃项
- **THEN** agent status 提示 SHALL 以独立但克制的方式可见
- **THEN** 该提示 SHALL 不覆盖或替代活跃 terminal tab 的焦点表达规则

#### Scenario: 收起展开入口与侧边导航风格统一
- **WHEN** terminal 侧边导航处于展开或收起状态
- **THEN** 对应的收起 / 展开入口 SHALL 与导航表面使用一致的描边、背景与 hover 规则
- **THEN** 该入口 SHALL 看起来属于终端工作台界面的一部分，而不是额外悬浮的小部件

#### Scenario: 状态提示不造成 tab 布局抖动
- **WHEN** 二级 terminal tab 的 agent status 在 `idle`、`running`、`completed`、`needs_user` 和 `error` 之间变化
- **THEN** tab 名称文字的横向位置 SHALL 保持稳定
- **THEN** tab 关闭按钮和快捷键序号槽 SHALL 保持稳定

## ADDED Requirements

### Requirement: Terminal tab agent status 标识
terminal 面板 SHALL 在每个二级 terminal tab 的固定状态槽中展示该 session 的 agent status。

#### Scenario: 执行中状态标识
- **WHEN** 某个 terminal session 的 agent status 为 `running`
- **THEN** 对应二级 terminal tab SHALL 显示执行中状态标识
- **THEN** 该标识 SHALL 使用低干扰动效表达 agent 正在工作

#### Scenario: 完成状态标识
- **WHEN** 某个 terminal session 的 agent status 为 `completed`
- **THEN** 对应二级 terminal tab SHALL 显示完成状态标识
- **THEN** 该标识 SHALL 与 `needs_user` 标识在颜色或形态上可区分

#### Scenario: 待用户状态标识
- **WHEN** 某个 terminal session 的 agent status 为 `needs_user`
- **THEN** 对应二级 terminal tab SHALL 显示待用户处理状态标识
- **THEN** 该标识 SHALL 在所有 agent status 标识中具有最高视觉优先级

#### Scenario: 异常状态标识
- **WHEN** 某个 terminal session 的 agent status 为 `error`
- **THEN** 对应二级 terminal tab SHALL 显示异常状态标识
- **THEN** 该标识 SHALL 与 `completed` 和 `running` 标识可区分

#### Scenario: 无状态时保留现有 tab 语义
- **WHEN** 某个 terminal session 没有 agent status 或 agent status 为 `idle`
- **THEN** 对应二级 terminal tab SHALL 不显示额外 agent status 标识
- **THEN** tab SHALL 保留现有 active / inactive 视觉语义

### Requirement: Agent status 详情展示
terminal tab SHALL 通过 tooltip 或 hover 信息展示 agent status 的来源详情，而不在 tab 正面常驻显示 agent 名称。

#### Scenario: tooltip 展示 agent 来源
- **WHEN** 用户悬停带有 agent status 的二级 terminal tab 状态标识
- **THEN** 系统 SHALL 展示该状态对应的 agent 名称
- **THEN** 系统 SHALL 展示该状态对应的 message 或可读状态描述

#### Scenario: tab 正面不显示 agent 名称
- **WHEN** 二级 terminal tab 渲染 agent status
- **THEN** tab 正面 SHALL NOT 常驻显示 `Codex`、`Claude Code` 或 `OpenCode` 文本文案
- **THEN** tab 名称 SHALL 保持以 session 名称、git 分支或路径上下文为主

### Requirement: 收起侧边栏聚合状态提示
terminal 侧边 tab 栏收起时，系统 SHALL 在收起 / 展开入口展示当前所有 terminal session 的聚合 agent status。

#### Scenario: 收起时存在待用户状态
- **WHEN** terminal 侧边栏处于收起状态，且任意 terminal session 的 agent status 为 `needs_user`
- **THEN** 收起 / 展开入口 SHALL 显示待用户处理的聚合状态提示

#### Scenario: 收起时存在异常状态
- **WHEN** terminal 侧边栏处于收起状态，且不存在 `needs_user` 状态但任意 terminal session 的 agent status 为 `error`
- **THEN** 收起 / 展开入口 SHALL 显示异常聚合状态提示

#### Scenario: 收起时存在执行中状态
- **WHEN** terminal 侧边栏处于收起状态，且不存在 `needs_user` 或 `error` 状态但任意 terminal session 的 agent status 为 `running`
- **THEN** 收起 / 展开入口 SHALL 显示执行中聚合状态提示

#### Scenario: 收起时仅存在完成状态
- **WHEN** terminal 侧边栏处于收起状态，且所有非 idle agent status 中最高优先级为 `completed`
- **THEN** 收起 / 展开入口 SHALL 显示完成聚合状态提示

#### Scenario: 展开后显示具体 tab 状态
- **WHEN** 用户展开带有聚合状态提示的 terminal 侧边栏
- **THEN** 各二级 terminal tab SHALL 显示各自的 agent status 标识
- **THEN** 聚合状态 SHALL NOT 清除任何 session 的 agent status

### Requirement: Agent status 视觉优先级
terminal 导航 SHALL 使用一致的优先级规则决定单个 tab 与收起入口上的 agent status 展示。

#### Scenario: 状态优先级顺序
- **WHEN** 系统需要在同一个位置展示多个候选 agent status
- **THEN** 系统 SHALL 按 `needs_user`、`error`、`running`、`completed`、`idle` 的顺序选择最高优先级状态

#### Scenario: needs_user 不被 active 样式覆盖
- **WHEN** 当前活跃 terminal tab 的 agent status 为 `needs_user`
- **THEN** terminal tab SHALL 同时保留活跃态样式和待用户状态标识
- **THEN** 待用户状态标识 SHALL 可见
