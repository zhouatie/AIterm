# Capability: desktop-app-distribution

## Purpose
桌面应用分发能力，覆盖本地 make 产物、GitHub Release 自动构建上传，以及用户下载后安装到 macOS 应用目录的发布流程。

## Requirements
### Requirement: 本地分发构建入口
系统 SHALL 提供明确的本地分发构建入口，使用 Electron Forge maker 产出可下载的 macOS 分发包，而不是要求用户直接依赖 `package` 目录作为长期安装来源.

#### Scenario: 本地生成 macOS ZIP
- WHEN 开发者在 macOS arm64 环境执行分发构建命令
- THEN 系统 SHALL 在 `out/make/zip/darwin/arm64/` 下生成包含版本号的 `AIterm` ZIP 产物

#### Scenario: 区分开发验证与正式分发
- WHEN 开发者查看发布或安装说明
- THEN 文档 SHALL 明确 `npm run package` 用于本地验证 app bundle
- THEN 文档 SHALL 明确 `npm run make` 或 CI Release 产物用于分发安装

### Requirement: GitHub Release 自动打包
系统 SHALL 在推送版本 tag 后通过 GitHub Actions 自动构建 macOS 分发包，并将产物上传到对应 GitHub Release.

#### Scenario: 版本 tag 触发发布构建
- WHEN 仓库推送匹配发布规则的版本 tag
- THEN GitHub Actions SHALL 启动发布构建 workflow

#### Scenario: CI 执行基础校验
- WHEN 发布构建 workflow 运行
- THEN workflow SHALL 使用 lockfile 安装依赖
- THEN workflow SHALL 执行项目基础校验
- THEN workflow SHALL 执行 Electron Forge 分发构建

#### Scenario: 上传 Release asset
- WHEN 发布构建成功完成
- THEN GitHub Release SHALL 包含 macOS arm64 ZIP 产物
- THEN 上传的文件名 SHALL 能表达应用名、平台、架构和版本

### Requirement: 用户下载安装说明
系统 SHALL 提供面向用户的下载和安装说明，使用户可以从 GitHub Release 获取 AIterm 并安装到 macOS 应用目录.

#### Scenario: 从 Release 下载
- WHEN 用户需要安装发布版本
- THEN 文档 SHALL 指导用户从 GitHub Release 下载 macOS arm64 ZIP

#### Scenario: 安装到 Applications
- WHEN 用户解压下载的 ZIP
- THEN 文档 SHALL 指导用户将 `AIterm.app` 移动到 `/Applications` 或 `~/Applications`

#### Scenario: 当前阶段限制说明
- WHEN 用户阅读发布或安装说明
- THEN 文档 SHALL 明确当前阶段不提供应用内自动更新
- THEN 文档 SHALL 明确签名、公证或 DMG 安装器不属于本阶段承诺
