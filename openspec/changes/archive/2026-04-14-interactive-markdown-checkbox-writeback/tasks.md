## 1. 文件写入 IPC

- [x] 1.1 在 `src/preload.ts` 的 `FileApi` 中新增 `writeFile(filePath, content)` 类型定义与 preload 暴露方法
- [x] 1.2 在 `src/main.ts` 新增 `fs:writefile` IPC handler，使用 UTF-8 写入文本内容
- [x] 1.3 为写入内容增加 1MB 大小限制，超过限制时返回错误且不写入文件
- [x] 1.4 保持写入路径经过 `path.resolve` 处理，并以 `{ success?: boolean; error?: string }` 形式返回结果

## 2. Markdown 任务 marker 切换逻辑

- [x] 2.1 新增或内聚实现 `toggleMarkdownTaskMarker(content, taskIndex)` 逻辑，按源文件出现顺序定位第 N 个 GFM task marker
- [x] 2.2 支持 `- [ ]`、`- [x]`、`- [X]`、`* [ ]`、`+ [ ]` 及缩进嵌套任务行
- [x] 2.3 切换时只替换 marker 状态字符，不改变缩进、列表符号或任务正文
- [x] 2.4 当 taskIndex 找不到对应 marker 时返回失败结果，避免写入错误内容

## 3. MarkdownPreview 交互

- [x] 3.1 为 `MarkdownPreview` 增加可选 `onTaskCheckboxToggle(taskIndex)` 回调 prop
- [x] 3.2 通过 `ReactMarkdown` 的 `components.input` 自定义渲染 task checkbox，并为每个 task checkbox 分配稳定的渲染顺序索引
- [x] 3.3 checkbox 点击时阻止默认只读行为，调用 `onTaskCheckboxToggle`，非 checkbox input 保持原渲染语义
- [x] 3.4 保持未选中文件、普通 Markdown 渲染、GFM 表格、删除线、代码高亮等现有行为不变

## 4. FilePreviewPanel 写回编排

- [x] 4.1 在 `FilePreviewPanel` 中实现 task checkbox toggle handler，基于当前 `selectedFile` 和 `fileContent` 计算 `nextContent`
- [x] 4.2 调用 `window.fileApi.writeFile(selectedFile, nextContent)` 写回源文件
- [x] 4.3 写回成功后更新 `fileContent` 为 `nextContent`，使预览立即反映新 checkbox 状态
- [x] 4.4 写回失败或 marker 定位失败时不更新 `fileContent`，并在预览区域提供可见错误反馈
- [x] 4.5 在写回期间避免重复点击造成并发写入竞态

## 5. 验证

- [x] 5.1 验证点击未完成任务后源 Markdown 从 `[ ]` 变为 `[x]`，预览立即显示勾选
- [x] 5.2 验证点击已完成任务后源 Markdown 从 `[x]` 或 `[X]` 变为 `[ ]`，预览立即显示未勾选
- [x] 5.3 验证嵌套任务列表只切换被点击的任务项，不改变缩进和正文
- [x] 5.4 验证写入失败或超过 1MB 限制时预览不伪造成功状态，并展示错误反馈
- [x] 5.5 验证非 Markdown 文件仍路由到 `CodePreview`，Markdown 代码块高亮仍正常
