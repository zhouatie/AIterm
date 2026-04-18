# Capability: note-storage

## Purpose
笔记存储层，管理笔记文件的默认和自定义存储目录、目录创建 IPC、userData 路径获取及文件/文件夹重命名 IPC。

## Requirements
### Requirement: 默认笔记存储目录
系统 SHALL 提供默认的笔记存储目录，位于 Electron userData 路径下的 `notes` 子目录。

#### Scenario: 使用默认目录
- **WHEN** 用户未配置自定义笔记目录
- **THEN** 系统 SHALL 使用 `{userData}/notes/` 作为笔记根目录

#### Scenario: 默认目录不存在时自动创建
- **WHEN** 笔记面板首次打开且默认笔记目录不存在
- **THEN** 系统 SHALL 自动创建该目录（含必要的父目录）

### Requirement: 自定义笔记存储目录
系统 SHALL 允许用户在设置面板中配置自定义笔记存储目录。

#### Scenario: 配置自定义目录
- **WHEN** 用户在设置面板中输入自定义笔记目录路径并保存
- **THEN** 系统 SHALL 将路径持久化到 localStorage
- **THEN** 笔记面板 SHALL 立即切换到使用新目录

#### Scenario: 自定义目录不存在时自动创建
- **WHEN** 用户配置的自定义目录路径不存在
- **THEN** 系统 SHALL 自动创建该目录（含必要的父目录）

#### Scenario: 恢复默认目录
- **WHEN** 用户清空自定义笔记目录配置并保存
- **THEN** 系统 SHALL 回退到使用默认的 `{userData}/notes/` 目录

### Requirement: 目录创建 IPC
主进程 SHALL 提供目录创建的 IPC 接口，供渲染进程调用。

#### Scenario: 创建目录
- **WHEN** 渲染进程通过 `fs:ensure-dir` IPC 请求创建目录
- **THEN** 主进程 SHALL 递归创建目标目录（等同于 `mkdir -p`）
- **THEN** 若目录已存在，SHALL 静默成功不报错

### Requirement: 获取 userData 路径
渲染进程 SHALL 能够获取 Electron 的 userData 路径，用于拼接默认笔记目录。

#### Scenario: 获取 userData 路径
- **WHEN** 渲染进程通过 IPC 请求 userData 路径
- **THEN** 主进程 SHALL 返回 `app.getPath('userData')` 的值

### Requirement: 文件/文件夹重命名 IPC
主进程 SHALL 提供文件和文件夹重命名的 IPC 接口，供渲染进程调用。

#### Scenario: 重命名文件或文件夹
- **WHEN** 渲染进程通过 `fs:rename` IPC 请求将 oldPath 重命名为 newPath
- **THEN** 主进程 SHALL 执行重命名操作
- **THEN** 若 newPath 已存在，SHALL 返回错误而不覆盖
