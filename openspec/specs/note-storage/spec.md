# Capability: note-storage

## Purpose
文件存储 IPC 层，负责提供目录创建与文件/文件夹重命名能力。

## Requirements
### Requirement: 目录创建 IPC
主进程 SHALL 提供目录创建的 IPC 接口，供渲染进程调用。

#### Scenario: 创建目录
- **WHEN** 渲染进程通过 `fs:ensure-dir` IPC 请求创建目录
- **THEN** 主进程 SHALL 递归创建目标目录（等同于 `mkdir -p`）
- **THEN** 若目录已存在，SHALL 静默成功不报错

### Requirement: 文件/文件夹重命名 IPC
主进程 SHALL 提供文件和文件夹重命名的 IPC 接口，供渲染进程调用。

#### Scenario: 重命名文件或文件夹
- **WHEN** 渲染进程通过 `fs:rename` IPC 请求将 oldPath 重命名为 newPath
- **THEN** 主进程 SHALL 执行重命名操作
- **THEN** 若 newPath 已存在，SHALL 返回错误而不覆盖
