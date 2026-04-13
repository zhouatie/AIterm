# Capability: settings-panel

## Purpose
应用内设置面板，负责统一承载基础配置入口，并展示当前支持的快捷键配置项。

## Requirements

### Requirement: 设置面板打开与关闭
应用 SHALL 提供一个应用内设置面板，并支持通过固定快捷键 `Command + ,` 打开。

#### Scenario: 通过快捷键打开设置面板
- **WHEN** 用户在应用窗口内按下 `Command + ,`
- **THEN** 系统 SHALL 打开设置面板，而不是新开独立窗口

#### Scenario: 重复触发不创建第二个设置实例
- **WHEN** 设置面板已经处于打开状态时，用户再次按下 `Command + ,`
- **THEN** 系统 SHALL 保持当前设置面板实例处于前台可见状态

#### Scenario: 用户主动关闭设置面板
- **WHEN** 用户点击设置面板的关闭操作
- **THEN** 系统 SHALL 关闭设置面板并返回主工作界面

### Requirement: 设置面板提供快捷键配置区
设置面板 SHALL 提供本次支持的快捷键配置区，用于展示和编辑可配置动作的当前绑定值。

#### Scenario: 展示可配置动作
- **WHEN** 用户打开设置面板
- **THEN** 系统 SHALL 展示文件树展示/收起、terminal tab 侧边栏展示/收起、新增 workspace 这 3 个动作的快捷键配置项

#### Scenario: 展示当前生效值
- **WHEN** 设置面板渲染快捷键配置项
- **THEN** 每个配置项 SHALL 显示当前生效的快捷键值

#### Scenario: 提供保存入口
- **WHEN** 用户在设置面板中修改了任一快捷键配置
- **THEN** 系统 SHALL 提供明确的保存操作以提交本次修改
