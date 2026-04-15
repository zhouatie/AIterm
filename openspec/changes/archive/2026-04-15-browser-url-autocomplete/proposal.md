## Why

内置浏览器的地址栏当前是一个无任何补全能力的纯文本输入框，用户每次都需要手动完整输入网址或搜索词。添加 URL 自动补全功能可以显著提升导航效率，与用户对现代浏览器地址栏的使用习惯保持一致。

## What Changes

- 地址栏新增下拉补全面板，在用户输入时实时展示候选项
- 本地浏览历史记录：每次导航成功后将 URL 写入 localStorage，支持跨会话持久化
- 历史记录过滤：根据输入实时过滤匹配的历史 URL，显示在候选列表顶部
- 搜索词建议：对用户输入进行防抖处理后，调用 DuckDuckGo Autocomplete API 获取搜索关键词建议，显示在历史记录下方
- 键盘导航：支持 ↑↓ 键在候选项间移动，Enter 确认选中，Esc 关闭下拉框
- 点击候选项直接导航
- API 请求失败时静默降级，仅展示本地历史

## Capabilities

### New Capabilities

- `browser-url-autocomplete`: 地址栏自动补全能力，包含本地历史存储、历史过滤、搜索建议获取与下拉 UI 展示

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **修改文件**：`src/components/BrowserPanel.tsx`（主要改动）
- **新增工具函数**（可内联或提取）：历史读写、防抖、DuckDuckGo API 调用
- **存储**：使用 `localStorage` 的 `browser-url-history` key，存储最多 1000 条历史记录
- **外部依赖**：DuckDuckGo Autocomplete API（`https://duckduckgo.com/ac/`），无需 API Key，网络失败时静默降级
- **无 Breaking Change**
