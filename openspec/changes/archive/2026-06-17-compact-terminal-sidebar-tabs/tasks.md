## 1. 基线确认

- [x] 1.1 在 `src/components/TerminalPanel.tsx` 中定位 terminal 侧边栏的尺寸常量、workspace row、session row、header、footer、折叠按钮和列表 padding。
- [x] 1.2 记录当前展开态侧边栏宽度、workspace 标题可用宽度、session 标题可用宽度和单屏可显示节点数量，作为“不缩小文字显示范围”的对比基线。

基线记录：展开态侧边栏宽度为 240px；workspace 标题可用宽度约 130px；session 标题可用宽度约 112px；展开列表垂直 chrome 为 header 46px、footer 48px、列表 padding 24px，单个 session 节点约占 38px 高度。

## 2. 紧凑化实现

- [x] 2.1 保持展开态 `SIDEBAR_WIDTH` 不变，压缩 `ROW_HEIGHT`、`SIDEBAR_HEADER_HEIGHT`、`SIDEBAR_FOOTER_HEIGHT` 和列表垂直 padding。
- [x] 2.2 调整 workspace row 的 gap、水平 padding、图标尺寸和新增按钮尺寸，使视觉更紧凑且标题 flex 区域不小于基线。
- [x] 2.3 调整 session row 的 gap、水平 padding、二级缩进、状态点/快捷键编号/关闭按钮占位，使标题 flex 区域不小于基线。
- [x] 2.4 调整展开态底部折叠按钮和收起态展开按钮的尺寸、图标和状态徽标位置，保持视觉协调与可点击。

实现记录：`SIDEBAR_WIDTH` 保持 240px；workspace 标题可用宽度约提升到 148px；session 标题可用宽度约提升到 136px；单个 session 节点约占 32px 高度。

## 3. 交互与视觉验收

- [x] 3.1 验证 active、hover、drag、rename、close/new button、agent status 和 Cmd 数字提示状态没有重叠、错位或异常截断。
- [x] 3.2 验证长 workspace/session 标题仍单行省略，且开始省略的位置不早于基线。
- [x] 3.3 验证侧边栏收起/展开后状态保留，终端内容区 resize 与当前动画机制保持正常。
- [x] 3.4 运行项目现有类型检查或构建检查，并在本地界面截图确认同高度下可见 tab 数量不少于基线。
