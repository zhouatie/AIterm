## Why

当前应用在 `localStorage` 中没有主题偏好时默认使用 `system`（跟随系统）。这意味着首次打开时如果操作系统是浅色外观，AIterm 会以浅色主题启动；用户希望应用首次打开默认就是深色模式。

需要把“无已保存偏好”的默认主题从 `system` 改为 `dark`，同时保持用户主动选择浅色或跟随系统后的持久化行为不变。

## What Changes

- 首次启动且 `localStorage` 中没有 `theme-mode` 时，应用默认主题模式改为 `dark`。
- 预渲染防闪烁脚本在没有已保存偏好时也应立即设置 `<html data-theme="dark">`。
- 仍保留 `light`、`dark`、`system` 三种主题模式和现有循环切换能力。
- 已保存的用户主题偏好继续优先于默认值；已有用户配置不迁移、不覆盖。

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `theme-system`: 修改主题偏好缺省策略，将首次无缓存默认模式从 `system` 调整为 `dark`。

## Impact

- 影响渲染入口：`index.html` 中的同步主题脚本。
- 影响主题上下文：`src/ThemeContext.tsx` 中的无缓存默认模式。
- 影响 OpenSpec delta：`theme-system`。
- 不改变主题 token、主题切换 UI、用户已保存偏好或跟随系统模式本身的行为。
