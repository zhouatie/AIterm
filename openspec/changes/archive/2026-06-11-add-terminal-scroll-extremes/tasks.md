## 1. Terminal 滚动能力

- [x] 1.1 在 `TerminalInstanceHandle` 中新增首尾滚动方法，内部调用 xterm.js `scrollToTop()` 与 `scrollToBottom()`
- [x] 1.2 新增滚动状态读取能力，返回是否处于普通 buffer、是否存在 scrollback、是否位于最上方、是否位于最下方
- [x] 1.3 在滚动方法执行后恢复 terminal focus，确保用户可继续输入

## 2. 悬浮控件交互

- [x] 2.1 在 `TerminalPanel` 的 terminal 内容区为当前激活 session 渲染滚动到最上与滚动到最下的 icon-only 控件
- [x] 2.2 根据 active session 滚动状态隐藏无 scrollback 或 alternate screen 下的控件
- [x] 2.3 根据当前 viewport 位置禁用已无意义的目标按钮，例如已在最上方时禁用“滚动到最上”
- [x] 2.4 为控件添加 tooltip，说明功能和 terminal-local 快捷键
- [x] 2.5 调整控件样式，避免与 terminal 搜索栏、侧边栏收起按钮和主要输出内容产生明显遮挡

## 3. Terminal-local 快捷键

- [x] 3.1 在 terminal 聚焦且处于普通 buffer 时处理 `Command + ArrowUp` 为滚动到最上
- [x] 3.2 在 terminal 聚焦且处于普通 buffer 时处理 `Command + ArrowDown` 为滚动到最下
- [x] 3.3 确保首尾滚动快捷键不会作为字符输入写入 PTY stdin
- [x] 3.4 确保 alternate screen 下不触发应用级首尾滚动，并避免阻断 TUI 自身按键语义

## 4. 状态同步

- [x] 4.1 订阅 xterm `onScroll` 更新当前 active session 的滚动状态
- [x] 4.2 在 session 切换、输出补写、resize 和首次 attach 后刷新滚动状态
- [x] 4.3 确保多 session 场景下只更新并作用于当前激活 session，不改变后台 session viewport

## 5. 验证

- [x] 5.1 验证长输出场景下按钮和快捷键能滚动到当前保留缓冲区最上方与最下方
- [x] 5.2 验证无 scrollback 时不展示首尾滚动控件
- [x] 5.3 验证已在顶部或底部时对应控件不可用或不触发滚动
- [x] 5.4 验证 vim、less 或类似 alternate screen 场景下不展示控件且不触发应用级首尾滚动
- [x] 5.5 运行项目现有类型检查、构建或相关测试，确认没有引入回归
