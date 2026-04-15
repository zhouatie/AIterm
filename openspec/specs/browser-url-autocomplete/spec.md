# Capability: browser-url-autocomplete

## Purpose
地址栏自动补全功能，在用户输入时实时展示本地历史记录和搜索词建议，支持键盘与鼠标交互选择候选项，提升浏览导航效率。

## Requirements

### Requirement: 本地历史记录持久化
系统 SHALL 在每次 webview 成功导航后，将目标 URL 及页面标题写入 localStorage（key: `browser-url-history`）。同一 URL 重复访问时 SHALL 更新时间戳而非追加新条目。历史记录最多保存 1000 条，超出时 SHALL 自动裁剪最旧的记录。

#### Scenario: 导航成功后写入历史
- **WHEN** webview 触发 `did-navigate` 事件
- **THEN** 系统将该 URL 和页面标题以 `{ url, title, visitedAt }` 格式写入历史记录

#### Scenario: 重复访问同一 URL
- **WHEN** 用户导航到已存在于历史中的 URL
- **THEN** 系统更新该条目的 `visitedAt` 时间戳，而非新增重复条目

#### Scenario: 历史记录超过上限
- **WHEN** 新增记录后历史总条数超过 1000
- **THEN** 系统删除 `visitedAt` 最旧的条目，使总数恢复到 1000

#### Scenario: localStorage 不可用
- **WHEN** `localStorage` 读写抛出异常
- **THEN** 系统静默忽略错误，历史功能降级为当次会话内存模式，不影响浏览功能

---

### Requirement: 历史记录过滤补全
系统 SHALL 在用户于地址栏输入时，同步过滤本地历史记录并展示匹配的 URL 候选项。匹配规则为 URL 或标题包含输入字符串（大小写不敏感）。历史候选项最多展示 4 条，按 `visitedAt` 倒序排列。

#### Scenario: 输入内容匹配历史
- **WHEN** 用户在地址栏输入非空字符串
- **THEN** 系统在下拉框顶部展示最多 4 条包含该字符串的历史 URL

#### Scenario: 输入内容无历史匹配
- **WHEN** 用户输入的字符串在历史记录中无匹配
- **THEN** 下拉框的历史区域不展示任何条目（不显示空白占位）

#### Scenario: 地址栏为空
- **WHEN** 地址栏内容为空字符串
- **THEN** 系统不展示下拉补全面板

---

### Requirement: 搜索词建议
系统 SHALL 在用户输入停顿 300ms 后，向 DuckDuckGo Autocomplete API 请求搜索建议，并在下拉框历史区域下方展示最多 4 条建议。请求失败时系统 SHALL 静默忽略，不展示建议区域。

#### Scenario: 获取搜索建议成功
- **WHEN** 用户输入停顿超过 300ms 且 API 请求成功
- **THEN** 系统在下拉框下半部分展示最多 4 条搜索词建议，每条前显示搜索图标

#### Scenario: API 请求失败
- **WHEN** DuckDuckGo API 请求超时或返回错误
- **THEN** 系统静默忽略，下拉框仅展示历史记录区域，无错误提示

#### Scenario: 输入变化时取消旧请求
- **WHEN** 用户在上一次 API 请求响应返回前继续输入
- **THEN** 系统取消旧请求（通过 AbortController），仅处理最新请求的响应

---

### Requirement: 下拉补全面板 UI
系统 SHALL 在地址栏获得焦点且有输入内容时展示下拉补全面板。面板 SHALL 紧贴地址栏下方，宽度与地址栏一致。历史条目与搜索建议 SHALL 视觉上分区展示（历史在上，建议在下）。

#### Scenario: 地址栏获得焦点且有内容
- **WHEN** 地址栏获得焦点，且当前输入值非空
- **THEN** 系统展示下拉面板，显示历史候选项和/或搜索建议

#### Scenario: 点击候选项导航
- **WHEN** 用户点击下拉面板中的任意候选项
- **THEN** 系统以该候选项的 URL 或搜索词导航，并关闭下拉面板

#### Scenario: 失去焦点关闭面板
- **WHEN** 地址栏失去焦点
- **THEN** 系统在 150ms 延迟后关闭下拉面板（确保点击候选项的事件先执行）

---

### Requirement: 键盘导航
系统 SHALL 支持通过键盘在下拉候选项间导航并选择。

#### Scenario: 向下移动选中项
- **WHEN** 下拉面板展示中，用户按 ↓ 键
- **THEN** 高亮移动到下一条候选项，同时 addressValue 更新为该候选项内容

#### Scenario: 向上移动选中项
- **WHEN** 下拉面板展示中，用户按 ↑ 键
- **THEN** 高亮移动到上一条候选项，同时 addressValue 更新为该候选项内容

#### Scenario: 从第一项向上回到输入状态
- **WHEN** 当前高亮为第一条候选项，用户按 ↑ 键
- **THEN** 取消所有高亮，addressValue 恢复为用户原始输入内容

#### Scenario: 按 Enter 确认选中项
- **WHEN** 有候选项处于高亮状态，用户按 Enter 键
- **THEN** 系统以高亮候选项的 URL/搜索词导航，关闭下拉面板

#### Scenario: 按 Esc 关闭面板
- **WHEN** 下拉面板展示中，用户按 Esc 键
- **THEN** 系统关闭下拉面板，addressValue 保持当前值，焦点留在地址栏
