## Context

当前应用（Electron + React 19 + xterm.js）所有颜色均为硬编码值，散落在 8 个组件文件（约 49 处）和 `index.css` 中，仅支持浅色外观。没有 CSS 变量、没有主题 Context、没有 CSS-in-JS 库。应用需要引入集中式主题系统以支持深色/浅色模式切换。

## Goals / Non-Goals

**Goals:**
- 建立基于 CSS 变量的主题系统，统一管理所有颜色值
- 支持浅色、深色、跟随系统三种模式
- 将所有组件中硬编码颜色迁移至 CSS 变量引用
- xterm.js 终端配色方案随主题动态切换
- Electron 原生标题栏外观与主题同步
- 持久化用户主题偏好（localStorage）

**Non-Goals:**
- 不支持自定义主题/用户自定义配色
- 不引入 CSS-in-JS 库（styled-components、emotion 等）
- 不改变现有组件的功能逻辑，只改变视觉表现
- 不涉及字体大小、间距等非颜色维度的主题化

## Decisions

### 决策 1：使用 CSS 变量实现主题切换

**选择**：在 `:root` / `[data-theme="dark"]` 上定义 CSS 变量，组件通过 `var(--color-xxx)` 引用。

**备选方案**：
- CSS-in-JS（styled-components）：需引入新依赖，改造成本高，当前项目大量使用内联 style，迁移量过大
- Tailwind CSS dark: 类：需引入 Tailwind 全家桶，偏离当前项目风格
- CSS Modules + 主题文件：不支持动态切换，需要编译时确定

**理由**：CSS 变量是原生方案，零依赖，支持运行时动态切换，与现有内联 style 可通过 `var()` 共存。可以渐进式迁移——先定义变量，再逐文件替换硬编码值。

### 决策 2：主题切换通过 `data-theme` 属性控制

**选择**：在 `<html>` 元素上设置 `data-theme="light" | "dark"`，CSS 变量根据此属性切换。

**备选方案**：
- `prefers-color-scheme` 媒体查询：无法支持手动切换模式
- class 切换（`.theme-dark`）：可行但 `data-*` 语义更清晰

**理由**：`data-theme` 属性具有清晰的语义，且可以与 `prefers-color-scheme` 结合实现"跟随系统"模式。

### 决策 3：使用 React Context 管理主题状态

**选择**：创建 `ThemeContext` + `ThemeProvider`，提供当前主题模式和切换方法。

**备选方案**：
- 纯 CSS（`prefers-color-scheme` 媒体查询）：无法提供手动切换和偏好持久化
- Zustand / Redux 等状态库：过重，主题状态简单，无需引入额外依赖

**理由**：React Context 是内置方案，适合全局但低频变化的状态（主题切换不会频繁触发），无需额外依赖。

### 决策 4：xterm.js 主题通过重新设置 options.theme 切换

**选择**：监听主题变化，调用 `terminal.options.theme = newTheme` 更新终端配色。

**理由**：xterm.js 原生支持通过 `options.theme` 动态切换配色，无需销毁重建终端实例。

### 决策 5：Electron nativeTheme 同步

**选择**：渲染进程通过 IPC 通知主进程更新 `nativeTheme.themeSource`，使原生标题栏与应用主题一致。

**理由**：Electron 的 `nativeTheme` API 可控制标题栏和系统对话框的外观，需要主进程配合设置。

### 决策 6：内联 style 中颜色值的迁移策略

**选择**：将内联 style 中的颜色硬编码值替换为 CSS 变量引用，使用 `var(--color-xxx)` 语法。在 JSX 的 `style` 属性中 CSS 变量可以直接使用。

**理由**：避免大规模重构组件样式方案（如全部迁移到 CSS 文件），保持最小改动原则。

## Risks / Trade-offs

- **[迁移遗漏]** 49 处硬编码颜色分散在多个文件中，可能遗漏部分颜色值 → 通过全局搜索 `#` 和 `rgb` 确保全覆盖，在 tasks 中逐文件检查
- **[内联 style 的 CSS 变量兼容性]** JSX `style` 中使用 `var()` 是合法的 CSS 值，但 TypeScript 类型需要 `as any` 或类型扩展 → 影响较小，可接受
- **[首次加载闪烁]** 如果 JS 加载前 CSS 默认为浅色，而用户偏好深色，可能出现短暂白屏 → 在 `index.html` 的 `<script>` 中同步读取 localStorage 并设置 `data-theme`，避免 FOUC
- **[系统偏好变化监听]** `matchMedia('prefers-color-scheme')` 的 change 事件在某些环境下不可靠 → 提供手动切换作为后备
