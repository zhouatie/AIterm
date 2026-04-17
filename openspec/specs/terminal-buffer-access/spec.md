# Capability: terminal-buffer-access

## Purpose
终端缓冲区编程式访问能力，提供对终端内容的结构化读取接口，支持上下文提取、命令输出捕获和智能复制。

## Requirements

### Requirement: 获取最近 N 行内容
系统 SHALL 提供接口获取终端缓冲区中最近的 N 行文本内容。

#### Scenario: 读取最近 N 行
- **WHEN** 调用方请求获取最近 N 行终端内容
- **THEN** 系统 SHALL 从终端活跃缓冲区中读取最后 N 行的文本
- **AND** 返回的文本 SHALL 为纯文本格式（去除 ANSI 转义序列）

#### Scenario: 请求行数超过缓冲区总行数
- **WHEN** 调用方请求的行数超过缓冲区中的实际行数
- **THEN** 系统 SHALL 返回缓冲区中所有可用的行
- **AND** 不得抛出错误

### Requirement: 获取可视区域内容
系统 SHALL 提供接口获取当前终端视口中可见的所有文本内容。

#### Scenario: 读取可视区域
- **WHEN** 调用方请求获取当前可视区域内容
- **THEN** 系统 SHALL 返回终端视口中当前显示的所有行的文本
- **AND** 返回内容 SHALL 反映用户当前看到的实际文本

### Requirement: 获取全部缓冲区内容
系统 SHALL 提供接口获取终端缓冲区的全部文本内容。

#### Scenario: 读取全部内容
- **WHEN** 调用方请求获取全部缓冲区内容
- **THEN** 系统 SHALL 返回包括回滚历史在内的完整缓冲区文本
- **AND** 文本 SHALL 按行序排列

### Requirement: Buffer 访问接口暴露方式
TerminalInstance 组件 SHALL 通过 React ref 暴露 Buffer 访问方法。

#### Scenario: 父组件通过 ref 调用
- **WHEN** 父组件（TerminalPanel）持有 TerminalInstance 的 ref
- **THEN** 父组件 SHALL 能通过 ref 调用 `getBufferLines(count)`、`getVisibleContent()`、`getAllContent()` 方法
- **AND** 方法 SHALL 返回 string 或 string[] 类型

#### Scenario: 终端未初始化时安全调用
- **WHEN** 在终端实例尚未完成初始化时调用 Buffer 访问方法
- **THEN** 方法 SHALL 返回空数组或空字符串
- **AND** 不得抛出异常
