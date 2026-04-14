## ADDED Requirements

### Requirement: 显示二维码入口
系统 SHALL 在 app 界面中提供 Live View 开关，并在开启后展示局域网访问地址的二维码。

#### Scenario: 开启 Live View 并显示二维码
- **WHEN** 用户点击 Live View 开关
- **THEN** app SHALL 显示二维码，内容为 `http://<局域网IP>:7778`
- **THEN** 二维码下方 SHALL 显示文字形式的 URL 供手动输入

#### Scenario: IP 地址自动检测
- **WHEN** app 启动 Live View 服务
- **THEN** 系统 SHALL 自动获取当前设备的局域网 IPv4 地址（排除 127.0.0.1）
- **THEN** 若存在多个网卡 IP，SHALL 优先选择非虚拟网卡的第一个地址

#### Scenario: 关闭 Live View
- **WHEN** 用户点击关闭 Live View
- **THEN** 二维码 SHALL 消失
- **THEN** 服务停止，已连接的手机客户端断开

#### Scenario: Live View 未开启时的 UI 状态
- **WHEN** Live View 处于关闭状态
- **THEN** UI SHALL 显示"开启 Live View"按钮，不显示二维码
