## 1. 帮助面板组件

- [x] 1.1 新增 `HelpGuidePanel` 组件，支持打开、关闭、遮罩点击关闭和不影响底层面板状态
- [x] 1.2 在组件中实现“使用指南”和“Agent Hook 安装”两个内容分区或标签
- [x] 1.3 整理应用核心入口说明，覆盖文件预览、terminal、开发者工具、Live View、Agent Inbox、主题切换和更新检查

## 2. Agent Hook 指南内容

- [x] 2.1 从 `docs/codex-hook-notifications.md` 提炼 Codex hook 配置片段、验证命令和排查要点
- [x] 2.2 在 hook 安装说明中明确 AIterm 内置 terminal 和 `AITEM_*` 环境变量要求
- [x] 2.3 实现 hook 配置片段和验证命令的复制操作，并展示复制成功或失败反馈
- [x] 2.4 确认帮助面板不会自动写入 `~/.codex/config.toml` 或 `$CODEX_HOME/config.toml`

## 3. 标题栏集成

- [x] 3.1 在 `src/App.tsx` 标题栏工具组中新增问号 icon-only 帮助按钮
- [x] 3.2 复用现有标题栏按钮尺寸、hover 行为、tooltip / `aria-label` 和 `WebkitAppRegion: no-drag`
- [x] 3.3 将帮助按钮点击状态连接到 `HelpGuidePanel`，并确保现有工具按钮、Agent Inbox、更新检查仍可点击

## 4. 样式与响应式

- [x] 4.1 为帮助面板添加主题变量驱动的背景、文字、边框、代码块和按钮样式
- [x] 4.2 处理窄窗口下标题栏空间，确保帮助入口可见可点击且版本/更新文本不会重叠
- [x] 4.3 检查帮助面板内容在桌面和较窄窗口宽度下不溢出、不遮挡关闭控件

## 5. 验证

- [ ] 5.1 手动启动应用，确认点击标题栏问号能打开和关闭帮助指南
- [ ] 5.2 手动验证帮助指南打开后 terminal、文件预览、开发者工具和 Agent Inbox 状态不被重置
- [ ] 5.3 手动验证复制 hook 配置片段和验证命令的反馈行为
- [ ] 5.4 手动验证浅色、深色和跟随系统主题下帮助面板可读
