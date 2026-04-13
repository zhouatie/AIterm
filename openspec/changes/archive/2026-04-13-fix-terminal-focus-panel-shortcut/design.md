## Context

全局快捷键系统（`src/ShortcutContext.tsx`）通过在 `window` 上注册 `keydown` 监听器来分发面板快捷键。为防止用户在工作区重命名输入框等可编辑元素中输入时误触发快捷键，系统设有 `isEditableTarget` 守卫函数，对 `input`、`textarea`、`select` 及 `contentEditable` 元素返回 `true` 并跳过处理。

xterm.js 在初始化时会在其容器（`.xterm`）内部插入一个隐藏的 `<textarea>` 作为键盘事件捕获元素。当终端获焦时，该 `<textarea>` 成为 `event.target`，被 `isEditableTarget` 误判为用户可编辑字段，导致所有面板快捷键被静默丢弃。

**根因代码路径**（`src/ShortcutContext.tsx`）：
```
isEditableTarget(textarea[.xterm内部]) → tagName === 'textarea' → return true → 快捷键被丢弃
```

## Goals / Non-Goals

**Goals:**
- 修复终端获焦时面板快捷键（`Meta+B`、`Meta+S` 等）失效的问题
- 精确区分 xterm.js 内部 textarea 与真实用户可编辑 textarea，最小化改动范围
- 保留对工作区重命名 `<input>` 等真实可编辑元素的正确屏蔽逻辑

**Non-Goals:**
- 不重构快捷键系统架构
- 不引入新的焦点管理机制（如 `attachCustomKeyEventHandler`）
- 不处理其他第三方库可能引入的类似 textarea 冲突

## Decisions

### 决策一：在 `isEditableTarget` 中通过 DOM 祖先检测排除 xterm textarea

**方案**：在 `tagName === 'textarea'` 分支中追加一个检测：若该 textarea 存在于 `.xterm` 祖先容器内（`target.closest('.xterm')`），则视为 xterm 内部元素，不拦截快捷键；否则仍视为用户可编辑字段。

```typescript
if (tagName === 'textarea') {
  // xterm.js 的键盘捕获 textarea 位于 .xterm 容器内，不应被视为用户编辑区
  return !target.closest('.xterm');
}
```

**为何选此方案而非 `attachCustomKeyEventHandler`（方案 B）：**
- 方案 B 需要在每个 `TerminalInstance` 中注入拦截逻辑，并枚举所有已注册快捷键，维护成本高且与快捷键系统耦合
- 方案 A（本决策）修改点唯一（`ShortcutContext.tsx` 一处），不影响 xterm 的正常输入路由，风险最低
- `.xterm` 是 xterm.js 的固定容器类名，稳定可靠

**备选方案 B**（`attachCustomKeyEventHandler`）：在 `TerminalInstance.tsx` 中对 `Meta+key` 事件返回 `false`，让其不被 xterm 消费并继续冒泡。需同时修复 `isEditableTarget`（因为 `event.target` 仍是 textarea），且需维护"哪些键是应用快捷键"的枚举，不采用。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| 未来若有真实用户可编辑的 `textarea` 嵌套在 `.xterm` 类名容器内，会被误放行 | `.xterm` 是 xterm.js 的专有 class，应用内不会复用该类名；可在代码注释中明确约定 |
| `closest('.xterm')` 的 DOM 遍历有微小性能开销（每次 `keydown`） | 开销极低（O(DOM 深度)），`keydown` 频率正常，不构成性能问题 |
| xterm.js 未来版本若变更容器类名 | 概率极低；xterm 的 `.xterm` class 已是公开约定。变更后的表现是"回退到修复前状态"，非新增故障 |

## Migration Plan

- 无数据迁移、无 API 变更、无依赖升级
- 直接修改 `src/ShortcutContext.tsx` 中 `isEditableTarget` 函数，单文件改动
- 回滚：还原该函数至修改前版本即可
