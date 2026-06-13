## Context

当前主题系统有两处决定首次主题：

- `src/ThemeContext.tsx` 的 `loadStoredMode()`：读取 `localStorage.theme-mode`，无有效值时返回 `system`。
- `index.html` 的同步防闪烁脚本：读取 `localStorage.theme-mode`，无值时也使用 `system` 并按系统外观解析为 `light` 或 `dark`。

因此当前应用首次打开不是固定深色，而是跟随系统。要实现默认深色，必须同步修改这两处，否则会出现 React 状态与首屏 `data-theme` 不一致，或首屏从浅色闪到深色。

## Goals / Non-Goals

**Goals:**

- 无已保存主题偏好时，应用首次打开默认使用深色模式。
- 防闪烁脚本与 React ThemeProvider 使用相同默认策略。
- 用户已保存的 `light`、`dark`、`system` 偏好继续生效。
- 用户仍可通过主题按钮切换到浅色或跟随系统。

**Non-Goals:**

- 不删除 `system` 模式。
- 不迁移或覆盖已有 `localStorage.theme-mode`。
- 不调整主题色值或视觉设计 token。
- 不重构主题持久化存储位置。

## Decisions

### 决策 1：只改变无缓存默认值为 `dark`

**选择**：在 `loadStoredMode()` 中，当 `localStorage.theme-mode` 不存在或不是合法值时返回 `dark`。

**理由**：

- 用户明确希望默认打开为深色。
- 只改无缓存路径不会影响已保存偏好。
- `dark` 仍是现有合法模式，不需要新增状态。

### 决策 2：同步更新 `index.html` 防闪烁脚本

**选择**：将 `index.html` 中 `localStorage.getItem('theme-mode') || 'system'` 改为默认 `dark`，并保留 `system` 分支。

**理由**：

- 首屏主题在 React 挂载前由同步脚本设置；如果这里仍默认 `system`，浅色系统上仍会先展示浅色。
- 保留 `system` 分支可让用户选择跟随系统后继续正确解析。

### 决策 3：不覆盖已有偏好

**选择**：如果 `localStorage.theme-mode` 已经是 `light`、`dark` 或 `system`，保持原值。

**理由**：

- 默认值只适用于首次或无有效缓存场景。
- 覆盖用户已保存偏好会破坏用户主动选择。

## Risks / Trade-offs

- [Risk] 已有浅色偏好的用户不会看到默认深色变化 → Mitigation: 这是预期行为；默认值不覆盖用户偏好。
- [Risk] 主进程标题栏在渲染进程同步前短暂使用系统外观 → Mitigation: 保持当前 IPC 同步机制，本次只修正渲染首屏和 ThemeProvider 缺省值；若要彻底统一主进程首帧标题栏，可后续引入主进程可读的主题偏好存储。
- [Risk] 无效缓存值将改为深色而非跟随系统 → Mitigation: 无效缓存等价于无偏好，按新的产品默认处理。

## Migration Plan

无需数据迁移。已有合法 `localStorage.theme-mode` 继续生效；无值或非法值在下一次启动时按深色默认处理。

## Open Questions

无。
