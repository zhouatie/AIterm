## Why

Markdown 预览左侧标题树在收起状态下仍有一条较高的 hover 热区，用户选中文本时鼠标容易扫过该区域并意外弹出标题结构面板。需要把触发范围收窄到可见入口本身，减少与正文选择、阅读和评论交互的冲突。

## What Changes

- 收窄 Markdown 标题树收起状态的 hover 触发区域，使其只覆盖可见的悬浮入口。
- 保持标题树已展开后，鼠标位于入口或展开面板上时继续保持展开。
- 保持键盘 focus 展开标题树的可访问性行为。
- 保持标题点击滚动、无标题隐藏、非 Markdown 文件不显示标题树等现有能力不变。
- 不新增用户配置、不改变 Markdown 正文布局宽度、不改变评论持久化或文件内容。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `file-preview`: 收窄 Markdown 标题树导航在收起状态下的鼠标触发范围，避免隐藏面板或父容器形成过大的 hover 命中区域。

## Impact

- 影响渲染层文件：`src/components/MarkdownPreview.tsx` 和 `src/index.css` 中标题树入口、展开面板与 pointer/hover 布局相关实现。
- 影响 OpenSpec delta：`file-preview`。
- 不影响主进程 IPC、preload API、文件树扫描、Markdown 评论数据格式或查找高亮数据结构。
