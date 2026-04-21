## Why

当前终端 renderer 策略默认优先尝试 WebGL，但 WebGL 路径在现有应用环境中存在页面乱码的已知问题，导致终端显示稳定性不足。现在需要将默认策略切回 Canvas，先保证终端可读性和可用性，同时在设置中明确说明 WebGL 的已知缺陷，避免用户误判。

## What Changes

- 将终端默认 renderer 策略从“优先尝试 WebGL”调整为“默认使用 Canvas，Canvas 不可用时再回退到 DOM”。
- 保留设置中的 WebGL 控制项，但默认状态改为关闭，不再让新用户首次启动时自动进入 WebGL 路径。
- 在设置面板的终端 renderer 配置区增加明确备注，说明 WebGL 存在页面乱码的已知 bug，用户若主动开启需自行承担显示异常风险。
- 保持现有渲染器降级链路可用：当用户显式启用 WebGL 且初始化失败时，系统仍按 WebGL → Canvas → DOM 回退。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `embedded-terminal`: 调整终端默认 renderer 选择行为，默认不再优先启用 WebGL
- `settings-panel`: 调整终端 renderer 配置默认值，并补充 WebGL 已知乱码问题说明

## Impact

- **受影响代码**：`src/components/TerminalInstance.tsx`、`src/components/SettingsPanel.tsx`、终端 renderer 偏好持久化与读取逻辑相关模块
- **受影响系统**：xterm renderer 初始化流程、应用内设置默认值、设置面板终端配置文案
- **依赖影响**：无新增依赖，继续沿用现有 xterm renderer addon
- **兼容性影响**：属于默认行为调整；仅影响新建或重新初始化终端实例的默认 renderer 选择
