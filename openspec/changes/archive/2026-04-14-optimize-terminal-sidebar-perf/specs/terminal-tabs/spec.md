## ADDED Requirements

### Requirement: Terminal 侧边 tab 栏收起/展开动画无 layout reflow
Terminal 侧边 tab 栏的收起与展开动画 SHALL 使用 compositor-only CSS 属性驱动，不得触发浏览器 layout reflow，以保证动画过程中不出现可感知的卡顿或帧率下降。

#### Scenario: 收起动画使用 compositor-only 属性
- **WHEN** 用户触发 terminal 侧边 tab 栏收起
- **THEN** 侧边栏内容 SHALL 通过 CSS `transform` 属性滑出视口
- **THEN** 动画进行期间（约 180ms）侧边栏容器的 `width` SHALL 保持不变，不得提前归零
- **THEN** 动画完成后侧边栏容器 SHALL 将 `width` 瞬间切换为 0，释放布局空间

#### Scenario: 展开动画从正确起点滑入
- **WHEN** 用户触发 terminal 侧边 tab 栏展开
- **THEN** 侧边栏容器 SHALL 立即恢复目标宽度
- **THEN** 侧边栏内容 SHALL 通过 CSS `transform` 属性从隐藏位置平滑滑入

#### Scenario: 收起动画期间不触发子组件级联重渲染
- **WHEN** terminal 侧边 tab 栏收起动画正在进行
- **THEN** 动画期间内层组件的 ResizeObserver 回调 SHALL NOT 被触发
- **THEN** 动画期间 SHALL NOT 因布局属性变化导致 React 级联重渲染

#### Scenario: 动画一致性
- **WHEN** terminal 侧边 tab 栏执行收起或展开动画
- **THEN** 动画时长 SHALL 约为 180ms
- **THEN** 动画缓动函数 SHALL 使用 ease
- **THEN** 动画表现 SHALL 与文件预览面板的收起/展开动画保持一致的流畅度
