## Why

AIterm 已经提供开发者工具、Agent Inbox 和 agent hook 通知链路，但用户需要离开应用查找文档才能了解当前应用使用方式和 hook 安装步骤。标题栏增加一个明确的帮助入口，可以让首次使用、换机器安装和排查通知链路都在应用内完成。

## What Changes

- 在标题栏增加一个 icon-only 问号入口，点击后打开应用帮助指南。
- 新增帮助指南面板，展示当前应用的核心使用方式、主要入口说明和 agent hook 安装/验证/排查说明。
- 在帮助指南中复用现有 Codex hook 通知文档的关键安装片段，支持用户复制配置或命令。
- 保持现有 agent 通知入口、PTY 环境注入、系统通知和 Agent Inbox 行为不变。

## Capabilities

### New Capabilities

- `app-help`: 覆盖标题栏帮助指南面板、应用使用指南、agent hook 安装说明、复制配置片段和排查说明。

### Modified Capabilities

- `panel-layout`: 标题栏需要支持新增帮助入口，并保持既有窗口拖拽、按钮点击和窄窗口布局可用。

## Impact

- 主要影响渲染层标题栏与帮助面板：`src/App.tsx`、新增帮助面板组件、相关样式。
- 复用现有文档内容：`docs/codex-hook-notifications.md`。
- 可能复用现有 `externalLinkApi` 或剪贴板能力用于打开外部文档/复制配置片段。
- 不新增运行时依赖，不改变 agent hook 通知协议，不自动修改用户全局 Codex 配置。
