## REMOVED Requirements

### Requirement: 本地历史记录持久化
**Reason**: 浏览器地址栏和内嵌浏览器被移除，不再记录浏览历史。
**Migration**: 已有 `browser-url-history` localStorage 数据可保留在本地，但不再被应用读取或展示。

### Requirement: 历史记录过滤补全
**Reason**: 浏览器地址栏被移除，不再提供基于历史记录的补全。
**Migration**: 使用系统浏览器自身的地址栏历史和补全能力。

### Requirement: 搜索词建议
**Reason**: 浏览器地址栏被移除，不再请求搜索建议。
**Migration**: 使用系统浏览器或搜索引擎页面的建议能力。

### Requirement: 下拉补全面板 UI
**Reason**: 浏览器地址栏和补全数据源均被移除，不再渲染补全面板。
**Migration**: 无应用内迁移路径。

### Requirement: 键盘导航
**Reason**: 浏览器补全面板被移除，不再需要补全候选项键盘导航。
**Migration**: 无应用内迁移路径。
