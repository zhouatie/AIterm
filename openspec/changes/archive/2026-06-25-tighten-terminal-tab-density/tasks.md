## 1. Terminal tab 紧凑布局

- [x] 1.1 缩短展开态 Terminal 侧边栏固定宽度，减少左侧导航横向占用。
- [x] 1.2 缩短二级 terminal tab 的行内 `gap`、左右 padding 和左侧缩进。
- [x] 1.3 缩短二级 terminal tab 的 agent status 与 Command 序号固定槽位，使状态点与名称距离更近。
- [x] 1.4 缩短二级 terminal tab 关闭按钮视觉占位，并保持 hover/active 显示规则。
- [x] 1.5 保持名称单行省略、agent status/Command 序号显示隐藏无布局抖动。
- [x] 1.6 微调状态点与名称之间的间距，使二级 tab 名称起点与 workspace 名称起点对齐。

## 2. 验证

- [x] 2.1 对比实现前后常量和行内样式，确认侧边栏宽度、状态点到名称距离和二级 tab 横向占位均缩短。
- [x] 2.2 运行 TypeScript 检查或等价 focused 检查，确认修改无类型错误。
- [x] 2.3 检查 OpenSpec apply 状态，确认全部任务完成。
- [x] 2.4 验证二级 tab 名称起点与 workspace 名称起点对齐，且状态点与名称间距仍比原始实现紧凑。
