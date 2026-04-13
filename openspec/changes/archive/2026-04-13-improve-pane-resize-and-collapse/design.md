## Context

当前布局由多个渲染进程组件共同管理：`App.tsx` 使用 `SplitLayout` 承载左侧文件预览模块与右侧终端模块，`FilePreviewPanel.tsx` 再使用一个内部 `SplitLayout` 承载文件树与预览区，`TerminalInstance.tsx` 负责 xterm.js 终端内容的渲染与尺寸适配。

`SplitLayout` 当前在左栏宽度、分隔条 hit area 和分隔线 opacity 上始终使用过渡动画。拖拽过程中每次 `mousemove` 更新 `leftPercent` 后，实际宽度仍按 CSS transition 补间，导致拖拽位置与面板边界出现明显延迟。主分栏和文件树内部分栏都复用该组件，因此需要在共享组件层面解决。

项目已经有快捷键系统与默认绑定：`toggle-file-tree` 默认 `Meta+S`，用于切换整个文件系统 / 左侧模块展示状态。本次内部文件树面板收起不复用该快捷键，只通过文件预览面板内的 icon 触发，避免两个层级共享同一快捷键语义。

## Goals / Non-Goals

**Goals:**
- 拖拽任意 `SplitLayout` 分隔条时，面板尺寸立即跟随鼠标，不受宽度 / 间距 transition 影响。
- 主左右分栏比例、文件树 / 预览内部分栏比例在本地持久化，下次启动恢复。
- 文件树内部面板可通过 icon 单独收起，使左侧模块只保留文件预览区。
- 终端内容左侧保留间距，避免文字贴边。
- xterm 终端滚动条使用与文件系统区域相同的宽度、轨道、滑块、hover 和主题变量。
- 不引入新依赖，不改变 PTY、IPC 和文件系统读取协议。

**Non-Goals:**
- 不实现任意数量面板、拖拽排序或浮动窗口。
- 不迁移到全局状态库。
- 不改变 terminal workspace / session 的数据结构和生命周期。
- 不修改 terminal 侧边导航的展开 / 收起入口、快捷键或持久化行为。
- 不为旧 localStorage key 写兼容迁移逻辑。

## Decisions

### 决策 1：在 `SplitLayout` 增加受控初始值、变化回调和拖拽中禁用动画

**选择**：扩展 `SplitLayout`：
- 接收 `storageKey` 或 `initialLeftPercent` / `onLeftPercentChange` 一类参数，由调用方决定是否持久化；
- 在内部维护 `isDraggingState`，拖拽中把左栏宽度和 divider margin 的 transition 设为 `none`；
- 非拖拽的展开 / 收起场景继续保留短 transition。

**理由**：拖拽延迟来自共享布局组件，放在 `SplitLayout` 里处理能同时覆盖主分栏和文件树内部分栏，避免每个调用方重复处理 mouse state。持久化由调用方提供 key 或回调，可以让不同分栏使用不同 localStorage key。

**替代方案**：只在调用处覆盖 style。这样无法统一处理分隔条 hit area、左栏宽度和 collapse transition，后续新增分栏仍可能重复出现拖拽滞后。

### 决策 2：分栏比例只保存合法范围内的 percent

**选择**：保存拖拽后的 `leftPercent`，读取时先校验是否为有限数字，再按当前 `minLeftPx` / `minRightPx` 和容器宽度重新夹取。

**理由**：percent 能适配窗口尺寸变化；运行时仍要根据当前容器和最小宽度约束重新计算，避免上次在大窗口保存的比例在小窗口下把面板挤没。

**替代方案**：保存像素宽度。像素宽度在窗口尺寸变化时更容易失真，不适合桌面应用重启后的不同窗口尺寸。

### 决策 3：内部文件树收起不注册快捷键

**选择**：保留 `toggle-file-tree` 在 App 级别切换整个文件系统 / 左侧模块的行为；`FilePreviewPanel` 内部文件树 pane 的展开 / 收起只通过面板内 icon 触发，不注册快捷键动作。

**理由**：整个文件系统模块已经支持 `Command + S` 收起。如果内部文件树 pane 也复用同一快捷键，会让“收起左侧模块”和“仅收起内部文件树”两个层级冲突。内部文件树收起是局部布局操作，用 icon 触发更清晰。

**替代方案**：新增一个快捷键动作专门收起内部文件树。这样会增加一个与现有 `toggle-file-tree` 很接近的操作，用户需要区分两个相近的“收起文件树/文件系统”动作，本次不采用。

### 决策 4：文件树收起后保留预览状态并暂停文件树读取

**选择**：文件树内部收起时，预览 pane 保持渲染，已选中文件内容保持不变；文件树 pane 保持状态但宽度为 0，并跳过 CWD 同步引发的目录读取。重新展开时同步当前 active terminal 的 CWD 并恢复文件树。

**理由**：收起文件树的目标是给预览区释放空间，同时不丢失当前阅读上下文。暂停目录读取能保持与现有“左栏收起时暂停资源消耗”的思路一致。

**替代方案**：收起时卸载 `FileTree`。这样能减少 DOM，但会丢失展开状态、滚动位置和选中状态，体验不符合“临时收起”的预期。

### 决策 5：终端内容区通过 xterm 内边距保留左侧间距

**选择**：在 `TerminalInstance` 或终端样式层修复 xterm 内容的左侧内边距，让终端文字与容器边界保持固定距离，并避免影响 FitAddon 的列数计算。

**理由**：终端左侧贴边是内容渲染问题，不需要修改 terminal 侧边导航。项目现有 `embedded-terminal` 规格已经要求终端内边距不得影响列数计算，实现时应优先满足该既有约束。

**替代方案**：给 `TerminalPanel` 内容外层增加 padding。这样可能改变 `TerminalInstance` 的测量容器宽度，需要更小心验证 FitAddon；优先在 xterm 内容层处理更直接。

### 决策 6：复用全局滚动条变量覆写 xterm viewport 滚动条

**选择**：在终端样式层对 `.xterm-viewport` 应用与文件系统滚动区域一致的滚动条规则，复用 `--scrollbar-thumb`、`--scrollbar-thumb-hover` 和 `--scrollbar-track`，并保持 6px 宽度与 3px 圆角。

**理由**：文件系统区域已经通过全局滚动条变量适配明暗主题，xterm 自带样式可能覆盖全局规则；对 xterm viewport 做明确覆写可以保证终端滚动条与文件树、预览区视觉一致，同时不影响 PTY、xterm buffer 或滚动行为。

**替代方案**：保留 xterm 默认滚动条。这样实现最少，但会继续出现终端滚动条与文件系统区域不一致的问题，不满足本次体验要求。

## Risks / Trade-offs

- [内部文件树收起与全局文件系统收起混淆] → 保持 `toggle-file-tree` 只由 App 级整块左栏使用，`FilePreviewPanel` 不注册该快捷键，内部文件树只通过 icon 切换。
- [保存的 percent 在极窄窗口下不可用] → 读取和拖拽更新时都按当前容器宽度和最小宽度重新夹取。
- [拖拽过程中频繁写 localStorage 影响性能] → 只在 mouseup 或 percent 稳定更新点写入，不在每个 mousemove 同步写入。
- [文件树收起后 CWD 已变化] → 重新展开时主动读取当前 active terminal session info，再恢复文件树根目录。
- [terminal 内容 padding 影响 xterm fit 结果] → 优先使用 xterm 内容层样式或既有终端容器内边距方式处理，并验证 FitAddon 列数仍准确。
- [xterm CSS 覆写顺序导致滚动条样式不生效] → 使用针对 `.xterm-viewport` 的明确选择器，并在实现后验证终端滚动条宽度、滑块颜色和 hover 状态与文件系统滚动条一致。

## Migration Plan

1. 扩展 `SplitLayout` 支持拖拽中禁用 transition、持久化 key 和恢复合法 percent。
2. 主分栏和文件树内部分栏分别接入独立 localStorage key。
3. 保留 `toggle-file-tree` 的 App 级整块左栏切换行为，内部文件树收起不接入快捷键系统。
4. 为文件树内部收起状态增加本地持久化。
5. 修复终端内容左侧间距，并验证 xterm 尺寸适配不回退。
6. 覆写 xterm viewport 滚动条样式，复用应用现有滚动条主题变量。
7. 回滚时可移除新增 localStorage key 的读取和写入，组件将回到默认布局比例；移除 xterm viewport 滚动条覆写后终端回到默认滚动条样式。
