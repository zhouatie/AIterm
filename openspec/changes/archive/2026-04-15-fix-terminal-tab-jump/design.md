## Context

当前 `TerminalPanel.tsx` 中，二级 terminal tab 行的垂直 margin 因激活态不同而存在差异：

| 状态 | marginTop | marginBottom | 总垂直占位 (含 height=34px) |
|------|-----------|--------------|---------------------------|
| 活跃 | 4px | 4px | 42px |
| 非活跃 | 2px | 0px | 36px |

切换 tab 时，新旧活跃行同时变化，产生 ±6px 的 reflow，列表出现可感知的跳动。当前 transition 中包含 `margin 0.2s ease-out`，使跳动以动画形式呈现，但并未消除视觉干扰。

现有 spec `terminal-tabs/spec.md` "活跃 terminal tab 卡片化浮起" scenario 要求：
> 该节点 SHALL 通过上下 margin 与相邻的非活跃 tab 行拉开间距（≥ 3px），形成独立的卡片边界

这一要求的本意是让活跃 tab 在视觉上与非活跃 tab 有间距分离感，但用 margin 实现会导致切换时外部布局 reflow。

## Goals / Non-Goals

**Goals:**
- 消除 tab 切换时的布局跳动，使所有 tab 行占位恒定
- 保持活跃 tab "卡片化浮起"的视觉间距感

**Non-Goals:**
- 不改变活跃 tab 的 box-shadow / border / background / backdrop-filter 等视觉效果
- 不改变 tab 行的 height (34px) 或 padding
- 不引入新的 CSS 类或外部样式文件

## Decisions

### 决策 1：统一 margin，改用固定值

**选择**: 所有 tab 行统一使用 `marginTop: 2, marginBottom: 2`。

**理由**: 
- 每行总占位 = 34 + 2 + 2 = 38px，活跃与非活跃完全一致，切换零 reflow
- 活跃 tab 的视觉间距感已由 box-shadow（三层阴影占据周围空间）和 border 提供，不依赖额外 margin
- 非活跃 tab 之间 2px 的间距保持列表紧凑感

**备选方案**:
- A) 统一使用 `marginTop: 4, marginBottom: 4`（总占位 42px）→ 列表更松散，可能影响可视 tab 数量
- B) 用 padding 代替 margin 模拟间距 → 会影响 backgroundColor 的渲染区域，需额外调整 border-radius 和点击区域
- C) 统一使用 `marginTop: 2, marginBottom: 0`（总占位 36px）→ 列表最紧凑，但活跃 tab 上下间距为零可能使阴影被相邻行裁切

选择 `marginTop: 2, marginBottom: 2` 作为折中：比非活跃态原有的 36px 略宽松，比活跃态原有的 42px 更紧凑，且上下对称的 2px 间距足够让 box-shadow 有呼吸空间。

### 决策 2：从 transition 中移除 margin

**选择**: 将 transition 属性中的 `margin 0.2s ease-out` 移除。

**理由**: margin 已恒定，无需动画化。移除后减少浏览器不必要的 transition 监听。

## Risks / Trade-offs

- [视觉微调] 活跃 tab 与相邻 tab 的间距从 4+2=6px 减少到 2+2=4px → 阴影效果可能略显紧凑。**缓解**: box-shadow 的远距阴影已提供足够的视觉分离，且 4px 仍满足 ≥ 3px 的视觉间距需求（阴影视觉扩展可补偿）。
- [Spec 不一致] 现有 spec 要求"通过上下 margin 拉开间距"，但修复后 margin 本身不再区分活跃/非活跃 → 需通过 delta spec 修正措辞，将"间距感"的实现手段从 margin 改为 box-shadow + margin 共同作用。
