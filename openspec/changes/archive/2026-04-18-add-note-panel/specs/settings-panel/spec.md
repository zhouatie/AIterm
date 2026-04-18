## ADDED Requirements

### Requirement: 笔记目录配置
设置面板 SHALL 提供笔记存储目录配置项，允许用户指定笔记文件的存储位置。

#### Scenario: 展示笔记目录配置项
- **WHEN** 用户打开设置面板
- **THEN** 系统 SHALL 展示笔记目录配置项
- **THEN** 配置项 SHALL 显示当前生效的笔记目录路径（若未配置则显示默认路径提示）

#### Scenario: 保存笔记目录配置
- **WHEN** 用户输入自定义笔记目录路径并点击保存
- **THEN** 系统 SHALL 将路径持久化到 localStorage
- **THEN** 笔记面板 SHALL 使用新路径加载笔记列表

#### Scenario: 清空笔记目录配置
- **WHEN** 用户清空笔记目录输入框并保存
- **THEN** 系统 SHALL 回退到使用默认笔记目录
