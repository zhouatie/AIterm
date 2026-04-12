# Capability: terminal-tabs

## Purpose
终端多 Tab 管理能力，提供 Tab 栏 UI、Tab 的创建/切换/关闭以及多终端实例的生命周期管理。

## ADDED Requirements

### Requirement: Tab 栏显示
终端面板 SHALL 在顶部显示一个 Tab 栏，展示所有已打开的终端会话标签。

#### Scenario: 启动时默认显示一个 Tab
- **WHEN** 终端面板首次渲染
- **THEN** Tab 栏 SHALL 显示一个名为 "Terminal 1" 的默认 Tab，且该 Tab 为活跃状态

#### Scenario: Tab 栏布局
- **WHEN** Tab 栏渲染时
- **THEN** Tab 栏 SHALL 水平排列所有 Tab 标签，右侧 SHALL 显示一个新建按钮（`+`）

#### Scenario: 活跃 Tab 视觉区分
- **WHEN** 某个 Tab 为当前活跃 Tab
- **THEN** 该 Tab SHALL 与非活跃 Tab 有明显的视觉区分（如背景色、底部边框等）

### Requirement: 新建终端 Tab
用户 SHALL 能够通过点击新建按钮创建新的终端 Tab。

#### Scenario: 点击新建按钮
- **WHEN** 用户点击 Tab 栏的 `+` 按钮
- **THEN** 系统 SHALL 创建一个新的终端 Tab 和对应的 PTY 会话，Tab 名为 "Terminal N"（N 为递增编号），新 Tab SHALL 自动成为活跃 Tab

#### Scenario: 新终端独立工作目录
- **WHEN** 新的终端 Tab 被创建
- **THEN** 新终端 SHALL 启动一个独立的 shell 进程，工作目录为用户 HOME 目录

### Requirement: Tab 切换
用户 SHALL 能够通过点击 Tab 标签切换到对应的终端会话。

#### Scenario: 点击非活跃 Tab
- **WHEN** 用户点击一个非活跃的 Tab 标签
- **THEN** 该 Tab SHALL 成为活跃 Tab，对应的终端内容 SHALL 显示在面板中

#### Scenario: 切换时保留终端状态
- **WHEN** 用户从 Tab A 切换到 Tab B，再切回 Tab A
- **THEN** Tab A 的终端 SHALL 完整保留之前的输出历史、滚动位置和运行中的进程

#### Scenario: 切换后终端尺寸适配
- **WHEN** 用户切换到一个之前处于隐藏状态的 Tab
- **THEN** 该终端 SHALL 自动重新适配当前面板尺寸

### Requirement: 关闭终端 Tab
用户 SHALL 能够关闭终端 Tab，关闭时销毁对应的 PTY 会话。

#### Scenario: 点击关闭按钮
- **WHEN** 用户点击某个 Tab 上的关闭按钮（`×`）
- **THEN** 系统 SHALL 销毁该 Tab 对应的 PTY 进程并释放资源，从 Tab 栏中移除该 Tab

#### Scenario: 关闭活跃 Tab 后自动切换
- **WHEN** 用户关闭当前活跃的 Tab，且还有其他 Tab 存在
- **THEN** 系统 SHALL 自动切换到相邻的 Tab（优先切换到右侧，右侧没有则切换到左侧）

#### Scenario: 关闭最后一个 Tab
- **WHEN** 用户关闭最后一个 Tab
- **THEN** 系统 SHALL 自动创建一个新的终端 Tab，保证终端面板始终至少有一个可用的终端

### Requirement: 终端实例生命周期管理
每个 Tab 对应的终端实例 SHALL 独立管理自己的 xterm.js 和 PTY 生命周期。

#### Scenario: 终端实例挂载
- **WHEN** 一个新的 Tab 被创建
- **THEN** 系统 SHALL 创建一个独立的 xterm.js 实例并绑定到独立的 PTY 会话

#### Scenario: 非活跃终端保持连接
- **WHEN** 一个终端 Tab 处于非活跃状态
- **THEN** 其 PTY 进程 SHALL 继续运行，xterm.js 实例 SHALL 保持挂载（但不可见）

#### Scenario: Tab 关闭时清理资源
- **WHEN** 一个终端 Tab 被关闭
- **THEN** 系统 SHALL 销毁对应的 xterm.js 实例并通过 IPC 销毁 PTY 会话
