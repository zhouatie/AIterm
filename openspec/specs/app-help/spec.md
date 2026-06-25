# Capability: app-help

## Purpose
应用帮助能力用于在 AIterm 内展示当前应用程序使用指南、agent hook 安装说明、关键配置片段复制和排查信息。

## Requirements
### Requirement: 标题栏帮助指南面板
系统 SHALL 提供一个应用内帮助指南面板，用于展示 AIterm 当前应用程序的使用指南和 agent hook 安装说明。

#### Scenario: 打开帮助指南
- **WHEN** 用户点击标题栏问号帮助入口
- **THEN** 系统 SHALL 打开帮助指南面板
- **AND** 面板 SHALL 显示当前应用程序使用指南和 agent hook 安装说明的入口或分区

#### Scenario: 关闭帮助指南
- **WHEN** 帮助指南面板已打开，且用户点击关闭控件或面板外部遮罩
- **THEN** 系统 SHALL 关闭帮助指南面板
- **AND** 底层文件预览、terminal 和已打开的工作面板 SHALL 保持原有状态

#### Scenario: 帮助指南适配主题
- **WHEN** 应用主题在浅色、深色或跟随系统之间变化
- **THEN** 帮助指南面板 SHALL 使用当前主题的表面、文字、边框和强调色变量渲染

### Requirement: 应用使用指南
帮助指南面板 SHALL 展示当前应用的核心使用说明，使用户能够理解主要顶部入口和工作区功能。

#### Scenario: 展示核心入口说明
- **WHEN** 用户打开帮助指南面板
- **THEN** 系统 SHALL 展示文件预览、terminal 工作区、开发者工具、Live View、Agent Inbox、主题切换和更新检查等主要入口的用途

#### Scenario: 使用指南不遮挡操作状态
- **WHEN** 用户打开帮助指南面板
- **THEN** 系统 SHALL NOT 重置当前 terminal session、文件预览状态、开发者工具状态或 Agent Inbox 状态

### Requirement: Agent Hook 安装说明
帮助指南面板 SHALL 展示 agent hook 通知链路的安装、验证和排查说明，且说明 SHALL 基于 AIterm 当前实现的通知环境变量和 hook 脚本。

#### Scenario: 展示 Codex hook 配置片段
- **WHEN** 用户在帮助指南面板查看 agent hook 安装说明
- **THEN** 系统 SHALL 展示 Codex `config.toml` 所需的 `[features].hooks = true` 和 `UserPromptSubmit`、`PermissionRequest`、`Stop` hook 配置片段
- **AND** 配置片段 SHALL 提醒用户将 AIterm 仓库路径替换为本机绝对路径

#### Scenario: 展示 AIterm 内置终端要求
- **WHEN** 用户查看 agent hook 安装说明
- **THEN** 系统 SHALL 说明 Codex 需要从 AIterm 内置 terminal 启动才能继承 `AITEM_TERMINAL_SESSION_ID`、`AITEM_NOTIFY_URL` 和 `AITEM_NOTIFY_TOKEN`

#### Scenario: 展示验证步骤
- **WHEN** 用户查看 agent hook 安装说明
- **THEN** 系统 SHALL 展示验证环境变量和手动调用 `scripts/aiterm-notify.mjs` 的命令
- **AND** 系统 SHALL 说明预期结果包含 terminal tab agent 状态更新或系统通知

#### Scenario: 展示排查说明
- **WHEN** 用户查看 agent hook 安装说明
- **THEN** 系统 SHALL 展示没有通知、没有环境变量、hook 没执行和重复通知等常见问题的排查方向

### Requirement: 帮助内容复制
帮助指南面板 SHALL 允许用户复制关键安装片段和验证命令。

#### Scenario: 复制 hook 配置片段
- **WHEN** 用户点击 Codex hook 配置片段的复制操作
- **THEN** 系统 SHALL 将对应配置片段写入系统剪贴板
- **AND** 系统 SHALL 给出复制成功或失败的反馈

#### Scenario: 复制验证命令
- **WHEN** 用户点击验证命令的复制操作
- **THEN** 系统 SHALL 将对应命令写入系统剪贴板
- **AND** 系统 SHALL 给出复制成功或失败的反馈

### Requirement: 不自动安装 Hook
帮助指南面板 SHALL NOT 在第一版自动修改用户全局 agent 配置文件。

#### Scenario: 查看安装说明不写配置
- **WHEN** 用户打开帮助指南面板或复制 hook 配置片段
- **THEN** 系统 SHALL NOT 自动写入 `~/.codex/config.toml`
- **AND** 系统 SHALL NOT 自动写入 `$CODEX_HOME/config.toml`
