## ADDED Requirements

### Requirement: 浏览器上下文快捷键
浏览器面板 SHALL 在打开状态下优先接管常用浏览器快捷键，并在地址栏、标签栏、空状态页与当前网页内容之间保持一致行为。

#### Scenario: 使用快捷键新建标签页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+T`
- **THEN** 系统 SHALL 创建一个新的浏览器标签页并加载默认首页
- **THEN** 新标签页 SHALL 自动成为活跃标签页

#### Scenario: 使用快捷键关闭当前标签页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+W`
- **THEN** 系统 SHALL 关闭当前活跃浏览器标签页
- **THEN** 若关闭后仍有其他标签页，系统 SHALL 自动激活相邻标签页
- **THEN** 若关闭后已无任何标签页，浏览器面板 SHALL 显示空状态页面而不是自动关闭

#### Scenario: 使用快捷键切换相邻标签页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+Shift+[` 或 `Cmd+Shift+]`
- **THEN** 系统 SHALL 按标签栏视觉顺序切换到前一个或后一个浏览器标签页
- **THEN** 若当前已在边界标签页，系统 SHALL 循环切换到另一端标签页

#### Scenario: 使用编号快捷键跳转到指定标签页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+1` 到 `Cmd+8`
- **THEN** 系统 SHALL 按标签栏视觉顺序跳转到对应序号的浏览器标签页
- **THEN** 若该序号超出当前标签页数量，系统 SHALL 静默不执行任何操作

#### Scenario: 使用 Cmd+9 跳转到最后一个标签页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+9`
- **THEN** 系统 SHALL 跳转到最后一个浏览器标签页
- **THEN** 若当前只有一个标签页，系统 SHALL 保持该标签页为活跃状态

#### Scenario: 使用快捷键刷新当前网页
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+R`
- **THEN** 系统 SHALL 重新加载当前活跃标签页的网页内容

#### Scenario: 使用快捷键前进和后退
- **WHEN** 浏览器面板处于打开状态，且用户按下 `Cmd+[` 或 `Cmd+]`
- **THEN** 系统 SHALL 对当前活跃标签页执行后退或前进行为
- **THEN** 若当前标签页不存在对应历史记录，系统 SHALL 静默不执行任何操作

## MODIFIED Requirements

### Requirement: 浏览器面板切换
系统 SHALL 提供 🌐 按钮和 `Cmd+L` 快捷键来切换浏览器面板的显示与隐藏。`Cmd+L` SHALL 作为浏览器面板的保留开关键，在浏览器面板打开或关闭状态下都可触发，且不得因地址栏输入框或当前网页内容获得焦点而失效。

#### Scenario: 点击按钮打开浏览器面板
- **WHEN** 用户点击标题栏中 Live View 按钮右侧的 🌐 按钮
- **THEN** 浏览器面板 SHALL 从上往下滑出，完全覆盖内容区（文件树 + 终端）

#### Scenario: 点击按钮关闭浏览器面板
- **WHEN** 浏览器面板已打开，用户再次点击 🌐 按钮
- **THEN** 浏览器面板 SHALL 从下往上收起并隐藏

#### Scenario: 快捷键切换浏览器面板
- **WHEN** 用户按下 `Cmd+L`
- **THEN** 浏览器面板 SHALL 切换显示/隐藏状态，行为与点击 🌐 按钮一致

#### Scenario: 地址栏获焦时快捷键切换浏览器面板
- **WHEN** 浏览器面板已打开，且焦点位于地址栏输入框
- **THEN** 用户按下 `Cmd+L`
- **THEN** 系统 SHALL 关闭浏览器面板

#### Scenario: 网页内容获焦时快捷键切换浏览器面板
- **WHEN** 浏览器面板已打开，且焦点位于当前活跃标签页的网页内容
- **THEN** 用户按下 `Cmd+L`
- **THEN** 系统 SHALL 关闭浏览器面板

#### Scenario: 关闭面板不销毁 webview
- **WHEN** 用户关闭浏览器面板
- **THEN** 面板中的 webview 实例和 Tab 状态 SHALL 保留，再次打开时恢复原样

### Requirement: 弹窗处理
webview 中的弹窗请求 SHALL 通过主进程 `setWindowOpenHandler` 拦截，并在浏览器面板中以新 Tab 打开。

#### Scenario: 链接新窗口请求
- **WHEN** webview 中的页面请求打开新窗口（如 `target="_blank"` 或 `window.open`）
- **THEN** 主进程 SHALL 通过 `setWindowOpenHandler` 拦截该请求并返回 `{ action: 'deny' }`
- **THEN** 主进程 SHALL 通过 `browser:open-url` IPC 通道将目标 URL 发送给渲染进程
- **THEN** 浏览器面板 SHALL 在面板内创建新 Tab 加载该 URL，而非打开新的 Electron 窗口

#### Scenario: 渲染进程不使用废弃 API
- **WHEN** webview 元素创建并绑定事件时
- **THEN** SHALL NOT 监听已废弃的 `new-window` 事件

#### Scenario: IPC 消息接收与新 Tab 创建
- **WHEN** 渲染进程收到 `browser:open-url` IPC 消息
- **THEN** 浏览器面板 SHALL 调用 `addTab(url)` 在面板内打开该 URL
- **THEN** 如果浏览器面板当前未显示，面板 SHALL 自动打开
- **THEN** 新创建的标签页 SHALL 自动成为活跃标签页
