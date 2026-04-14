## MODIFIED Requirements

### Requirement: Terminal 侧边导航视觉层级
terminal 侧边导航 SHALL 以毛玻璃导航表面呈现 workspace 与二级 terminal tab，活跃 tab SHALL 以"卡片化浮起"效果脱离列表，非活跃 tab SHALL 大幅弱化存在感，两者之间形成显而易见的视觉层次差。

#### Scenario: 活跃 terminal tab 卡片化浮起
- **WHEN** 某个二级 terminal tab 对应当前活跃 session
- **THEN** 该节点 SHALL 使用三层外阴影（接触 + 中距 + 远距）营造"浮在侧边栏之上"的深度效果
- **THEN** 该节点 SHALL 使用顶部 inset 高光模拟顶部光源
- **THEN** 该节点 SHALL 使用独立的 `backdrop-filter` 毛玻璃效果，与侧边栏整体模糊叠加
- **THEN** 该节点背景 SHALL 使用高不透明度半透明色（light ≥ 0.90，dark ≥ 0.96），使卡片比侧边栏背景更"实"
- **THEN** 该节点 SHALL 通过 box-shadow 的视觉扩展与统一的上下 margin 共同营造与相邻非活跃 tab 的视觉间距感（视觉间距 ≥ 3px）

#### Scenario: Tab 切换零布局抖动
- **WHEN** 用户在二级 terminal tab 之间切换活跃状态
- **THEN** 所有 tab 行的总垂直占位（height + marginTop + marginBottom）SHALL 保持恒定，不因活跃状态变化而改变
- **THEN** 列表中未参与切换的 tab 行位置 SHALL 不发生任何位移

#### Scenario: 非活跃 terminal tab 大幅弱化
- **WHEN** 某个二级 terminal tab 不是当前活跃 session
- **THEN** 该节点文字 SHALL 使用大幅降低不透明度的颜色（原色的约 50-60%），通过 CSS 自定义属性定义
- **THEN** 该节点左侧指示点 SHALL 使用同等弱化的颜色
- **THEN** 该节点 SHALL 不使用外阴影、内发光或独立毛玻璃
- **THEN** 该节点背景 SHALL 保持透明

#### Scenario: 悬停非活跃 tab 提供预示性阴影反馈
- **WHEN** 用户悬停一个非活跃的二级 terminal tab
- **THEN** 该节点 SHALL 显示两层柔和阴影（弱于活跃态阴影）
- **THEN** 该节点背景 SHALL 提亮至 hover 状态色
- **THEN** 过渡动效 SHALL 使用约 200ms ease-out
- **THEN** 行内操作按钮的出现 SHALL 不导致列表文本跳动或节点宽度突变

#### Scenario: workspace 与 terminal tab 具有清晰层级
- **WHEN** terminal 侧边导航处于展开状态
- **THEN** 一级 workspace 节点 SHALL 通过更稳的字重、图标和表面层级与二级 terminal tab 区分
- **THEN** 二级 terminal tab SHALL 保持更轻的密度与更弱的背景存在感，避免与一级节点争抢视觉重点

#### Scenario: 侧边栏毛玻璃通透感
- **WHEN** terminal 侧边导航渲染
- **THEN** 侧边栏背景 SHALL 使用足够低的不透明度（light ≤ 0.60, dark ≤ 0.70）使背后 terminal 内容隐约可见
- **THEN** 侧边栏 SHALL 使用 ≥ 24px 的 blur 值和 ≥ 180% 的 saturate 值增强毛玻璃质感
- **THEN** 侧边栏顶部 SHALL 有 inset 高光线增加"玻璃板"边缘感
