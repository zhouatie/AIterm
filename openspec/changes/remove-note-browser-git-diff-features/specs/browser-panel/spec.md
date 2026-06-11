## REMOVED Requirements

### Requirement: 浏览器面板切换
**Reason**: 内嵌浏览器面板被移除，应用不再提供浏览器 overlay 或标题栏浏览器入口。
**Migration**: 用户需要浏览网页时使用系统浏览器；AIterm 不再承载该工作流。

### Requirement: 滑出/收起动画
**Reason**: 浏览器面板本身被移除，不再需要浏览器 overlay 的打开/关闭动画要求。
**Migration**: 无应用内迁移路径。

### Requirement: 面板覆盖区域
**Reason**: 浏览器面板被移除后，不再存在浏览器覆盖主内容区域的行为。
**Migration**: 无应用内迁移路径。

### Requirement: 多 Tab 管理
**Reason**: 内嵌浏览器被移除，不再提供浏览器标签页管理。
**Migration**: 使用系统浏览器的标签页能力。

### Requirement: 浏览器上下文快捷键
**Reason**: 浏览器面板被移除，不再需要浏览器上下文内的固定快捷键。
**Migration**: 工作台快捷键恢复为终端和文件相关动作，不再被浏览器上下文接管。

### Requirement: 地址栏导航
**Reason**: 内嵌浏览器地址栏被移除。
**Migration**: 在系统浏览器地址栏中输入 URL 或搜索词。

### Requirement: 导航按钮
**Reason**: 内嵌浏览器导航栏被移除。
**Migration**: 使用系统浏览器的后退、前进和刷新控件。

### Requirement: webview 安全隔离
**Reason**: 应用不再嵌入网页内容，不再需要浏览器 webview 的隔离要求。
**Migration**: 无应用内迁移路径；Electron 主窗口仍保持渲染进程安全隔离。

### Requirement: 弹窗处理
**Reason**: 浏览器 webview 被移除后，不再有浏览器面板内的新窗口请求需要处理。
**Migration**: 外部浏览器自行处理网页弹窗和新窗口。

### Requirement: 空状态页面
**Reason**: 浏览器面板被移除，不再存在浏览器空状态。
**Migration**: 无应用内迁移路径。
