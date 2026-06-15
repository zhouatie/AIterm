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

### Requirement: 应用内手动检查更新
系统 SHALL 提供应用内手动检查更新能力，通过正式 GitHub Release 判断是否存在比当前运行版本更新的可下载版本，并引导用户手动下载。

#### Scenario: 用户手动触发更新检查
- **WHEN** 用户在应用内点击检查更新入口
- **THEN** 系统 SHALL 请求正式 GitHub Release 的最新版本信息
- **THEN** 系统 SHALL 将当前运行版本与最新 Release tag 表示的版本进行比较

#### Scenario: 当前版本已是最新
- **WHEN** 更新检查成功
- **AND** 当前运行版本大于或等于最新 Release 版本
- **THEN** 系统 SHALL 告知用户当前版本已是最新
- **THEN** 系统 SHALL 显示当前运行版本

#### Scenario: 发现可下载的新版本
- **WHEN** 更新检查成功
- **AND** 最新 Release 版本高于当前运行版本
- **THEN** 系统 SHALL 告知用户发现新版本
- **THEN** 系统 SHALL 显示当前运行版本和最新 Release 版本
- **THEN** 系统 SHALL 提供打开 GitHub Release 下载页面的操作
- **THEN** 系统 SHALL NOT 自动下载、自动替换、自动安装或自动重启应用

#### Scenario: 更新检查失败
- **WHEN** GitHub Release 信息请求失败、响应不可用或版本无法解析
- **THEN** 系统 SHALL 告知用户检查更新失败
- **THEN** 系统 SHALL 提供打开 GitHub Release 页面手动查看的操作
- **THEN** 系统 SHALL NOT 影响终端、文件预览或其他核心功能

#### Scenario: 手动更新限制说明
- **WHEN** 用户阅读发布或安装说明
- **THEN** 文档 SHALL 明确应用内检查更新只负责判断和打开下载页
- **THEN** 文档 SHALL 明确用户仍需从 GitHub Release 手动下载 ZIP 并替换已安装应用
- **THEN** 文档 SHALL 明确该能力不提供自动安装、签名、公证或 DMG 安装器
