# Capability: browser-panel

## Purpose
内嵌浏览器面板，提供多 Tab 网页浏览能力，支持地址栏导航、搜索引擎搜索、前进/后退/刷新操作，面板以滑出动画覆盖内容区，通过按钮或快捷键切换显示。

## Requirements

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

### Requirement: 滑出/收起动画
浏览器面板 SHALL 使用 CSS 动画从上往下滑出、从下往上收起，过渡时间约 300ms。

#### Scenario: 打开动画
- **WHEN** 浏览器面板从隐藏变为显示
- **THEN** 面板 SHALL 使用 `translateY` 从视口上方滑入到可见位置，过渡时间约 300ms

#### Scenario: 关闭动画
- **WHEN** 浏览器面板从显示变为隐藏
- **THEN** 面板 SHALL 使用 `translateY` 从可见位置滑出到视口上方，过渡时间约 300ms

#### Scenario: 隐藏时不遮挡交互
- **WHEN** 浏览器面板处于隐藏状态
- **THEN** 面板 SHALL NOT 拦截鼠标和键盘事件，下层内容 SHALL 正常可交互

### Requirement: 面板覆盖区域
浏览器面板 SHALL 完全覆盖标题栏以下的内容区（文件树和终端区域），高度与内容区一致。

#### Scenario: 覆盖范围
- **WHEN** 浏览器面板打开
- **THEN** 面板 SHALL 覆盖整个内容区，不覆盖标题栏
- **THEN** 面板高度 SHALL 等同于内容区高度

### Requirement: 多 Tab 管理
浏览器面板 SHALL 支持多个 Tab，每个 Tab 对应一个独立的 webview 实例。

#### Scenario: 新建 Tab
- **WHEN** 用户点击 Tab 栏上的 [+] 按钮
- **THEN** 系统 SHALL 创建一个新 Tab 并加载 Google 搜索首页（`https://www.google.com`）
- **THEN** 新 Tab SHALL 自动成为活跃 Tab

#### Scenario: 关闭 Tab
- **WHEN** 用户点击某个 Tab 上的关闭按钮
- **THEN** 该 Tab 及其 webview 实例 SHALL 被销毁
- **THEN** 如果关闭的是活跃 Tab，系统 SHALL 自动激活相邻 Tab

#### Scenario: 关闭最后一个 Tab
- **WHEN** 用户关闭浏览器面板中唯一的 Tab
- **THEN** 浏览器面板 SHALL 显示空状态页面
- **THEN** 面板 SHALL NOT 自动关闭

#### Scenario: 切换 Tab
- **WHEN** 用户点击一个非活跃的 Tab
- **THEN** 该 Tab SHALL 成为活跃 Tab，其对应的 webview 显示，其他 webview 隐藏

#### Scenario: Tab 标签显示
- **WHEN** webview 加载页面
- **THEN** Tab 标签 SHALL 显示页面标题（来自 `page-title-updated` 事件）
- **THEN** 如果页面标题过长，SHALL 截断并显示省略号

#### Scenario: 首次打开默认 Tab
- **WHEN** 用户首次打开浏览器面板
- **THEN** 系统 SHALL 自动创建一个 Tab 并加载 Google 搜索首页

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

### Requirement: 地址栏导航
浏览器面板 SHALL 提供地址栏，支持 URL 直接导航和搜索引擎搜索。

#### Scenario: 输入 URL 导航
- **WHEN** 用户在地址栏输入完整 URL（如 `https://example.com`）并按回车
- **THEN** 活跃 Tab 的 webview SHALL 导航到该 URL

#### Scenario: 输入无协议 URL 导航
- **WHEN** 用户在地址栏输入无协议的 URL（如 `example.com`）并按回车
- **THEN** 系统 SHALL 自动补全 `https://` 前缀并导航

#### Scenario: 输入搜索词
- **WHEN** 用户在地址栏输入非 URL 文本（如 `react hooks`）并按回车
- **THEN** 系统 SHALL 使用 Google 搜索引擎搜索该文本

#### Scenario: 地址栏显示当前 URL
- **WHEN** webview 页面导航完成
- **THEN** 地址栏 SHALL 更新显示当前页面的 URL

### Requirement: 导航按钮
浏览器面板 SHALL 提供后退、前进、刷新三个导航按钮。

#### Scenario: 后退按钮
- **WHEN** 用户点击后退按钮且 webview 有可后退的历史记录
- **THEN** webview SHALL 导航到上一个页面

#### Scenario: 后退按钮禁用状态
- **WHEN** webview 没有可后退的历史记录
- **THEN** 后退按钮 SHALL 显示为禁用状态

#### Scenario: 前进按钮
- **WHEN** 用户点击前进按钮且 webview 有可前进的历史记录
- **THEN** webview SHALL 导航到下一个页面

#### Scenario: 前进按钮禁用状态
- **WHEN** webview 没有可前进的历史记录
- **THEN** 前进按钮 SHALL 显示为禁用状态

#### Scenario: 刷新按钮
- **WHEN** 用户点击刷新按钮
- **THEN** webview SHALL 重新加载当前页面

### Requirement: webview 安全隔离
每个 webview SHALL 使用独立的 session partition，不与主应用共享 cookie 和存储。

#### Scenario: session 隔离
- **WHEN** webview 加载外部网站
- **THEN** 该网站的 cookie 和 localStorage SHALL 存储在独立的 partition 中，不与主应用 session 混合

#### Scenario: 禁用 Node 集成
- **WHEN** webview 创建时
- **THEN** webview SHALL NOT 启用 `nodeintegration`，网页代码 SHALL NOT 能访问 Node.js API

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

### Requirement: 空状态页面
所有 Tab 关闭后，浏览器面板 SHALL 显示空状态页面，提供新建 Tab 和关闭面板的入口。

#### Scenario: 空状态页面内容
- **WHEN** 浏览器面板中所有 Tab 均已关闭
- **THEN** 面板 SHALL 居中显示像素风 ASCII art "hello world"
- **THEN** 面板 SHALL 提供 "New Tab" 按钮，点击后创建新 Tab 并加载 Google 首页
- **THEN** 面板 SHALL 提供 "Close" 按钮，点击后关闭浏览器面板

#### Scenario: 空状态下隐藏 Tab 栏和导航栏
- **WHEN** 浏览器面板处于空状态
- **THEN** Tab 栏和导航栏（地址栏、后退/前进/刷新按钮）SHALL NOT 显示
