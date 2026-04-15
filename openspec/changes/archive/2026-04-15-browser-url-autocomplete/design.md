## Context

内置浏览器基于 Electron `<webview>` 标签实现，地址栏是 `BrowserPanel.tsx` 中的一个受控 `<input>`。当前 `onDidNavigate` 事件已在每次导航时触发，但 URL 数据被丢弃。`resolveInput()` 函数已处理"URL vs 搜索词"的判断逻辑，可复用。

导航栏（`navBarStyle`）无 `overflow: hidden`，下拉框可以安全地用 `absolute` 定位溢出显示，无需 React Portal。

## Goals / Non-Goals

**Goals:**
- 在地址栏输入时展示本地历史 URL 候选项（同步，立即响应）
- 在地址栏输入时展示 DuckDuckGo 搜索词建议（异步，防抖 300ms）
- 键盘 ↑↓ 导航、Enter 确认、Esc 关闭
- 点击候选项直接导航
- 历史记录持久化到 localStorage，跨会话保留

**Non-Goals:**
- 不集成 Chromium 内置历史（无官方 API）
- 不支持书签管理
- 不提供历史删除 UI（可后续迭代）
- 不支持多搜索引擎切换（可后续迭代）

## Decisions

### 决策 1：搜索建议 API 选用 DuckDuckGo

**选择**：`https://duckduckgo.com/ac/?q=<input>&type=list`

**理由**：
- 返回标准 JSON Array（`["query", ["suggestion1", "suggestion2", ...]]`），无需 JSONP 解析
- 无需 API Key
- 在 Electron 主窗口（非 webview）中无 CORS 限制，可直接 `fetch()`
- 相比 Google Suggest，在国内网络环境下更稳定

**备选**：Google Suggest（`suggestqueries.google.com`）返回 JSONP 格式，解析脆弱且在国内可能被拦截，不采用。

---

### 决策 2：历史存储用 localStorage

**选择**：`localStorage.setItem('browser-url-history', JSON.stringify(entries))`

**数据结构**：
```
Array<{ url: string; title: string; visitedAt: number }>
最多 1000 条，按 visitedAt 倒序，同一 URL 去重（更新时间戳）
```

**理由**：
- 在 Electron 渲染进程中可直接读写，无需 IPC
- 持久化跨会话，实现成本最低
- 1000 条 × ~150 bytes ≈ 150KB，远低于 localStorage 上限

**备选**：主进程 JSON 文件（需 IPC 往返，复杂度高）；纯 React state（重启丢失）。不采用。

---

### 决策 3：防抖时长 300ms

**理由**：用户输入停顿 300ms 后触发请求，体验流畅，请求频率合理。低于 200ms 会产生过多请求；高于 400ms 会有明显延迟感。

---

### 决策 4：下拉框用 absolute 定位，不用 Portal

**理由**：`navBarStyle` 无 `overflow: hidden`，下拉框可从 input 的 `position: relative` 包裹层安全溢出。Portal 会增加 z-index 管理复杂度，不必要。

---

### 决策 5：键盘导航同步更新 addressValue

**选择**：↓↑ 选中候选项时，`addressValue` 同步变更为候选项内容（Chrome 地址栏行为）

**理由**：与用户对现代浏览器的操作习惯一致，且支持用户在选中后继续编辑候选项内容。

---

### 决策 6：候选项布局 —— 历史在上，建议在下

```
┌─────────────────────────────────────────┐
│ 🕐 https://react.dev                   │  ← 历史（URL 图标）
│ 🕐 https://reactjs.org                 │
│ ─────────────────────────────────────  │
│ 🔍 react hooks                         │  ← 搜索建议（搜索图标）
│ 🔍 react hook form                     │
└─────────────────────────────────────────┘
  最多展示：历史 4 条 + 建议 4 条
```

**理由**：历史是精确匹配已访问 URL，优先级高；搜索建议是探索性内容，置后。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| DuckDuckGo API 请求失败（网络问题） | `try/catch` 静默失败，降级为纯历史模式，UI 无报错 |
| 防抖期间组件 unmount（切换 tab） | 使用 `AbortController` 在 `useEffect` cleanup 中取消请求 |
| `onBlur` 触发时下拉框消失，点击失效 | `onBlur` 延迟 150ms 后再关闭下拉框 |
| localStorage 被禁用（极少见） | `try/catch` 包裹读写，降级为无历史模式 |
| 历史记录累积过多 | 写入时超过 1000 条自动裁剪最旧的记录 |
