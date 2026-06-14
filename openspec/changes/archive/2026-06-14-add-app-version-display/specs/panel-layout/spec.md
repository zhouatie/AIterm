## ADDED Requirements

### Requirement: 标题栏展示客户端版本号
应用 SHALL 在主窗口客户端 chrome/title bar 中展示当前运行的 AIterm 版本号，使用户无需离开应用即可确认当前客户端版本。

#### Scenario: 启动后显示当前版本
- **WHEN** 应用主窗口渲染完成并成功读取应用元信息
- **THEN** 标题栏 SHALL 显示当前 AIterm 版本号
- **AND** 显示的版本号 SHALL 来自主进程暴露的应用运行时元信息

#### Scenario: 版本标记不影响标题栏操作
- **WHEN** 标题栏显示版本号
- **THEN** 文件树开关、主题切换和 Live View 入口 SHALL 保持可点击
- **AND** 标题栏拖拽区域 SHALL 保持可用
- **AND** 版本号文本 SHALL NOT 抢占现有图标按钮的点击区域

#### Scenario: 不显示最新版本状态
- **WHEN** 标题栏显示当前版本号
- **THEN** 系统 SHALL NOT 在该标记中声明当前版本是最新版本
- **AND** 系统 SHALL NOT 在该标记中显示可更新状态
