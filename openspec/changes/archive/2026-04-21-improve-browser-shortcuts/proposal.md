## Why

当前内置浏览器虽然已经支持多标签和地址栏导航，但快捷键行为仍然沿用应用主工作台的全局 terminal 语义，导致 `Cmd+T`、`Cmd+W`、`Cmd+Shift+[`、`Cmd+Shift+]`、`Cmd+1..9` 等用户最常用的浏览器操作在浏览器面板打开时仍作用于 terminal。与此同时，`Cmd+L` 作为浏览器开关键在地址栏获焦时会被输入元素屏蔽，无法满足“无论浏览器当前开关状态，都能用 `Cmd+L` 切换”的预期。

这使内置浏览器在日常使用中与真实浏览器的交互心智严重错位。需要补齐一套明确的“浏览器上下文优先”快捷键规则，让浏览器打开时的主要快捷键尽量贴近真实浏览器，同时在浏览器关闭时保持现有 terminal 行为不变。

## What Changes

- 修改浏览器面板行为：当浏览器面板处于打开状态时，优先接管与 terminal 冲突的常用浏览器快捷键。
- 修改浏览器面板快捷键能力，支持至少以下默认行为：`Cmd+T` 新建标签页、`Cmd+W` 关闭当前标签页、`Cmd+Shift+[` / `Cmd+Shift+]` 切换前后标签页、`Cmd+1..9` 跳转标签页、`Cmd+R` 刷新、`Cmd+[` / `Cmd+]` 后退/前进。
- 修改浏览器面板切换规则，要求 `Cmd+L` 无论浏览器当前是否打开、无论焦点位于地址栏还是网页内容，都必须切换浏览器面板开关。
- 修改快捷键系统规则，引入“浏览器打开时由浏览器优先消费冲突快捷键，浏览器关闭时恢复工作台默认行为”的上下文分发语义。
- 保持现有 terminal 默认快捷键不变，不新增兼容模式，不在本次变更中扩展快捷键设置页的自定义能力。
- 修正现有浏览器新窗口转新标签行为，要求当网页触发新窗口打开请求时，若浏览器面板当前未显示，也必须自动打开浏览器面板并激活新标签。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `browser-panel`: 扩展浏览器面板的快捷键行为、标签页切换能力，以及 `Cmd+L` 与新窗口转新标签时的面板开关规则。
- `keyboard-shortcuts`: 修改应用级快捷键分发规则，使浏览器打开时允许浏览器上下文优先接管冲突快捷键，同时确保 `Cmd+L` 不受地址栏或网页焦点影响。

## Impact

- 受影响代码主要包括 [src/components/BrowserPanel.tsx](/Users/zhoushitie/My/AItem.browser-keymap/src/components/BrowserPanel.tsx)、[src/ShortcutContext.tsx](/Users/zhoushitie/My/AItem.browser-keymap/src/ShortcutContext.tsx)、[src/App.tsx](/Users/zhoushitie/My/AItem.browser-keymap/src/App.tsx)、[src/main.ts](/Users/zhoushitie/My/AItem.browser-keymap/src/main.ts) 以及 preload/browser IPC 暴露层。
- 受影响系统包括渲染进程快捷键分发、浏览器面板标签页状态管理、主进程对 webview 键盘与新窗口事件的桥接处理。
- 不新增外部依赖，不修改 terminal 默认快捷键绑定，不引入向后兼容分支。
