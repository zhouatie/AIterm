## 1. 依赖安装与项目配置

- [x] 1.1 安装新增 npm 依赖：`@xterm/addon-search`、`@xterm/addon-unicode11`、`@xterm/addon-canvas`、`@xterm/addon-serialize`、`@xterm/addon-image`
- [x] 1.2 确认所有新增 addon 版本与 `@xterm/xterm@^6.0.0` 兼容，更新 package.json

## 2. Canvas 渲染器回退链

- [x] 2.1 在 `TerminalInstance.tsx` 中导入 `CanvasAddon`，修改渲染器初始化逻辑为 WebGL → Canvas → DOM 三级降级
- [x] 2.2 添加渲染器类型跟踪变量（`rendererType: 'webgl' | 'canvas' | 'dom'`），供后续 Image addon 条件加载使用
- [x] 2.3 WebGL 和 Canvas 失败时分别记录警告日志，验证三级降级链的正确性

## 3. Unicode11 插件集成

- [x] 3.1 在 `TerminalInstance.tsx` 初始化阶段加载 `Unicode11Addon`
- [x] 3.2 设置 `terminal.unicode.activeVersion = '11'`
- [x] 3.3 验证 CJK 全角字符和 Emoji 的列宽计算与光标对齐正确性

## 4. 终端搜索功能

- [x] 4.1 在 `TerminalInstance.tsx` 初始化阶段加载 `SearchAddon`，通过 ref 暴露 search 实例
- [x] 4.2 创建 `TerminalSearchBar` 组件：浮层式搜索栏（输入框、上/下导航、匹配计数、正则切换、大小写切换、关闭按钮）
- [x] 4.3 实现搜索栏与 SearchAddon 的交互：`findNext()`、`findPrevious()`、选项切换
- [x] 4.4 实现 Cmd+F 快捷键激活搜索、Escape 关闭搜索、Enter/Shift+Enter 导航匹配项
- [x] 4.5 实现已选中文本时 Cmd+F 自动填入选中内容
- [x] 4.6 添加搜索栏 CSS 样式，适配深色/浅色主题

## 5. 终端装饰系统

- [x] 5.1 创建 `useTerminalDecorations` hook，封装 Decoration API 的注册与清理逻辑
- [x] 5.2 实现命令边界装饰：注册 OSC 133 parser handler 检测命令提示符行，在行左侧添加分隔标记
- [x] 5.3 实现启发式命令边界检测回退方案（基于 prompt 模式匹配 `$`、`%`、`>`）
- [x] 5.4 实现 AI 区域装饰：监听 attention 事件，在 AI 输出区域的行上注册背景高亮 Decoration
- [x] 5.5 实现错误行装饰：扫描终端输出匹配错误模式（`Error:`、`ERROR`、`FATAL`、`failed`），在行左侧添加红色指示点
- [x] 5.6 实现装饰生命周期管理：终端销毁和缓冲区行回收时自动清理 Decoration
- [x] 5.7 装饰样式适配深色/浅色主题

## 6. Buffer API 访问接口

- [x] 6.1 将 `TerminalInstance` 改造为 `forwardRef` 组件，使用 `useImperativeHandle` 暴露方法
- [x] 6.2 实现 `getBufferLines(count: number): string[]` 方法，从活跃缓冲区读取最近 N 行纯文本
- [x] 6.3 实现 `getVisibleContent(): string` 方法，读取当前视口可见内容
- [x] 6.4 实现 `getAllContent(): string` 方法，读取完整缓冲区内容
- [x] 6.5 处理边界情况：终端未初始化时返回空值、请求行数超过实际行数时返回可用行

## 7. 自定义链接检测与面板联动

- [x] 7.1 实现自定义 `LinkProvider`，注册到 `terminal.registerLinkProvider()`，使用正则检测 `file:line:col` 格式的文件路径
- [x] 7.2 实现相对路径解析：基于终端当前 CWD 将 `./`、`../` 路径转为绝对路径
- [x] 7.3 实现文件存在性验证：通过 IPC 调用主进程验证路径是否存在，过滤误匹配
- [x] 7.4 实现链接点击处理：调用 `window.fileApi` 在 FilePreviewPanel 中打开文件并定位到指定行
- [x] 7.5 添加链接悬停样式（下划线 + tooltip 提示文件路径）

## 8. 终端内容持久化

- [x] 8.1 在 `TerminalInstance.tsx` 初始化阶段加载 `SerializeAddon`，通过 ref 暴露序列化方法
- [x] 8.2 在 `preload.ts` 中添加终端缓冲区读写 IPC 通道：`terminal:saveBuffer`、`terminal:loadBuffer`
- [x] 8.3 在 `main.ts` 中实现缓冲区文件存储：写入 `<userData>/terminal-buffers/<sessionId>.txt`，限制最大 1000 行
- [x] 8.4 在应用退出流程中集成缓冲区序列化：遍历所有活跃 session，序列化并同步写入文件
- [x] 8.5 在 tab 恢复流程中集成缓冲区恢复：创建 PTY 后读取对应文件，通过 `terminal.write()` 回写内容
- [x] 8.6 实现孤立文件清理：启动时删除 `terminal-buffers/` 中无法匹配到已恢复 session 的文件
- [x] 8.7 处理持久化异常：文件不存在或损坏时静默跳过

## 9. 内联图片支持

- [x] 9.1 在 `TerminalInstance.tsx` 中根据渲染器类型条件加载 `ImageAddon`（仅 Canvas 渲染器）
- [x] 9.2 配置 ImageAddon 参数：支持 iTerm2 协议和 Sixel 协议
- [x] 9.3 在设置面板中添加"渲染器偏好"选项：WebGL 优先（默认）/ Canvas 优先（支持内联图片）
- [x] 9.4 验证 imgcat 和 Sixel 工具输出的图片正确渲染，图片随终端滚动

## 10. 集成测试与收尾

- [x] 10.1 验证所有 addon 在深色/浅色主题下的视觉表现
- [x] 10.2 验证多 addon 同时加载的性能影响（初始化时间、内存占用）
- [x] 10.3 验证渲染器降级链在 WebGL 不可用场景下的正确性
- [x] 10.4 验证搜索、装饰、链接在 10000 行回滚缓冲区下的性能表现
- [x] 10.5 清理 `package.json` 中未使用的 `@xterm/addon-fit` 依赖
