## ADDED Requirements

### Requirement: 文件树面板收起/展开动画无 layout reflow
文件树面板（左侧面板）的收起与展开动画 SHALL 使用 compositor-only CSS 属性驱动，不得触发浏览器 layout reflow，以保证动画过程中不出现可感知的卡顿或帧率下降。

#### Scenario: 收起动画期间不触发 ResizeObserver 级联
- **WHEN** 用户点击收起按钮触发左侧面板收起动画
- **THEN** 动画进行期间（约 180ms）内层组件的 ResizeObserver 回调 SHALL NOT 被触发
- **THEN** 动画进行期间 SHALL NOT 因布局属性变化导致 React 重渲染

#### Scenario: 收起动画结束后面板占位空间释放
- **WHEN** 收起动画完成
- **THEN** 左侧面板 SHALL 不再占据任何布局宽度
- **THEN** 右侧面板 SHALL 扩展至全宽

#### Scenario: 展开动画从正确起点滑入
- **WHEN** 用户点击展开按钮触发左侧面板展开动画
- **THEN** 左侧面板 SHALL 从完全隐藏位置平滑滑入至恢复宽度
- **THEN** 右侧面板 SHALL 立即收缩为展开前宽度，与左侧面板滑入同步发生
