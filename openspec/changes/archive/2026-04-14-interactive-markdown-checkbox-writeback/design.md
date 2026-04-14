## Context

当前 `MarkdownPreview` 使用 `react-markdown + remark-gfm + rehype-highlight` 渲染 Markdown 内容。`remark-gfm` 已能将 GFM 任务列表渲染为 checkbox，但这些 checkbox 当前没有业务点击处理，也不会改变源文件。

文件读取链路由 `FilePreviewPanel` 调用 `window.fileApi.readFile(filePath)` 完成，主进程已有 `fs:readfile` IPC 且限制最大读取 1MB。现有 preload/fileApi 没有写文件 API，因此要实现“点击 checkbox 后写回源文件”，需要补充受控写入通道，并让预览组件把 checkbox 交互回传给上层。

## Goals / Non-Goals

**Goals:**

- 支持用户在 Markdown 预览区点击 GFM task checkbox 切换状态。
- 切换结果写回当前 Markdown 源文件，刷新或重新打开后状态仍保留。
- 写回成功后立即更新当前预览内容。
- 写回失败时保持预览与磁盘文件一致，并给出失败反馈。
- 不引入新的 Markdown 解析依赖。

**Non-Goals:**

- 不提供完整 Markdown 编辑器能力。
- 不支持自定义或非 GFM 标准任务语法。
- 不实现多窗口/外部编辑器并发冲突合并。
- 不改变非 Markdown 文件预览逻辑。

## Decisions

### 决策 1：由 `MarkdownPreview` 捕获 checkbox 点击，上层负责写回

**选择**：`MarkdownPreview` 继续负责渲染 Markdown，并通过 `components.input` 自定义渲染 checkbox。组件内部为每个 task checkbox 分配渲染顺序索引，点击时调用 `onTaskCheckboxToggle(taskIndex)`；`FilePreviewPanel` 根据当前 `fileContent` 生成新内容并调用写入 API。

**理由**：

- `MarkdownPreview` 最接近渲染出的 checkbox DOM，适合处理点击入口。
- `FilePreviewPanel` 已拥有 `selectedFile`、`fileContent`、loading/error 状态，适合编排文件写回和状态更新。
- 保持主进程不需要理解 Markdown AST，只做通用文件写入。

**替代方案**：在 `MarkdownPreview` 内直接调用 `fileApi.writeFile`。否决原因是会让纯预览组件耦合文件系统 IPC，不利于后续复用和错误状态统一管理。

### 决策 2：使用“第 N 个任务项”映射源文本 marker

**选择**：点击预览中的第 N 个 task checkbox 时，在当前 `fileContent` 中按出现顺序查找第 N 个 GFM task marker，并只替换该 marker 的状态字符。

匹配范围限定为标准 GFM 任务行：

- `- [ ] item`
- `- [x] item`
- `- [X] item`
- `* [ ] item`
- `+ [ ] item`
- 允许任务行前有缩进，用于嵌套列表。

**理由**：

- 不新增 Markdown AST 序列化依赖，改动小且可控。
- `react-markdown + remark-gfm` 渲染顺序与源文本任务项顺序一致，足以满足当前预览点击场景。
- 只替换 marker 字符，不会重排 Markdown 格式或改写用户正文。

**替代方案**：引入 unified/remark AST 解析和 stringify 后整体重写文件。否决原因是会引入格式化副作用，可能改写用户 Markdown 的空行、缩进、表格格式，不适合一个轻量 checkbox 交互。

### 决策 3：新增 `fileApi.writeFile(filePath, content)` IPC

**选择**：在 preload 暴露 `fileApi.writeFile`，主进程新增 `fs:writefile` handler。写入前对路径做 `path.resolve`，并限制写入内容大小不超过 1MB，与现有读取限制保持一致。

**理由**：

- Electron 渲染进程不能直接写磁盘，必须经过主进程 IPC。
- 写入能力应集中在 preload 暴露的受控 API，而不是绕过已有安全边界。
- 复用 1MB 限制可以避免对大文件执行昂贵字符串处理或意外覆盖。

**替代方案**：新增专用 `toggleMarkdownTask(filePath, taskIndex)` IPC，让主进程读改写。否决原因是会把 Markdown 任务定位逻辑拆到主进程，增加跨进程状态不一致风险；当前渲染进程已有最新 `fileContent`，更适合计算新内容。

### 决策 4：写回采用成功后更新本地状态

**选择**：点击 checkbox 后先计算 `nextContent` 并调用写入；写入成功后再 `setFileContent(nextContent)`。写入失败时保留原 `fileContent`，并显示错误反馈。

**理由**：

- 避免视觉上已勾选但磁盘写入失败造成状态撒谎。
- 当前文件较小且写入应很快，不需要乐观更新。

**替代方案**：先乐观更新，失败后回滚。否决原因是需要处理更多竞态，且失败回滚会造成 checkbox 闪烁。

## Risks / Trade-offs

- [外部编辑器同时修改文件] → 当前实现基于预览中的 `fileContent` 写回，可能覆盖外部未加载变更；本次不做并发合并，后续如需要可增加写入前 mtime 校验。
- [任务项索引映射错误] → 仅支持标准 GFM task marker，并通过单元级函数测试覆盖嵌套列表、多任务项、`[X]` 等情况。
- [写入失败无明显反馈] → `FilePreviewPanel` 需要提供可见的错误提示，且不更新本地内容。
- [大文件写入成本] → 沿用 1MB 限制，超过限制时写入 API 返回错误。
