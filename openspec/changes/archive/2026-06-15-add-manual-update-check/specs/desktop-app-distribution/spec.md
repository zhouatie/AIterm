## ADDED Requirements

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
