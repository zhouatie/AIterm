## 1. 定位现有入口

- [x] 1.1 定位左侧工作区 `Files / OpenSpec` 模式切换组件、tab 配置来源和 active mode 初始化代码。
- [x] 1.2 检查是否存在针对左侧默认模式或 tab 顺序的测试、快照或文案断言。

## 2. 实现默认 OpenSpec

- [x] 2.1 将左侧工作区模式切换入口顺序调整为 `OpenSpec / Files`。
- [x] 2.2 将左侧工作区首次渲染或应用启动时的默认 active mode 调整为 `OpenSpec`。
- [x] 2.3 确认切换到 `Files` 后仍展示现有文件树和文件预览界面，并保留已加载状态与当前文件预览状态。
- [x] 2.4 确认默认 OpenSpec 不改变右侧 terminal session、当前活跃 terminal tab 和主分栏比例逻辑。

## 3. 验证

- [x] 3.1 更新或新增覆盖默认 OpenSpec、`OpenSpec / Files` 顺序、切回 Files 的测试或等效验证。
- [x] 3.2 手动启动应用，确认左侧默认显示 OpenSpec Change Dashboard，且用户可切换到 Files。
