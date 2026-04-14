## Why

当前 terminal tab 侧边栏和文件树的视觉表现平淡，缺乏层次感和精致度。Terminal tab 的活跃态仅靠极轻微的背景色差异区分（`rgba(255,255,255,0.82)` vs `transparent`），几乎没有空间深度；文件树使用金色文件夹图标（`#a38046`）与整体冷蓝色调格格不入，28px 行高过于紧凑，hover/选中态没有过渡动效。侧边栏虽然有 `backdrop-filter: blur(18px)`，但背景不透明度 72% 太高导致毛玻璃效果几乎不可见。希望整体向 Apple 设计语言大幅靠拢——活跃 tab 从列表中"卡片化浮起"、文件树更精致舒展、侧边栏毛玻璃真正通透。

## What Changes

### Terminal Tab 卡片化
- **活跃 tab 卡片化**：添加三层强外阴影（接触 + 中距 + 远距）+ 顶部内发光，使活跃 tab 视觉上"浮"在侧边栏之上
- **活跃 tab 独立毛玻璃层**：添加独立 `backdrop-filter: blur(12px)`，与侧边栏整体模糊叠加产生"层中有层"
- **活跃 tab 提高不透明度**：背景从 `0.82` 提高到 `0.92`(light)/`0.98`(dark)，更"实"更有卡片感
- **活跃 tab 增加垂直内边距**：通过 `margin` 和 `padding` 调整让活跃 tab 比普通行更"胖"，与相邻行之间有明确间距
- **非活跃 tab 大幅降低存在感**：文字不透明度从 100% 降低到约 55-65%，指示点也变淡，让活跃 tab 和非活跃 tab 之间的对比非常明显
- **Hover 阴影反馈**：非活跃 tab hover 时出现两层柔和阴影 + 背景提亮，有"即将浮起"的预示感

### 文件树全面美化
- **行高从 28px 提升到 34px**：更接近 macOS Finder 侧边栏的舒适间距
- **图标尺寸从 15px 提升到 16px**：配合更大行高
- **图标间距从 5px 增加到 8px**：更大的呼吸感
- **文件夹图标去黄化**：从金色 `#a38046` 改为柔和蓝灰色，与冷蓝主题协调
- **目录名字重加粗**：目录 500/文件 400，通过字重区分层级
- **Hover 态增加圆角卡片感**：`borderRadius: 8px`，带 `150ms ease` 过渡
- **选中文件添加左侧 accent 指示条**：3px 宽、accent 色、圆角指示条
- **缩进引导线精致化**：改为虚线(dashed)或更细的 0.5px 实线

### 侧边栏毛玻璃增强
- **降低背景不透明度**：light 从 `0.72` 降到 `0.55`，dark 从 `0.82` 降到 `0.65`，让背后内容隐约可见
- **增强模糊与饱和**：`blur(18px)` 提升到 `blur(24px) saturate(180%)`
- **加强边缘描边**：右侧边框增强至更明确的分割线
- **新增顶部分割线高光**：侧边栏顶部 1px 的白色高光线，增加"玻璃板"质感

### 主题 Token 全面扩展
- 新增约 15 个 CSS 自定义属性，light/dark 各一套
- 修改多个现有 token 的值（sidebar 背景、icon-folder 颜色等）

## Capabilities

### New Capabilities

（无新增独立能力）

### Modified Capabilities

- `terminal-tabs`: 活跃 tab 从"轻微背景色区分"升级为"卡片化浮起"——多层强阴影、独立毛玻璃、更高不透明度、垂直间距拉开；非活跃 tab 大幅弱化；hover 出现预示性阴影
- `file-preview`: 文件树节点全面视觉升级——行高 34px、图标 16px、间距 8px、文件夹蓝灰色、目录加粗、hover 圆角过渡、选中 accent 指示条
- `theme-system`: 扩展并修改 CSS token——新增 tab 阴影/背景/内发光/inactive 文字等 token，修改侧边栏背景不透明度和文件夹图标颜色，light/dark 各有独立适配值

## Impact

- **`src/index.css`**：新增约 15 个 CSS 自定义属性，修改 `--color-surface-sidebar`、`--color-icon-folder` 等现有属性值
- **`src/components/TerminalPanel.tsx`**：修改活跃/非活跃 session tab 行和侧边栏容器的 inline style（阴影、背景、blur、margin、padding、文字颜色）
- **`src/components/FileTree.tsx`**：修改常量（ROW_HEIGHT、ICON_SIZE、间距），修改 TreeNodeItem 的 inline style（hover、选中态、字重、圆角、指示条）
- **无功能性影响**：纯视觉变更，不改变交互逻辑、状态管理、IPC 通道
- **无新依赖**：不引入新 npm 包
