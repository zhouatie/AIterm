## Context

AIterm 是 Electron + React 桌面应用，已有 BrowserPanel 和 GitDiffPanel 两个 overlay 面板作为成熟模式。文件系统 IPC（readFile/writeFile/scanMdFiles）已就绪，快捷键系统支持动态注册。现有 MarkdownPreview 使用 react-markdown 做只读渲染，本次新增的笔记面板使用 Milkdown 做所见即所得编辑，两者独立，不相互替代。

## Goals / Non-Goals

**Goals:**

- 提供全局笔记管理能力，不绑定终端 CWD，独立于项目上下文
- 所见即所得的 Markdown 编辑体验（Milkdown）
- 自动保存，用户无需手动触发
- 复用现有 overlay 面板模式，保持交互一致性
- 笔记以标准 .md 文件存储，可被外部工具访问

**Non-Goals:**

- 不做双向链接 `[[wikilinks]]`、知识图谱等 Obsidian 高级功能
- 不做笔记同步/云存储
- 不替换现有的只读 MarkdownPreview 组件
- 不做富文本导出（PDF/HTML）

## Decisions

### 1. 编辑器：Milkdown (@milkdown/kit + @milkdown/react)

**选择**: Milkdown (ProseMirror 基础的所见即所得 Markdown 编辑器)

**替代方案**:
- CodeMirror 6: 代码编辑风格，需要单独的预览面板，增加 UI 复杂度
- Tiptap: 同为 ProseMirror 基础，但 Markdown 支持需要额外插件，生态不如 Milkdown 专注
- 纯 textarea: 体验太原始

**理由**: Milkdown 天然以 Markdown 为数据格式，所见即所得省去 edit/preview 切换，插件体系成熟（commonmark + gfm 即覆盖常用语法），React 绑定官方支持。

### 2. 存储：本地 .md 文件 + 可配置根目录

**选择**: 默认存储在 `{userData}/notes/`，用户可在设置中修改为任意目录

**方案**:
- 路径配置复用 `terminal-settings.ts` 的 localStorage 模式（`note-settings.ts`）
- 首次打开时若目录不存在，通过新增的 `fs:ensure-dir` IPC 自动创建
- 文件列表通过已有的 `fs:scan-md-files` IPC 获取，按 mtime 降序

**理由**: 和现有设置模式一致；用户可将笔记目录指向已有的 Obsidian vault 或其他 markdown 目录。

### 3. Overlay 面板模式

**选择**: 和 BrowserPanel 完全一致的 overlay 模式 — absolute 定位 + translateY 动画 + 互斥

**方案**:
- `App.tsx` 的 `OverlayPanel` 类型扩展为 `'none' | 'browser' | 'git-diff' | 'notes'`
- NotePanel 始终挂载在 DOM，通过 CSS transform 控制显隐
- 与 browser/git-diff 互斥（同一时间只能打开一个 overlay）

**理由**: 完全复用已验证的模式，零学习成本，交互一致。

### 4. 自动保存策略

**选择**: 多层级触发 + 脏检查

```
触发时机:
  1. 停止打字 2s (debounce) — 主要时机
  2. 切换笔记 Tab — flush 当前
  3. 关闭面板 (onClose) — flush
  4. 窗口失焦 (window blur) — flush
  5. App 退出 (beforeunload) — flush
  6. 兜底定时器 2min — 安全网

保存逻辑:
  - 维护 lastSavedContent 引用
  - 写入前比较: if (current === lastSaved) skip
  - 所有触发点共用同一个 flush() 函数
  - flush() 内部保证不并发写入（加锁或排队）
```

**理由**: 参考 Obsidian 的策略，覆盖所有可能丢数据的场景，脏检查避免无意义写磁盘。

### 5. Tab 管理

**选择**: 本地 state 管理（useState），不做持久化

**替代方案**: 像终端 Tab 一样做 tab-persistence — 但笔记 Tab 重新打开成本极低（不像终端需要恢复 PTY 状态），暂不需要。

**数据结构**:
```typescript
interface NoteTab {
  id: string;           // crypto.randomUUID()
  filePath: string;     // 笔记文件绝对路径
  fileName: string;     // 显示名 (不含 .md)
  isDirty: boolean;     // 有未保存修改
}
```

### 6. 新建笔记

**选择**: 点击 [+] 直接创建 `未命名.md`（若已存在则 `未命名-1.md`, `未命名-2.md`...），光标聚焦到编辑器

**理由**: 最轻量的方式，先写后整理，减少操作步骤。

### 7. 重命名笔记和文件夹

**选择**: 行内编辑模式 — 双击文件/文件夹名称进入 inline input 编辑状态

**替代方案**:
- 弹出 dialog 输入新名称 — 操作步骤多，体验重
- 右键菜单 → 重命名 — 多一步操作

**方案**:
- 双击文件/文件夹名触发 inline 编辑
- Enter 确认，Escape 取消
- 笔记文件重命名时自动补 `.md` 后缀（若用户未输入）
- 重命名后刷新文件列表；若该文件在 Tab 中已打开，同步更新 Tab 的 filePath 和 fileName
- 通过 `fs:rename` IPC 实现（main.ts 新增）

**理由**: 行内编辑是最轻量且直觉的重命名方式，和 Finder/VS Code 一致。

### 8. 新建文件夹

**选择**: 工具栏按钮创建 `新建文件夹`（若已存在则 `新建文件夹-1`, `新建文件夹-2`...），创建后立即进入 inline 重命名状态

**方案**:
- 通过 `fs:ensure-dir` IPC 创建目录（已有）
- 创建后刷新文件列表，新文件夹自动展开并进入 inline 编辑状态
- 文件夹名不允许包含 `/` 或 `\`

**理由**: 和新建笔记的模式一致 — 先创建再整理。

### 9. 文件列表工具栏

**选择**: 文件列表顶部放置一排 icon 按钮工具栏，与现有 FileTree 风格一致

**方案**:
- 工具栏高度 32px，位于文件列表最顶部
- 包含：新建笔记（FilePlus icon）、新建文件夹（FolderPlus icon）
- 原来底部的 footer 按钮区移除
- 删除和重命名通过行内操作触发（hover 显示删除按钮、双击重命名）

**理由**: 与应用已有的文件树操作风格保持一致。

### 10. 笔记文件搜索

**选择**: 工具栏中集成搜索输入框，点击搜索 icon 展开/收起输入框，按文件名实时过滤

**方案**:
- 工具栏右侧放置 Search icon 按钮，点击后展开搜索输入框（替换 icon 按钮区域或使用内联展开）
- 输入关键词时实时过滤文件列表（前端过滤已加载的 tree，不额外请求 IPC）
- 匹配逻辑：文件名（不含 .md 后缀）不区分大小写包含关键词
- 文件夹：若文件夹内有匹配文件则保留展示，否则隐藏
- 清空搜索框恢复完整列表

**理由**: 笔记数量增多后需要快速定位；前端过滤足够快，无需 IPC 调用。

### 11. 一键关闭所有 Tab

**选择**: Tab 栏右侧新增"关闭所有标签"按钮（X icon 或 ListX icon），点击后 flush 并清空所有 Tab

**方案**:
- 仅在有 2 个或以上 Tab 打开时显示该按钮
- 点击后先 flushAll()，再清空 tabs 数组和 activeTabId
- 不需要确认弹窗（自动保存机制保证内容不会丢失）

**理由**: 多 Tab 场景下逐个关闭效率低；自动保存已兜底，无需额外确认。

### 10. Milkdown 主题适配

**选择**: 使用 Milkdown headless 模式，完全自定义 CSS 适配现有主题系统

**方案**:
- 不使用 `@milkdown/theme-nord` 等预设主题
- 编辑器容器通过 CSS variables（`--color-bg-primary`, `--color-text-primary` 等）适配 light/dark/system 三种模式
- 编辑器内元素（标题、代码块、引用等）的样式通过 `.milkdown` 作用域 CSS 覆写

**理由**: 确保笔记面板和应用其他部分视觉一致。

## Risks / Trade-offs

- **[Milkdown 版本稳定性]** Milkdown v7 (kit) 相对较新，API 可能有变动 → 锁定版本，写好封装层隔离
- **[大文件编辑性能]** ProseMirror 对超大文档（>10MB）可能卡顿 → 现有 `fs:readfile` 已有 1MB 限制，天然兜底
- **[主题 CSS 工作量]** headless 模式需要手写所有样式 → 先做基础样式，迭代完善
- **[并发写入]** 多个触发点可能同时调用 flush → flush 函数内加锁，保证串行写入
- **[外部修改冲突]** 用户可能在 AIterm 外编辑同一文件 → 首版不处理，后续可加 fs.watch 检测
