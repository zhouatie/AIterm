# Capability: settings-panel

## Purpose
应用内设置面板，负责统一承载基础配置入口，包括快捷键配置、spec 目录配置和隐藏文件夹配置。
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
- **THEN** 系统 SHALL 展示文件树展示/收起、terminal tab 侧边栏展示/收起、浏览器面板展示/收起、文件预览内容查找、新增 workspace、当前激活 workspace 下新增 terminal tab、重命名当前 workspace、重命名当前二级 terminal tab、关闭当前二级 terminal tab、关闭当前 workspace、上一个 terminal tab、下一个 terminal tab、跳转到第 1 个至第 9 个 terminal tab 这些动作的快捷键配置项

#### Scenario: 展示当前生效值
- **WHEN** 设置面板渲染快捷键配置项
- **THEN** 每个配置项 SHALL 显示当前生效的快捷键值

#### Scenario: 提供保存入口
- **WHEN** 用户在设置面板中修改了任一快捷键配置
- **THEN** 系统 SHALL 提供明确的保存操作以提交本次修改

### Requirement: Spec 目录配置
设置面板 SHALL 提供 spec 目录名配置项，用于控制文件树 spec 模式加载哪些目录。

#### Scenario: 展示默认 spec 目录
- **WHEN** 用户首次打开设置面板且无已保存配置
- **THEN** 系统 SHALL 展示默认 spec 目录名 `openspec` 和 `ravenspec`

#### Scenario: 保存 spec 目录配置
- **WHEN** 用户编辑 spec 目录名列表并点击保存
- **THEN** 系统 SHALL 将规范化后的目录名列表保存到 localStorage

#### Scenario: 扩展 spec 目录配置
- **WHEN** 用户添加新的目录名并保存
- **THEN** 文件树 spec 模式 SHALL 使用更新后的目录名列表过滤根目录

### Requirement: 隐藏文件夹配置
设置面板 SHALL 提供「隐藏文件夹」配置区，允许用户自定义在文件树中需要隐藏的文件夹名称列表。

#### Scenario: 展示默认隐藏文件夹列表
- **WHEN** 用户首次打开设置面板且无已保存的隐藏文件夹配置
- **THEN** 系统 SHALL 展示空列表（无默认隐藏项）

#### Scenario: 新增隐藏文件夹名称
- **WHEN** 用户在「隐藏文件夹」配置区输入文件夹名称并确认添加
- **THEN** 系统 SHALL 将该名称追加到隐藏文件夹列表

#### Scenario: 删除隐藏文件夹名称
- **WHEN** 用户在「隐藏文件夹」配置区删除某个已有名称并保存
- **THEN** 系统 SHALL 从隐藏文件夹列表中移除该名称

#### Scenario: 保存隐藏文件夹配置
- **WHEN** 用户编辑隐藏文件夹列表并点击保存
- **THEN** 系统 SHALL 将更新后的文件夹名称列表持久化到 localStorage

### Requirement: 文件树按隐藏配置过滤文件夹
文件树在加载目录内容时，SHALL 在主进程扫描阶段直接忽略与隐藏文件夹名称列表匹配的文件夹，不得在渲染层进行二次过滤。

#### Scenario: 懒加载时过滤隐藏文件夹
- **WHEN** 文件树展开某个目录且用户已配置了隐藏文件夹名称列表
- **THEN** 主进程 SHALL 在返回目录内容前排除名称匹配的子文件夹，渲染层收到的结果中不包含这些文件夹

#### Scenario: 全量展开时过滤隐藏文件夹
- **WHEN** 用户点击「展开全部」且用户已配置了隐藏文件夹名称列表
- **THEN** 主进程 SHALL 在全量扫描结果中排除名称匹配的文件夹，渲染层收到的结果中不包含这些文件夹

#### Scenario: 未配置时行为不变
- **WHEN** 用户未配置任何隐藏文件夹（列表为空）
- **THEN** 文件树 SHALL 保持与原有版本完全一致的展示行为
