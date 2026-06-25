## Context

Terminal 侧边栏在 `TerminalPanel.tsx` 内使用固定宽度和 inline style 渲染。当前展开态宽度为 240px，二级 terminal tab 行高为 30px，行内使用 `gap: 6`、左侧 `14px` 内边距、`8px` agent status 槽位和 `1rem` Command 序号槽位。即使没有显示序号，固定槽位也会让状态点与 tab 名称之间显得偏远。

现有规格要求 Terminal 侧边栏保持紧凑，同时不能因为压缩非文本元素而提前截断标题。本次变更只针对 Terminal 模式下的 workspace/session 导航密度，不影响 Spec 模式卡片导航。

## Goals / Non-Goals

**Goals:**

- 缩短二级 terminal tab 状态点与名称之间的可见距离。
- 让二级 terminal tab 名称起点与上方 workspace 名称起点形成纵向对齐。
- 缩短二级 terminal tab 行内元素之间的固定间距与内边距。
- 缩短展开态 terminal 侧边栏宽度，减少左侧导航占用。
- 保持 agent status、Command 序号、关闭按钮出现/隐藏时的布局稳定。

**Non-Goals:**

- 不改变 tab 行高、拖拽排序、快捷键、重命名、关闭或 session 生命周期。
- 不改变 Spec 模式侧边栏卡片布局。
- 不改变持久化数据结构或迁移逻辑。

## Decisions

### 1. 只压缩 Terminal 模式二级 tab 的行内固定槽位

选择：调整二级 terminal tab 的 `gap`、左右 padding、agent status 槽位、Command 序号槽位和关闭按钮尺寸；将 Command 序号固定槽位放在 agent status 槽位之前，并在 agent status 槽位右侧保留少量间距，让二级 tab 名称起点与 workspace 名称起点对齐；不改变 agent status 状态规则。

理由：用户反馈集中在 name 与前面的点之间间距过大，以及整行元素过宽。压缩固定槽位并把隐藏序号槽位移出状态点与名称之间，能直接减少视觉空隙；在状态点右侧补回少量间距后，二级名称与上方 workspace 名称更规整，同时保持已有状态点、序号和关闭按钮的稳定占位。

替代方案：完全移除 Command 序号的常驻槽位。否决原因是现有规格要求序号显示/隐藏不造成名称横向位移，移除槽位会引入按住 Command 时的布局抖动。

### 2. 缩短侧边栏固定宽度但保留文本优先级

选择：将 `SIDEBAR_WIDTH` 从当前宽度下调一个小幅度，并同时压缩非文本占位，避免标题可用宽度下降过多。

理由：用户明确希望缩短整个 tab 宽度、减少占用面积。只压缩行内 gap 不会释放右侧 terminal 空间，必须同步减小侧边栏展开宽度。

替代方案：保持侧边栏宽度，只缩短视觉间距。否决原因是不能满足“再缩短整个 tab 的宽度、减少占用面积”的目标。

## Risks / Trade-offs

- [Risk] 侧边栏变窄后很长的 tab 名称更容易省略。→ Mitigation：同步压缩非文本槽位，保持标题仍优先占用剩余空间，并继续使用单行省略。
- [Risk] 关闭按钮变小会降低可点击面积。→ Mitigation：只小幅缩短按钮尺寸，仍保持固定槽位和 hover/active 显示规则。
- [Risk] 过度压缩会削弱活跃/非活跃层级。→ Mitigation：保留行高、背景、边框、阴影和状态色规则，只调整横向密度。
