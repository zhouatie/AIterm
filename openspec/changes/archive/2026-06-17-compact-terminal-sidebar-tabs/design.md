## Context

terminal 面板当前在 `src/components/TerminalPanel.tsx` 内渲染侧边双层 tab 导航。展开态侧边栏宽度由 `SIDEBAR_WIDTH = 240` 控制，节点密度主要由 `SIDEBAR_HEADER_HEIGHT`、`SIDEBAR_FOOTER_HEIGHT`、`ROW_HEIGHT`、列表 padding、节点 gap、图标尺寸、操作按钮尺寸和二级列表缩进共同决定。

用户反馈是“整体缩小一些，但文字显示范围不要缩小”。因此本次设计应压缩侧边栏的视觉 chrome 和垂直密度，而不是降低展开态侧边栏宽度或牺牲标题文本所在的 flex 区域。

## Goals / Non-Goals

**Goals:**

- 让 terminal 侧边栏 tab 在展开态更紧凑，减少高度、间距和按钮视觉占用。
- 保持 workspace 与 terminal 标题的可用显示宽度不小于当前实现。
- 保持现有 active、hover、drag、rename、close/new button、agent status、快捷键编号等状态语义。
- 保持侧边栏收起/展开动画和终端内容区 resize 行为稳定。

**Non-Goals:**

- 不改变 `SIDEBAR_WIDTH` 的展开态宽度，避免文字显示范围变窄。
- 不改变终端 session、workspace、PTY 生命周期或持久化数据结构。
- 不重新设计 terminal tab 的信息架构、命名规则或快捷键。
- 不新增依赖或引入新的设计系统抽象，除非实现时发现现有内联样式重复已经影响维护。

## Decisions

1. **压缩内部 chrome，而不是缩小侧边栏宽度**

   保持 `SIDEBAR_WIDTH` 为现有值，优先下调 `ROW_HEIGHT`、header/footer 高度、列表上下 padding、workspace 间距和二级节点 margin。这样用户看到的 tab 更紧凑，但标题文本可用横向空间不会因侧边栏变窄而减少。

   备选方案是直接缩小 `SIDEBAR_WIDTH`，实现简单但会让长标题更早省略，和用户要求冲突。

2. **用减少非文本占位来保护标题宽度**

   对 row 内部横向布局只压缩图标/按钮/gap/缩进等非文本占位，且需要核对压缩后标题 span 的 flex 区域不小于当前实现。workspace row 和 terminal row 都应保持 `flex: 1`、`minWidth: 0`、单行省略。

   备选方案是只降低 row 高度不动横向布局，这能减少垂直占用，但无法解决用户感知中“整体占空间”的横向 chrome 厚重感。

3. **保持交互目标可点击但视觉更轻**

   新建、关闭、收起/展开等按钮可以降低视觉尺寸或间距，但不应让 hover/active 状态失去可识别性。若按钮尺寸下调，需要同时检查 icon 居中、状态徽标位置和 tooltip 触发区域。

   备选方案是隐藏更多按钮以换取清爽感，但会改变现有显隐规则，增加可发现性风险。

4. **以截图和文本截断行为作为验收重点**

   实现后应在有较长 workspace/session 名称的场景下验证：相同展开态宽度里，标题开始省略的位置不早于修改前；相同高度里能显示更多 tab；active/hover/rename/drag 状态没有重叠或错位。

## Risks / Trade-offs

- **[Risk] 点击目标过小导致操作变难** → **Mitigation**：压缩优先作用于视觉 padding 和行距，按钮尺寸下调保持克制，并通过 hover 状态检查实际可点击性。
- **[Risk] agent status、快捷键编号、关闭按钮同时出现时挤压标题** → **Mitigation**：保留或减少非文本固定宽度，验收时覆盖这些附加元素同时出现的场景。
- **[Risk] header/footer 缩小后控件视觉不居中** → **Mitigation**：同步调整容器高度、按钮尺寸和 padding，并用浏览器截图检查垂直对齐。
- **[Risk] 收起/展开动画受高度或 padding 调整影响** → **Mitigation**：不改变 collapse transform/width 机制，只调整展开态内部密度参数。
