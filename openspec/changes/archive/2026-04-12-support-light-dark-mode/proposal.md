## Why

当前应用所有颜色均为硬编码的浅色值（分散在 8 个组件文件中约 49 处、`index.css` 以及 xterm.js 终端主题中），不支持深色模式。用户在低光环境下使用体验差，也无法与操作系统的外观偏好保持一致。需要引入主题系统，支持深色/浅色模式切换，并跟随系统设置自动适配。

## What Changes

- 建立基于 CSS 变量的集中式主题系统，定义浅色与深色两套色值方案
- 新增 React Context 级别的主题状态管理，提供主题切换能力
- 将所有组件中硬编码的颜色值迁移至 CSS 变量引用
- xterm.js 终端主题根据当前模式动态切换
- `index.css` 中 highlight.js 样式适配深色/浅色模式
- 新增 UI 控件（主题切换按钮），支持手动切换深色/浅色/跟随系统三种模式
- 持久化用户的主题偏好（localStorage）

## Capabilities

### New Capabilities
- `theme-system`: 主题系统核心能力——CSS 变量定义、主题 Context、模式切换逻辑、偏好持久化、系统偏好监听

### Modified Capabilities
- `electron-shell`: 需支持根据主题模式更新原生窗口标题栏外观（`nativeTheme`）
- `embedded-terminal`: 终端配色方案需随主题模式动态切换
- `file-preview`: Markdown 预览与代码高亮样式需适配深色/浅色模式
- `panel-layout`: 面板边框、分割线、背景色需引用主题变量

## Impact

- **代码范围**：`src/` 下所有 `.tsx` 组件文件和 `index.css` 均需修改，将硬编码颜色替换为 CSS 变量
- **新增文件**：主题定义文件（CSS 变量）、ThemeContext/ThemeProvider 组件
- **主进程**：`main.ts` 需响应渲染进程的主题切换消息以更新 `nativeTheme`
- **依赖**：无需新增外部依赖，使用原生 CSS 变量 + React Context 实现
- **兼容性**：不涉及 **BREAKING** 变更，默认行为保持浅色模式
