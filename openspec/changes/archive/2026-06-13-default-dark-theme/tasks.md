## 1. 主题默认值

- [x] 1.1 将 `ThemeContext.loadStoredMode()` 的无缓存/非法缓存默认返回值从 `system` 改为 `dark`。
- [x] 1.2 将 `index.html` 防闪烁脚本的无缓存默认值从 `system` 改为 `dark`。
- [x] 1.3 保持已保存 `light`、`dark`、`system` 偏好优先级不变。

## 2. 验证

- [x] 2.1 运行项目现有校验命令，确认 TypeScript/ESLint 不引入回归。
- [x] 2.2 手动验证：清空 `localStorage.theme-mode` 后首次打开应用，`<html data-theme>` 为 `dark`。
- [x] 2.3 手动验证：保存 `light`、`dark`、`system` 后重启应用，仍恢复用户保存的模式。
