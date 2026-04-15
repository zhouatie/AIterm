# Capability: git-diff-panel

## Purpose
Git Diff 覆盖面板，以 GitHub 风格的 unified diff 视图展示当前 active terminal session 对应 git 仓库相对于上次 commit 的全部改动，支持面板互斥、icon 状态管理、IPC 数据获取和主题适配。

## Requirements
### Requirement: Git Diff 面板展示
系统 SHALL 提供一个 Git Diff 覆盖面板，以 GitHub 风格的 unified diff 视图展示当前 active terminal session 对应 git 仓库相对于上次 commit 的全部改动。面板 SHALL 使用从上方滑下的动画（与 BrowserPanel 相同的 translateY slide-over 模式）覆盖主内容区域。

#### Scenario: 打开 Git Diff 面板
- **WHEN** 用户点击 title bar 中的 Git Diff icon，且当前 active terminal session 处于 git 仓库内
- **THEN** 系统 SHALL 从上方滑下一个全屏覆盖面板，展示 `git diff HEAD` 的结果
- **THEN** 面板 SHALL 使用 `@git-diff-view/react` 渲染 GitHub 风格的 diff 视图，包含语法高亮和 +/- 行着色

#### Scenario: 关闭 Git Diff 面板
- **WHEN** Git Diff 面板处于打开状态，用户再次点击 Git Diff icon 或按下关闭按钮
- **THEN** 系统 SHALL 将面板滑回上方关闭

#### Scenario: 无改动时的展示
- **WHEN** 用户打开 Git Diff 面板，但当前仓库相对于 HEAD 没有任何改动
- **THEN** 系统 SHALL 在面板中展示"当前没有改动"的提示信息

### Requirement: 面板顶部摘要信息
面板 SHALL 在顶部展示当前仓库的分支名和文件变更摘要。

#### Scenario: 展示分支名和变更统计
- **WHEN** Git Diff 面板打开
- **THEN** 面板顶部 SHALL 展示当前分支名称
- **THEN** 面板顶部 SHALL 展示文件变更摘要（已修改文件数、untracked 文件数等，数据来自 `git status --porcelain`）

### Requirement: 面板与 BrowserPanel 互斥
Git Diff 面板与 Browser 面板 SHALL 互斥，同一时间只能打开一个。

#### Scenario: 打开 Git Diff 时关闭 Browser
- **WHEN** BrowserPanel 处于打开状态，用户触发打开 Git Diff 面板
- **THEN** BrowserPanel SHALL 关闭
- **THEN** Git Diff 面板 SHALL 打开

#### Scenario: 打开 Browser 时关闭 Git Diff
- **WHEN** Git Diff 面板处于打开状态，用户触发打开 BrowserPanel
- **THEN** Git Diff 面板 SHALL 关闭
- **THEN** BrowserPanel SHALL 打开

### Requirement: Git Diff icon 状态管理
title bar 中的 Git Diff icon SHALL 根据当前 active terminal session 的 git 仓库状态动态切换启用/禁用态。

#### Scenario: Git 仓库内 — icon 启用
- **WHEN** 当前 active terminal session 的 CWD 在 git 仓库内（`isGitRepo === true`）
- **THEN** Git Diff icon SHALL 显示为正常可点击状态

#### Scenario: 非 git 仓库 — icon 禁用
- **WHEN** 当前 active terminal session 的 CWD 不在 git 仓库内（`isGitRepo === false`）
- **THEN** Git Diff icon SHALL 显示为灰色禁用态（降低 opacity、cursor: not-allowed）
- **THEN** icon 的 tooltip SHALL 显示"当前目录不是 Git 仓库"
- **THEN** 点击该 icon SHALL 无任何响应

#### Scenario: 切换 terminal tab 时 icon 状态更新
- **WHEN** 用户从一个在 git 仓库内的 terminal tab 切换到一个不在 git 仓库内的 terminal tab
- **THEN** Git Diff icon SHALL 立即切换为禁用态

#### Scenario: 切换到非 git tab 时关闭已打开的面板
- **WHEN** Git Diff 面板处于打开状态，用户切换到一个 `isGitRepo === false` 的 terminal tab
- **THEN** Git Diff 面板 SHALL 自动关闭

### Requirement: IPC 数据获取
系统 SHALL 通过 Electron IPC 提供 git diff 数据获取能力。

#### Scenario: 获取 diff 数据
- **WHEN** renderer 进程调用 `window.gitApi.diff(cwd)`
- **THEN** main 进程 SHALL 在指定 `cwd` 下执行 `git diff HEAD` 并返回原始 diff 文本

#### Scenario: 获取 status 摘要
- **WHEN** renderer 进程调用 `window.gitApi.statusSummary(cwd)`
- **THEN** main 进程 SHALL 在指定 `cwd` 下执行 `git status --porcelain` 并返回解析后的文件变更摘要

#### Scenario: 非 git 目录调用
- **WHEN** renderer 进程对一个非 git 目录调用 `window.gitApi.diff(cwd)`
- **THEN** main 进程 SHALL 返回错误信息，不得导致进程崩溃

### Requirement: 主题适配
Git Diff 面板 SHALL 跟随应用当前主题（light/dark）自动切换外观。

#### Scenario: Dark 主题下的 diff 渲染
- **WHEN** 应用处于 dark 主题
- **THEN** diff 视图 SHALL 使用 dark 配色方案渲染

#### Scenario: 主题切换时实时更新
- **WHEN** 用户在 Git Diff 面板打开期间切换主题
- **THEN** diff 视图 SHALL 实时切换到对应主题的配色
