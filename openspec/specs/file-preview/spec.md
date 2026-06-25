# Capability: file-preview

## Purpose
文件预览系统，包含文件树浏览、Markdown 渲染、工作目录同步和文件系统 IPC 通道。
## Requirements
### Requirement: 文件树浏览
系统 SHALL 提供一个文件树组件，以树形结构展示指定根目录下的文件和目录，具备 macOS Finder 侧边栏级别的精致度和舒适间距。

#### Scenario: 文件树渲染
- **WHEN** 文件预览面板挂载且根目录已确定
- **THEN** 文件树 SHALL 只读取根目录的第一层内容并以缩进树形结构展示，目录在前、文件在后，同组内按修改时间倒序排列（最近修改的排在最上面），修改时间相同时按名称排序

#### Scenario: 目录展开与折叠
- **WHEN** 用户点击一个目录节点
- **THEN** 若该目录为折叠状态，SHALL 按需读取该目录的第一层子节点并展开显示；若为展开状态，SHALL 折叠隐藏其后代节点

#### Scenario: 默认显示全部文件
- **WHEN** 文件树加载目录内容时
- **THEN** SHALL 显示目录和非隐藏文件，并复用系统目录、Home 目录、项目噪音目录与 `.gitignore` 排除策略

#### Scenario: 选中文件高亮与侧边指示条
- **WHEN** 用户点击一个文件节点
- **THEN** 该文件 SHALL 显示选中高亮背景状态，高亮颜色 SHALL 使用主题变量而非硬编码值
- **THEN** 该文件行左侧 SHALL 显示一条 3px 宽的竖向圆角指示条，颜色使用 `--color-tree-indicator`（accent 色）
- **THEN** 指示条 SHALL 与选中背景叠加使用

#### Scenario: 文件夹图标使用主题协调蓝灰色
- **WHEN** 文件树渲染目录节点图标
- **THEN** 文件夹图标颜色 SHALL 使用 `--color-icon-folder` CSS 自定义属性
- **THEN** 该颜色 SHALL 为柔和蓝灰色（非金色/黄色），与整体冷蓝色调协调
- **THEN** light 和 dark 主题 SHALL 各有明确可辨识的蓝灰色值

#### Scenario: 文件树行高和间距提供呼吸感
- **WHEN** 文件树渲染节点行
- **THEN** 每行高度 SHALL 为 34px，提供接近 macOS Finder 侧边栏的舒适间距
- **THEN** 图标尺寸 SHALL 为 16px
- **THEN** 图标与文字之间的间距 SHALL 为 8px

#### Scenario: 目录名与文件名通过字重区分
- **WHEN** 文件树渲染目录节点和文件节点
- **THEN** 目录名 SHALL 使用更重的字重（≥ 550），使其在快速扫描时比文件名更突出
- **THEN** 文件名 SHALL 使用常规字重

#### Scenario: Hover 态圆角卡片感与微浮起
- **WHEN** 用户悬停一个文件树节点
- **THEN** hover 背景 SHALL 使用 8px 圆角
- **THEN** 背景色变化 SHALL 使用 150ms ease 过渡
- **THEN** hover 态 SHALL 叠加一层极淡的阴影，产生"微浮起"的触感
- **THEN** hover 背景色和阴影 SHALL 通过 CSS 自定义属性定义

### Requirement: 文件树虚拟化渲染
系统 SHALL 基于当前展开状态生成文件树可见行，并使用固定行高虚拟列表限制实际挂载的节点数量。

#### Scenario: 折叠目录不挂载后代节点
- **WHEN** 文件树已加载树结果且某个目录处于折叠状态
- **THEN** 该目录的后代节点 SHALL 不进入当前可见行列表，也 SHALL 不挂载到 React 渲染树中

#### Scenario: 大量可见节点滚动
- **WHEN** 当前展开状态产生的可见节点数量超过文件树视口可显示数量
- **THEN** 文件树 SHALL 只挂载视口附近的可见行，并 SHALL 通过占位高度保持滚动条表示完整可见行列表

#### Scenario: 展开全部虚拟化
- **WHEN** 用户点击展开全部按钮
- **THEN** 文件树 SHALL 将当前完整树中的目录视为展开状态，并 SHALL 继续只挂载虚拟窗口范围内的可见行

#### Scenario: 虚拟行交互保持一致
- **WHEN** 用户对虚拟列表中的文件或目录行执行点击、右键、hover 或选中操作
- **THEN** 文件树 SHALL 保持现有展开折叠、文件预览、选中高亮和上下文菜单行为不变

### Requirement: 文件树按需加载与展开全部
系统 SHALL 初次只加载根目录第一层，并 SHALL 根据根目录层级决定是否提供展开全部入口。

#### Scenario: 初次只加载第一层
- **WHEN** 文件树根目录发生变化或用户手动刷新
- **THEN** 系统 SHALL 只请求该根目录的直接子节点，不 SHALL 扫描完整子树

#### Scenario: 展开目录加载下一层
- **WHEN** 用户展开一个尚未加载过子节点的目录
- **THEN** 系统 SHALL 只请求该目录的直接子节点，并 SHALL 将结果缓存到该目录节点下

#### Scenario: 高层目录隐藏展开全部
- **WHEN** 文件树根目录是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 不显示展开全部按钮

#### Scenario: 非高层目录显示展开全部
- **WHEN** 文件树根目录不是文件系统根目录、`/Users` 或当前用户 Home
- **THEN** 文件树工具栏 SHALL 显示展开全部按钮

#### Scenario: 非高层目录展开全部
- **WHEN** 用户在非高层目录点击展开全部按钮
- **THEN** 系统 SHALL 扫描该根目录完整文件树，替换当前树数据，并展开所有目录

### Requirement: 文件树搜索
系统 SHALL 在文件树工具栏提供搜索框，用于过滤当前已加载的树节点。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在文件树搜索框输入关键词
- **THEN** 文件树 SHALL 只展示当前已加载树中名称或路径匹配关键词的节点及其必要父节点

#### Scenario: 清空搜索关键词
- **WHEN** 用户清空搜索框
- **THEN** 文件树 SHALL 恢复按当前展开状态展示可见节点

### Requirement: 文件树 Spec 模式
系统 SHALL 提供 spec 模式切换按钮，用于只加载配置的 spec 目录名对应的目录树。

#### Scenario: 开启 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为关闭状态
- **THEN** 文件树 SHALL 重新加载，只返回当前根目录下配置的 spec 目录条目本身（name、path、mtime），不 SHALL 预加载 spec 目录的子项内容
- **THEN** 返回的 spec 目录节点 SHALL 标记为子项未加载状态（childrenLoaded 为 false）
- **THEN** spec 目录 SHALL 以折叠状态呈现，与非 spec 模式下目录的初始状态一致

#### Scenario: 关闭 spec 模式
- **WHEN** 用户点击 spec 模式按钮且当前为开启状态
- **THEN** 文件树 SHALL 重新加载根目录第一层，并恢复普通全部文件展示

#### Scenario: spec 模式按钮显示
- **WHEN** 文件树工具栏渲染 spec 模式按钮
- **THEN** 按钮内容 SHALL 显示 `spec` 文本而非图形 icon

#### Scenario: spec 模式继续按需展开
- **WHEN** 用户在 spec 模式下展开已展示的 spec 目录
- **THEN** 文件树 SHALL 按需加载该目录下一层内容

#### Scenario: spec 模式展开全部
- **WHEN** 用户在 spec 模式下点击展开全部按钮
- **THEN** 系统 SHALL 只扫描配置的 spec 目录树并展开结果，不 SHALL 扫描或展开非 spec 目录

#### Scenario: 移除 Markdown 过滤切换
- **WHEN** 文件树工具栏渲染
- **THEN** 文件树 SHALL 不显示 Markdown-only / 全部文件切换按钮

#### Scenario: spec 模式展开状态恢复
- **WHEN** spec 模式加载完成且存在之前记忆的展开路径
- **THEN** 文件树 SHALL 使用与非 spec 模式相同的展开状态恢复机制，按需加载每个之前展开的目录的子项
- **THEN** 系统 SHALL 不对 spec 目录做任何特殊的自动展开处理

### Requirement: Markdown 文件预览
系统 SHALL 使用 react-markdown 渲染选中的 Markdown 文件内容，支持 GFM 语法、代码高亮和 Mermaid 图表渲染。仅当选中文件的扩展名为 `.md` 时才使用此渲染模式。Markdown 预览中的 GFM 任务列表 checkbox SHALL 支持点击切换状态，并将变更写回源 Markdown 文件。

#### Scenario: 渲染选中文件
- **WHEN** 用户在文件树中选中一个 `.md` 文件
- **THEN** 系统 SHALL 通过 IPC 读取文件内容，并在预览区使用 react-markdown 渲染为格式化 HTML

#### Scenario: GFM 语法支持
- **WHEN** Markdown 文件包含 GFM 扩展语法（表格、任务列表、删除线等）
- **THEN** 预览区 SHALL 正确渲染这些扩展语法元素

#### Scenario: 点击任务 checkbox 勾选
- **WHEN** 用户点击 Markdown 预览中由 `- [ ]`、`* [ ]` 或 `+ [ ]` 渲染出的未完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为已完成状态 `[x]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为勾选状态

#### Scenario: 点击任务 checkbox 取消勾选
- **WHEN** 用户点击 Markdown 预览中由 `[x]` 或 `[X]` 渲染出的已完成任务 checkbox
- **THEN** 系统 SHALL 将源 Markdown 文件中对应任务 marker 写回为未完成状态 `[ ]`
- **AND** 预览区 SHALL 使用写回后的内容重新渲染为未勾选状态

#### Scenario: 嵌套任务 checkbox 写回
- **WHEN** Markdown 文件包含缩进的嵌套 GFM 任务列表，且用户点击其中一个任务 checkbox
- **THEN** 系统 SHALL 按任务项在源文件中的出现顺序定位对应 marker
- **AND** 系统 SHALL 只切换该 marker 的状态，不改变该行缩进或正文内容

#### Scenario: checkbox 写回失败
- **WHEN** 用户点击任务 checkbox 但源文件写入失败
- **THEN** 系统 SHALL 保持当前预览内容与写入前一致
- **AND** 系统 SHALL 向用户展示写入失败反馈

#### Scenario: 代码块语法高亮
- **WHEN** Markdown 文件包含带语言标识的代码块（如 ```typescript）
- **THEN** 预览区 SHALL 对代码块应用语法高亮着色

#### Scenario: Mermaid 图表渲染
- **WHEN** Markdown 文件包含语言标识为 `mermaid` 的 fenced code block
- **THEN** 预览区 SHALL 将该代码块内容渲染为 Mermaid 图表
- **AND** 预览区 SHALL NOT 将该代码块显示为普通高亮代码块

#### Scenario: Mermaid 图表主题
- **WHEN** 当前应用主题为 light 或 dark
- **AND** Markdown 文件包含可成功渲染的 Mermaid 图表
- **THEN** 预览区 SHALL 使用与当前应用主题匹配的 Mermaid 主题渲染图表

#### Scenario: Mermaid 渲染失败
- **WHEN** Markdown 文件包含无法成功渲染的 Mermaid fenced code block
- **THEN** 预览区 SHALL 在对应位置展示 Mermaid 渲染失败反馈
- **AND** 预览区 SHALL 保留该代码块源码可见
- **AND** 预览区 SHALL 继续渲染文档中的其它内容

#### Scenario: Mermaid 图表滚动稳定性
- **WHEN** Markdown 文件包含已成功渲染的 Mermaid 图表
- **AND** 用户在预览区滚动浏览内容
- **THEN** 预览区 SHALL NOT 因滚动动作让 Mermaid 图表重新进入 loading 状态
- **AND** 预览区 SHALL NOT 因滚动动作重复调用 Mermaid 图表渲染

#### Scenario: Mermaid 图表全屏查看
- **WHEN** Markdown 文件包含已成功渲染的 Mermaid 图表
- **AND** 用户点击该图表或图表全屏查看控件
- **THEN** 系统 SHALL 打开全屏图表查看层
- **AND** 全屏查看层 SHALL 展示同一 Mermaid 图表内容
- **AND** 全屏查看层 SHALL 默认按可用宽高等比适配图表，使图表尽量撑满查看区域且不变形

#### Scenario: Mermaid 全屏图表滚轮缩放
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 用户在查看层内滚动鼠标滚轮
- **THEN** 系统 SHALL 根据滚轮方向放大或缩小图表
- **AND** 系统 SHALL 将缩放比例限制在可用范围内，避免图表不可恢复地过小或过大

#### Scenario: Mermaid 全屏默认适配容器
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 根据图表 intrinsic 尺寸和全屏画布可用宽高计算初始缩放比例
- **AND** 图表 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 全屏按可见内容边界适配
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** Mermaid SVG 的声明 viewBox 或画布尺寸包含明显大于可见图形的空白区域
- **THEN** 系统 SHALL 优先根据 SVG 可见内容边界计算初始缩放比例
- **AND** 图表可见内容 SHALL 在保持宽高比的前提下尽量占满全屏画布

#### Scenario: Mermaid 全屏源码与图表模式切换
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 系统 SHALL 提供源码模式和图表模式切换控件
- **AND** 用户切换到源码模式时，系统 SHALL 展示该 Mermaid 图表的源码文本
- **AND** 用户切换回图表模式时，系统 SHALL 展示 Mermaid 图表并保留可滚轮缩放能力

#### Scenario: Mermaid 全屏模式切换控件命中区域
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 图表 / 源码切换控件可见
- **THEN** 切换控件的可点击命中区域 SHALL 与视觉按钮边界一致
- **AND** 用户点击视觉按钮区域时，系统 SHALL 切换到对应模式

#### Scenario: Mermaid 全屏右上角工具栏完整按钮命中区域
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 右上角工具栏中的图表、源码、复制、关闭控件可见
- **THEN** 每个控件的可点击命中区域 SHALL 覆盖其整个可见按钮区域
- **AND** 用户点击任一控件可见按钮区域内的边缘、角落或中心时，系统 SHALL 执行该控件对应操作

#### Scenario: Mermaid 全屏容器右下角缩放百分比
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前 Mermaid 图表存在源码
- **THEN** 缩放百分比 SHALL 固定显示在全屏容器右下角
- **AND** 关闭图标 SHALL 保持显示在全屏容器右上角
- **AND** 缩放百分比 SHALL NOT 占用或推动工具栏中的图表 / 源码切换、复制或关闭控件

#### Scenario: Mermaid 全屏一键复制
- **WHEN** Mermaid 全屏图表查看层已打开
- **AND** 当前模式为图表模式
- **THEN** 系统 SHALL 提供复制控件用于复制当前 Mermaid SVG
- **WHEN** 当前模式为源码模式
- **THEN** 系统 SHALL 提供复制控件用于复制该 Mermaid 图表源码
- **AND** 复制操作 SHALL NOT 切换模式或关闭全屏查看层

#### Scenario: 未选中文件时的占位显示
- **WHEN** 文件预览面板加载但未选中任何文件
- **THEN** 预览区 SHALL 显示占位提示文本（如"选择一个文件以预览"）

#### Scenario: 预览区滚动
- **WHEN** 渲染后的 Markdown 内容超过预览区可视高度
- **THEN** 预览区 SHALL 支持垂直滚动浏览完整内容

### Requirement: SDD 任务文档 Apply 控件
系统 SHALL 在 Markdown 预览中为受支持的 SDD 任务文档展示 scoped Apply 控件，使用户可以从 task item 或 task group 触发对应范围的 apply 确认流程。系统 SHALL 仅在 OpenSpec `openspec/changes/<change>/tasks.md` 与 RavenSpec `ravenspec/changes/<change>/TASK.md` 中展示这些控件。

#### Scenario: OpenSpec tasks 文档显示 Apply 控件
- **WHEN** 用户预览项目内 `openspec/changes/<change-name>/tasks.md`
- **AND** 文档包含未完成 task item
- **THEN** Markdown 预览 SHALL 在未完成 task item 附近展示 Apply 控件
- **AND** Apply 控件 SHALL 将 workflow 标记为 `openspec`
- **AND** Apply 控件 SHALL 将 `<change-name>` 作为目标 change

#### Scenario: RavenSpec TASK 文档显示 Apply 控件
- **WHEN** 用户预览项目内 `ravenspec/changes/<change-name>/TASK.md`
- **AND** 文档包含未完成 task item
- **THEN** Markdown 预览 SHALL 在未完成 task item 附近展示 Apply 控件
- **AND** Apply 控件 SHALL 将 workflow 标记为 `raven`
- **AND** Apply 控件 SHALL 将 `<change-name>` 作为目标 change

#### Scenario: 普通 Markdown 不显示 Apply 控件
- **WHEN** 用户预览不匹配受支持 SDD 任务文档路径的 Markdown 文件
- **THEN** Markdown 预览 SHALL NOT 展示 task apply 控件
- **AND** 系统 SHALL 保持普通 Markdown 渲染、task checkbox 写回、评论和查找行为可用

#### Scenario: 已完成 task item 不提供立即 Apply
- **WHEN** 受支持的 SDD 任务文档中某个 task item 已完成
- **THEN** Markdown 预览 SHALL NOT 将该 task item 展示为可立即 apply 的目标
- **AND** 该 task item 的 checkbox 状态 SHALL 仍按现有 Markdown task 行为渲染

#### Scenario: 对 task item 触发 Apply
- **WHEN** 用户点击未完成 task item 的 Apply 控件
- **THEN** 系统 SHALL 打开高风险确认/编辑 payload 界面
- **AND** 确认内容 SHALL 指明只执行该 task item
- **AND** 系统 SHALL NOT 在用户确认前向 terminal session 写入内容

#### Scenario: task group 有未完成任务时显示 Apply 控件
- **WHEN** 受支持的 SDD 任务文档中某个 heading 管辖范围内存在一个或多个未完成 task item
- **THEN** Markdown 预览 SHALL 为该 heading 对应的 task group 展示 Apply 控件
- **AND** 该 group Apply 控件 SHALL 表示执行该 task group 内所有未完成 task item

#### Scenario: task group 全部完成时不提供立即 Apply
- **WHEN** 受支持的 SDD 任务文档中某个 heading 管辖范围内的 task item 全部完成
- **THEN** Markdown 预览 SHALL NOT 将该 task group 展示为可立即 apply 的目标

#### Scenario: 对 task group 触发 Apply
- **WHEN** 用户点击 task group 的 Apply 控件
- **THEN** 系统 SHALL 打开高风险确认/编辑 payload 界面
- **AND** 确认内容 SHALL 指明只执行该 group 内所有未完成 task item
- **AND** 系统 SHALL NOT 在用户确认前向 terminal session 写入内容

#### Scenario: Apply 控件不修改任务文档
- **WHEN** 用户点击 task item 或 task group 的 Apply 控件
- **THEN** 系统 SHALL NOT 修改 Markdown 源文件
- **AND** 系统 SHALL NOT 自动勾选或取消任何 task checkbox

### Requirement: Markdown 代码块一键复制
系统 SHALL 在 Markdown 文件预览中为 fenced code block 提供一键复制控件，使用户可以将代码块内容写入系统剪贴板。复制内容 SHALL 仅包含代码正文，不包含 Markdown fence、语言标识或复制控件文本。

#### Scenario: 显示代码块复制控件
- **WHEN** 用户预览的 Markdown 文件包含 fenced code block
- **THEN** 系统 SHALL 在该代码块中显示一键复制控件
- **AND** 该控件 SHALL 不改变代码块正文的高亮渲染结果

#### Scenario: 行内代码不显示复制控件
- **WHEN** 用户预览的 Markdown 文件包含行内代码
- **THEN** 系统 SHALL 使用现有行内代码样式渲染该内容
- **AND** 系统 SHALL NOT 为行内代码显示代码块复制控件

#### Scenario: 复制带语言标识的代码块
- **WHEN** Markdown 文件包含带语言标识的 fenced code block
- **AND** 用户点击该代码块的复制控件
- **THEN** 系统 SHALL 将该代码块的代码正文写入系统剪贴板
- **AND** 剪贴板内容 SHALL NOT 包含 Markdown fence 或语言标识

#### Scenario: 保留代码正文空白
- **WHEN** 代码块正文包含缩进、空行或多行内容
- **AND** 用户点击该代码块的复制控件
- **THEN** 系统 SHALL 在剪贴板内容中保留代码正文的换行、缩进和空行

#### Scenario: 复制控件不干扰 Markdown 预览交互
- **WHEN** Markdown 文件同时包含 fenced code block、GFM 任务 checkbox、标题、评论选区或预览查找匹配
- **THEN** 系统 SHALL 保持 GFM checkbox 写回、标题树导航、评论选区创建和预览查找行为可用
- **AND** 系统 SHALL NOT 因复制控件修改 Markdown 源文件或评论持久化数据

### Requirement: Markdown 标题树导航
系统 SHALL 在 Markdown 文件预览中提供基于当前文档标题结构的悬浮标题树导航。标题树 SHALL 仅反映预览区实际渲染出的 `h1` 到 `h6` 标题，并 SHALL 支持用户点击标题后滚动定位到对应标题。标题树在收起状态下的鼠标触发区域 SHALL 仅覆盖可见的悬浮入口，不得让隐藏面板或父容器形成额外的 hover 命中区域。

#### Scenario: 显示悬浮标题树入口
- **WHEN** 用户选中一个包含一个或多个标题的 `.md` 文件
- **THEN** 预览区 SHALL 在 Markdown 内容区域左侧显示悬浮标题树入口
- **AND** 该入口 SHALL 不改变 Markdown 正文的布局宽度

#### Scenario: 收起状态只通过可见入口触发展开
- **WHEN** Markdown 标题树处于收起状态
- **AND** 用户将鼠标移动到可见悬浮标题树入口以外的 Markdown 正文区域或入口左侧邻近区域
- **THEN** 系统 SHALL 保持标题树收起
- **AND** 系统 SHALL NOT 因隐藏标题树面板或父容器的不可见区域触发展开

#### Scenario: Hover 或 focus 展开标题树
- **WHEN** 用户将鼠标移动到可见悬浮标题树入口、已展开的标题树面板上，或通过键盘 focus 到标题树入口
- **THEN** 系统 SHALL 展开标题树面板
- **AND** 标题树 SHALL 按 `h1` 到 `h6` 层级使用缩进或等效视觉层级展示标题

#### Scenario: 展开后保持标题树可交互
- **WHEN** 标题树面板已展开
- **AND** 用户将鼠标从悬浮标题树入口移动到已展开的标题树面板上
- **THEN** 系统 SHALL 保持标题树面板展开
- **AND** 标题树面板中的标题项 SHALL 保持可点击和可聚焦

#### Scenario: 点击标题跳转定位
- **WHEN** 用户点击标题树中的一个标题项
- **THEN** Markdown 预览滚动容器 SHALL 滚动到对应的渲染标题位置
- **AND** 系统 SHALL 保持当前选中文件、文件内容和文件树状态不变

#### Scenario: 无标题时隐藏入口
- **WHEN** 用户选中的 `.md` 文件没有渲染出任何 `h1` 到 `h6` 标题
- **THEN** 预览区 SHALL 不显示标题树入口或空标题树面板

#### Scenario: 非 Markdown 文件不显示标题树
- **WHEN** 用户选中一个非 `.md` 文件
- **THEN** 预览区 SHALL 使用现有代码预览模式
- **AND** 系统 SHALL 不显示 Markdown 标题树入口

### Requirement: Markdown 预览划线评论
系统 SHALL 允许用户在 Markdown 文件预览中基于当前可见文本选区创建、查看、编辑和删除划线评论。评论 SHALL 作为独立批注数据保存，不 SHALL 直接改写源 Markdown 正文。评论创建入口和已评论标记 SHALL 不遮挡 Markdown 正文内容。

#### Scenario: 通过文本选区创建评论
- **WHEN** 用户在 `.md` 文件预览正文中选择一段非空文本并触发添加评论操作
- **THEN** 系统 SHALL 打开评论输入界面，允许用户为该选区输入评论内容
- **AND** 用户确认后，系统 SHALL 为该选区创建一条评论记录

#### Scenario: 选中文本后显示添加评论工具条
- **WHEN** 用户在 Markdown 预览正文中选择一段可评论文本
- **THEN** 系统 SHALL 在选区上方或下方显示添加评论工具条
- **AND** 添加评论工具条 SHALL 不放在选区行尾的正文流内
- **AND** 添加评论工具条 SHALL 不遮挡被选中文本或选区后续相邻正文

#### Scenario: 拒绝无效选区
- **WHEN** 用户未选择文本、只选择空白文本，或选区不完全位于当前 Markdown 预览正文内
- **THEN** 系统 SHALL 不创建评论
- **AND** 系统 SHALL 不改变当前 Markdown 文件内容

#### Scenario: 显示已评论文本
- **WHEN** 当前 Markdown 文件存在可定位的评论锚点
- **THEN** 系统 SHALL 在对应预览文本上显示划线或等效批注高亮
- **AND** 系统 SHALL 在 Markdown 正文排版流之外显示可点击的评论标记或等效入口
- **AND** 评论标记 SHALL 不遮挡对应文本或其相邻正文

#### Scenario: 已有评论标记显示在右侧批注边栏
- **WHEN** 当前 Markdown 文件存在可定位的评论锚点，且预览区域有足够空间显示批注边栏
- **THEN** 系统 SHALL 在 Markdown 预览右侧批注边栏中显示评论标记
- **AND** 评论标记 SHALL 按对应评论锚点的纵向位置对齐
- **AND** 评论标记 SHALL 不使用被评论文本行尾作为横向定位点

#### Scenario: 窄布局隐藏行旁评论标记
- **WHEN** Markdown 预览区域宽度不足以安全显示右侧批注边栏，或右侧空间被评论面板等浮层占用
- **THEN** 系统 SHALL 隐藏正文旁的评论标记
- **AND** 系统 SHALL 保留已定位评论的划线或等效批注高亮
- **AND** 系统 SHALL 保留右上角评论入口或评论面板列表作为查看评论的等效入口

#### Scenario: 查看评论内容
- **WHEN** 用户点击已评论文本对应的评论标记或等效入口
- **THEN** 系统 SHALL 显示该评论的正文内容
- **AND** 系统 SHALL 标识当前正在查看的评论所对应的文本范围

#### Scenario: 点击评论入口滚动到对应文本
- **WHEN** 用户点击可定位评论对应的评论标记、评论列表项或等效入口
- **THEN** Markdown 预览滚动容器 SHALL 滚动到该评论对应的预览文本范围
- **AND** 系统 SHALL 标识当前正在查看的评论所对应的文本范围

#### Scenario: 点击未定位评论不滚动正文
- **WHEN** 用户点击一条未定位评论的评论列表项或等效入口
- **THEN** 系统 SHALL 显示该评论的正文内容和未定位状态
- **AND** Markdown 预览滚动容器 SHALL 不执行到正文锚点的滚动

#### Scenario: 编辑评论内容
- **WHEN** 用户修改一条已有评论并确认保存
- **THEN** 系统 SHALL 更新该评论的正文内容和更新时间
- **AND** 系统 SHALL 保持该评论的文本锚点不变

#### Scenario: 删除评论
- **WHEN** 用户删除一条已有评论
- **THEN** 系统 SHALL 移除该评论记录
- **AND** 系统 SHALL 移除该评论对应的划线或批注高亮与评论入口

#### Scenario: 非 Markdown 文件不显示评论控件
- **WHEN** 用户选中一个非 `.md` 文件
- **THEN** 系统 SHALL 使用现有代码预览模式
- **AND** 系统 SHALL 不显示 Markdown 划线评论创建入口、评论标记或评论列表

### Requirement: Markdown 评论发送到当前 Agent
系统 SHALL 允许用户将 Markdown 预览中的单条或多条评论作为结构化文本发送到当前活跃 terminal tab，使该 tab 中运行的 agent 能读取对应文件、定位被评论原文并处理评论意见。发送动作 SHALL 使用现有 terminal 输入链路写入当前活跃 PTY，不 SHALL 直接调用具体 agent 的 API。系统 SHALL 允许用户在当前 Markdown 文件评论列表中逐条选择、全选和取消全选评论，以便执行批量发送或批量删除。

#### Scenario: 发送单条评论到当前 terminal
- **WHEN** 用户在 Markdown 评论详情或评论列表中触发单条评论的发送给 agent 操作
- **AND** 当前存在活跃 terminal session
- **THEN** 系统 SHALL 将该评论格式化为 agent payload
- **AND** 系统 SHALL 通过当前活跃 terminal session 的输入链路写入该 payload
- **AND** payload SHALL 包含评论所在文件的 `@` 相对路径引用、评论 ID、被评论原文和评论正文

#### Scenario: 发送后不自动提交
- **WHEN** 系统将评论 payload 写入当前活跃 terminal session
- **THEN** payload SHALL NOT 追加会触发提交或执行的回车输入
- **AND** 系统 SHALL 使用粘贴语义写入多行 payload，使支持粘贴边界的 agent prompt 将内容放入输入框等待用户确认

#### Scenario: 多选评论后发送
- **WHEN** 用户在 Markdown 评论列表中选中多条评论并触发发送选中评论操作
- **AND** 当前存在活跃 terminal session
- **THEN** 系统 SHALL 将每条选中评论格式化为独立评论块
- **AND** 系统 SHALL 一次性将包含所有选中评论块的 payload 写入当前活跃 terminal session
- **AND** 每条评论块 SHALL 保留自己的 `@` 文件路径、评论 ID、被评论原文和评论正文

#### Scenario: 多选评论后删除
- **WHEN** 用户在 Markdown 评论列表中选中一条或多条评论并触发删除选中评论操作
- **THEN** 系统 SHALL 从当前文件评论列表中移除所有选中评论
- **AND** 系统 SHALL 通过现有评论保存链路保存删除后的评论列表
- **AND** 系统 SHALL 清空已删除评论的选中状态
- **AND** 若当前正在查看的评论被删除，系统 SHALL 退出该评论详情态

#### Scenario: 全选当前文件评论
- **WHEN** 当前 Markdown 文件评论列表存在一条或多条评论
- **AND** 用户触发评论列表全选控制
- **THEN** 系统 SHALL 选中当前文件评论列表中的全部评论
- **AND** 系统 SHALL 同时选中已定位评论和未定位评论
- **AND** 系统 SHALL NOT 选中其他 Markdown 文件中的评论

#### Scenario: 全选后取消全选
- **WHEN** 当前 Markdown 文件评论列表中的全部评论已被选中
- **AND** 用户再次触发评论列表全选控制
- **THEN** 系统 SHALL 清空当前文件评论列表的评论选择
- **AND** 系统 SHALL 禁用依赖选中评论的发送选中和删除选中操作

#### Scenario: 部分选中状态
- **WHEN** 当前 Markdown 文件评论列表只选中了部分评论
- **THEN** 评论列表全选控制 SHALL 呈现部分选中状态
- **AND** 用户触发该控制后，系统 SHALL 选中当前文件评论列表中的全部评论

#### Scenario: 多条评论注入内容包含处理规则
- **WHEN** 系统生成包含多条评论的 agent payload
- **THEN** payload SHALL 包含简短规则说明，说明每个评论块是独立评论、`@` 后文件为评论所在文件、`selected_text` 为锚定原文、`comment` 为用户意见
- **AND** payload SHALL 要求当评论文件属于 OpenSpec 或 Raven change 时优先更新对应 spec/change artifacts，必要时再修改代码
- **AND** payload SHALL 要求评论意图不明确时先询问用户

#### Scenario: 单条评论注入短规则
- **WHEN** 系统生成只包含一条评论的 agent payload
- **THEN** payload SHALL 包含一行短规则说明和该评论对应的评论块
- **AND** 短规则说明 SHALL 要求按 `comment` 修改 `@` 文件，且当 workflow 是 openspec 或 raven 时先更新对应 spec/change artifacts
- **AND** payload SHALL NOT 包含多条评论使用的长规则说明

#### Scenario: 评论块以文件引用开头
- **WHEN** 系统格式化任一评论块
- **THEN** 该评论块 SHALL 包含一行以 `@` 开头的项目相对文件路径
- **AND** 该 `@` 路径 SHALL 指向评论所在 Markdown 文件
- **AND** 该评论块 SHALL 在文件路径之后包含 `selected_text` 与 `comment` 两个明确字段

#### Scenario: 推断 OpenSpec change 元信息
- **WHEN** 评论所在文件路径位于 `openspec/changes/<change-name>/` 下
- **THEN** 系统 SHALL 在该评论块元信息中标记 `workflow="openspec"`
- **AND** 系统 SHALL 将 `<change-name>` 作为该评论块的 change 名称

#### Scenario: 推断 Raven change 元信息
- **WHEN** 评论所在文件路径位于 `ravenspec/changes/<change-name>/` 下
- **THEN** 系统 SHALL 在该评论块元信息中标记 `workflow="raven"`
- **AND** 系统 SHALL 将 `<change-name>` 作为该评论块的 change 名称

#### Scenario: 普通 Markdown 文件评论
- **WHEN** 评论所在文件路径不属于已识别的 OpenSpec 或 Raven change 路径
- **THEN** 系统 SHALL 仍允许发送该评论
- **AND** 系统 SHALL 将该评论块的 workflow 标记为 unknown 或省略具体 change 名称

#### Scenario: 当前无活跃 terminal
- **WHEN** 用户触发发送给 agent 操作
- **AND** 当前不存在活跃 terminal session
- **THEN** 系统 SHALL 不丢弃评论内容
- **AND** 系统 SHALL 不修改 Markdown 源文件或评论持久化数据
- **AND** 系统 SHALL 向用户展示无法发送的明确反馈

#### Scenario: 发送动作不改变评论数据
- **WHEN** 用户将一条或多条评论发送给 agent
- **THEN** 系统 SHALL NOT 修改源 Markdown 文件
- **AND** 系统 SHALL NOT 因发送动作调用评论保存 API
- **AND** 系统 SHALL NOT 改变 `.aiterm/markdown-preview-comments.json` 中的评论数据

#### Scenario: 删除选中评论不触发发送
- **WHEN** 用户删除选中评论
- **THEN** 系统 SHALL NOT 向当前 terminal session 写入 agent payload
- **AND** 系统 SHALL NOT 修改源 Markdown 文件正文

#### Scenario: 发送后轻量反馈
- **WHEN** 系统成功将评论 payload 写入当前活跃 terminal session
- **THEN** 评论面板 SHALL 展示轻量成功反馈或等效状态
- **AND** 系统 SHALL 保持评论面板可继续查看、编辑、删除或发送其他评论

### Requirement: Markdown 评论持久化与锚点恢复
系统 SHALL 将 Markdown 预览评论保存到当前项目根目录下的 `.aiterm/markdown-preview-comments.json`，并 SHALL 在重新打开文件或应用重启后恢复当前文件的评论。评论数据 SHALL 按项目相对文件路径分组保存。评论锚点 SHALL 基于用户选择的渲染文本和上下文信息恢复到预览 DOM。

#### Scenario: 重新打开文件后恢复评论
- **WHEN** 用户为某个 Markdown 文件创建评论后切换到其他文件，再重新打开该 Markdown 文件
- **THEN** 系统 SHALL 加载该文件已保存的评论
- **AND** 系统 SHALL 对可定位评论恢复划线或等效批注高亮与评论入口

#### Scenario: 应用重启后恢复评论
- **WHEN** 用户为某个 Markdown 文件创建评论并重启应用
- **THEN** 系统 SHALL 在该 Markdown 文件再次打开时加载已保存的评论
- **AND** 系统 SHALL 对可定位评论恢复划线或等效批注高亮与评论入口

#### Scenario: 源 Markdown 正文不被评论改写
- **WHEN** 用户创建、编辑或删除 Markdown 预览评论
- **THEN** 系统 SHALL 只更新评论持久化数据
- **AND** 系统 SHALL 不因评论操作调用源 Markdown 文件写入流程或改变源 Markdown 正文内容

#### Scenario: 锚点轻微偏移后重新定位
- **WHEN** Markdown 文件内容发生轻微修改，且评论保存的选中文本与上下文仍能在当前渲染文本中匹配
- **THEN** 系统 SHALL 将该评论重新定位到匹配文本
- **AND** 系统 SHALL 显示该评论的划线或等效批注高亮与评论入口

#### Scenario: 锚点无法恢复
- **WHEN** Markdown 文件内容变化导致某条评论的选中文本与上下文无法在当前渲染文本中匹配
- **THEN** 系统 SHALL 保留该评论记录
- **AND** 系统 SHALL 将该评论标记为未定位
- **AND** 系统 SHALL 不在正文中显示该评论的划线或批注高亮

#### Scenario: 评论持久化失败
- **WHEN** 系统保存评论数据失败
- **THEN** 系统 SHALL 向用户展示保存失败反馈
- **AND** 系统 SHALL 不删除当前内存中的评论内容
- **AND** 系统 SHALL NOT 将评论 fallback 保存到应用 `userData`

### Requirement: Markdown 评论与现有预览交互共存
系统 SHALL 保持 Markdown 划线评论与现有预览查找、标题树导航、GFM checkbox 写回和普通滚动浏览互不破坏。评论创建工具条和右侧批注边栏 SHALL 与这些既有控件保持可用且不互相遮挡。

#### Scenario: 预览查找与评论高亮共存
- **WHEN** 当前 Markdown 文件同时存在评论划线和预览查找关键词匹配
- **THEN** 系统 SHALL 同时展示评论高亮和查找匹配状态
- **AND** 查找上一个/下一个匹配的导航 SHALL 继续滚动到当前匹配项
- **AND** 评论工具条或评论标记 SHALL 不遮挡查找输入框和查找导航控件

#### Scenario: 标题树导航保持可用
- **WHEN** 当前 Markdown 文件存在评论且用户点击标题树中的标题项
- **THEN** Markdown 预览滚动容器 SHALL 滚动到对应标题位置
- **AND** 系统 SHALL 保持当前文件的评论数据与评论标记可用
- **AND** 评论工具条或批注边栏 SHALL 不遮挡标题树入口和标题树面板

#### Scenario: GFM checkbox 写回保持可用
- **WHEN** 当前 Markdown 文件存在评论且用户点击 GFM task checkbox
- **THEN** 系统 SHALL 继续按现有规则切换对应任务 marker 并写回源 Markdown 文件
- **AND** 系统 SHALL 在预览重新渲染后重新计算评论锚点与评论标记

#### Scenario: 评论不改变普通 Markdown 渲染
- **WHEN** 当前 Markdown 文件包含 GFM 表格、删除线、链接、代码块或图片
- **THEN** 系统 SHALL 继续按现有 Markdown 预览规则渲染这些内容
- **AND** 评论功能 SHALL 不向 Markdown 渲染结果插入会破坏这些元素语义的额外文本内容

### Requirement: 文件预览面板布局
文件预览面板内部 SHALL 采用上下布局，上方为文件树，下方为 Markdown 预览区。

#### Scenario: 上下分区
- **WHEN** 文件预览面板渲染时
- **THEN** 上方 SHALL 显示文件树区域，下方 SHALL 显示 Markdown 预览区域，预览区占据剩余空间

#### Scenario: 面板标题
- **WHEN** 文件预览面板渲染时
- **THEN** 文件树区域顶部 SHALL 显示当前根目录路径作为标题

### Requirement: 工作目录同步
文件树的根目录 SHALL 在终端 Tab 切换时与当前激活终端的工作目录同步，且在终端工作目录发生变化时自动更新，但仅在左栏展开时生效。系统不再使用定时轮询检测 CWD 变化。

#### Scenario: 初始同步
- **WHEN** 文件预览面板首次加载且左栏处于展开状态
- **THEN** 文件树根目录 SHALL 设置为当前激活终端 Tab 的初始工作目录

#### Scenario: 切换终端 Tab 时同步
- **WHEN** 用户在右侧切换到另一个终端 Tab 且左栏处于展开状态
- **THEN** 系统 SHALL 获取新激活终端的工作目录并更新文件树根目录

#### Scenario: 终端 CWD 变化时自动同步
- **WHEN** 当前激活终端的工作目录因用户执行 `cd` 等命令发生变化，且左栏处于展开状态
- **THEN** 系统 SHALL 自动检测到 CWD 变化并更新文件树根目录，无需用户手动刷新

#### Scenario: 左栏收起时不同步
- **WHEN** 用户在右侧切换终端 Tab 或终端 CWD 变化，且左栏处于收起状态
- **THEN** 系统 SHALL 不更新文件树根目录，不发起目录读取请求

#### Scenario: 左栏展开时恢复同步
- **WHEN** 左栏从收起状态切换为展开状态
- **THEN** 系统 SHALL 立即获取当前激活终端 Tab 的工作目录并更新文件树根目录

#### Scenario: 不使用定时轮询
- **WHEN** 文件树模块处于任何状态
- **THEN** 系统 SHALL 不使用定时器轮询终端工作目录变化

#### Scenario: CWD 变化检测机制
- **WHEN** PTY 进程产生输出数据
- **THEN** 主进程 SHALL 以节流方式（不超过每秒一次）检测 PTY 的实际工作目录，若发生变化则推送事件到渲染进程

### Requirement: 文件系统 IPC 通道
主进程 SHALL 提供文件系统读取与受控写入相关的 IPC 通道，渲染进程通过 preload 暴露的 API 调用。扫描结果的每个节点 SHALL 包含修改时间信息。

#### Scenario: 读取目录内容
- **WHEN** 渲染进程调用 `fileApi.readDir(path)` 
- **THEN** 主进程 SHALL 读取指定路径的目录内容，返回条目列表（包含名称和类型信息）

#### Scenario: 按需读取树节点
- **WHEN** 渲染进程调用 `fileApi.readTreeDirectory(path)`
- **THEN** 主进程 SHALL 只读取指定目录的直接子节点，并返回包含 `name`、`path`、`isDirectory`、`mtime` 的树节点列表

#### Scenario: 读取文件内容
- **WHEN** 渲染进程调用 `fileApi.readFile(path)` 
- **THEN** 主进程 SHALL 读取指定文件的文本内容并返回

#### Scenario: 写入文件内容
- **WHEN** 渲染进程调用 `fileApi.writeFile(path, content)`
- **THEN** 主进程 SHALL 将 `content` 作为 UTF-8 文本写入指定文件，并返回成功或错误结果

#### Scenario: 文件大小限制
- **WHEN** 请求读取或写入的文件内容大小超过 1MB
- **THEN** 主进程 SHALL 返回错误提示，而非读取或写入完整内容

#### Scenario: 路径安全校验
- **WHEN** 渲染进程请求的路径包含 `..` 路径遍历
- **THEN** 主进程 SHALL 对路径做 resolve 后校验，拒绝明显的路径越界请求

#### Scenario: 扫描节点携带修改时间
- **WHEN** 主进程通过任意扫描方式（fd 或 Node.js 回退）构建文件树
- **THEN** 返回的每个 `ScanTreeNode` SHALL 包含 `mtime` 字段（Unix 毫秒时间戳），表示该文件或目录的最后修改时间

### Requirement: 文件树手动刷新
系统 SHALL 提供一个手动刷新按钮，允许用户主动刷新文件树内容。刷新 SHALL 通过独立的 refreshKey 机制触发，确保即使工作目录未变化也能可靠地重新扫描目录内容。

#### Scenario: 刷新按钮位置
- **WHEN** 文件树模块处于展开状态
- **THEN** 文件树工具栏 SHALL 在 toggle icon 旁显示一个刷新按钮

#### Scenario: 点击刷新（CWD 未变化）
- **WHEN** 用户点击刷新按钮且终端工作目录与当前文件树根目录相同
- **THEN** 系统 SHALL 递增 refreshKey 触发文件树重新扫描，不依赖路径清空/恢复的中间状态，刷新期间 SHALL 显示 loading 状态

#### Scenario: 点击刷新（CWD 已变化）
- **WHEN** 用户点击刷新按钮且终端工作目录已发生变化
- **THEN** 系统 SHALL 更新文件树根目录为新的工作目录，清除选中文件和文件内容，并重新扫描

#### Scenario: 收起状态不显示刷新按钮
- **WHEN** 文件树模块处于收起状态
- **THEN** 刷新按钮 SHALL 不显示

#### Scenario: 刷新过程中显示加载状态
- **WHEN** 刷新触发文件树重新扫描
- **THEN** 文件树 SHALL 显示 loading 指示器，直到扫描完成或失败

#### Scenario: 扫描失败时恢复
- **WHEN** 文件树扫描 IPC 调用失败（如目录已删除、权限不足）
- **THEN** 系统 SHALL 将 loading 状态设为 false，显示空树或保留上次结果，不产生未捕获错误

### Requirement: 侧边栏展开/收起切换
系统 SHALL 提供一个 toggle 控件，允许用户展开或收起整个左栏（文件树+Markdown 预览）。

#### Scenario: 默认展开状态
- **WHEN** 应用首次启动且无持久化状态
- **THEN** 左栏 SHALL 处于展开状态，正常显示文件树和 Markdown 预览的分栏布局

#### Scenario: 收起左栏
- **WHEN** 用户点击 toggle icon 且左栏当前为展开状态
- **THEN** 左栏 SHALL 收起（宽度变为 0），终端面板占满全宽，左栏内的组件保持 DOM 挂载但不执行后台操作

#### Scenario: 展开左栏
- **WHEN** 用户点击 toggle icon 且左栏当前为收起状态
- **THEN** 左栏 SHALL 展开，恢复文件树与 Markdown 预览的分栏布局，并重新获取当前终端工作目录加载文件树

#### Scenario: Toggle icon 位置
- **WHEN** 应用渲染时（无论展开或收起状态）
- **THEN** toggle icon SHALL 使用绝对定位显示在应用顶部（macOS traffic lights 右侧），始终可见，使用面板展开/收起语义的图标

#### Scenario: 展开/收起状态持久化
- **WHEN** 用户切换展开/收起状态
- **THEN** 系统 SHALL 将当前状态保存到 `localStorage`，下次应用启动时恢复上次的状态

#### Scenario: 收起时保持 DOM 挂载
- **WHEN** 左栏收起
- **THEN** 左栏和右栏的子组件 SHALL 保持 DOM 挂载（不被卸载重建），避免终端重绘

### Requirement: 左栏收起时暂停资源消耗
当左栏处于收起状态时，系统 SHALL 停止所有与文件树相关的后台操作以节省资源。

#### Scenario: 不跟随终端目录变化
- **WHEN** 左栏处于收起状态且用户切换终端 Tab
- **THEN** 系统 SHALL 不更新文件树根目录，不发起目录读取请求

#### Scenario: 不读取目录内容
- **WHEN** 左栏处于收起状态
- **THEN** 系统 SHALL 不通过 IPC 发起任何目录读取操作

### Requirement: 文件树节点右键上下文菜单
系统 SHALL 为文件树中的文件和目录节点提供右键上下文菜单。

#### Scenario: 触发右键菜单
- **WHEN** 用户在文件树的某个文件或目录节点上右键点击
- **THEN** 系统 SHALL 在鼠标位置弹出一个上下文菜单

#### Scenario: 复制相对路径
- **WHEN** 用户在右键菜单中选择"复制相对路径"
- **THEN** 系统 SHALL 将该节点相对于文件树根目录的路径复制到剪贴板

#### Scenario: 复制绝对路径
- **WHEN** 用户在右键菜单中选择"复制绝对路径"
- **THEN** 系统 SHALL 将该节点的绝对路径复制到剪贴板

#### Scenario: 关闭右键菜单
- **WHEN** 右键菜单已显示，用户点击菜单外区域或选择了菜单项
- **THEN** 右键菜单 SHALL 立即关闭

#### Scenario: 菜单定位不超出文件树可视区域
- **WHEN** 用户在文件树面板右侧边缘附近触发右键菜单
- **THEN** 菜单 SHALL 调整弹出方向，确保完整显示在文件树面板的可视区域内
- **AND** 菜单 SHALL 不向相邻内容面板横向溢出

#### Scenario: 菜单定位回退到视口边界
- **WHEN** 文件树右键菜单未提供宿主面板边界信息
- **THEN** 菜单 SHALL 继续按当前视口边界规则进行避让，避免超出窗口可视区域

### Requirement: 文件树全量扫描性能优化
系统 SHALL 在需要全量扫描时优先使用 `fd` 命令，并在不可用时回退到 Node.js 遍历方案。

#### Scenario: 使用 fd 扫描 Markdown 文件
- **WHEN** 文件树需要扫描 Markdown 文件且系统检测到 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd -e md --type f` 扫描目录，将输出的文件路径列表解析为树结构返回

#### Scenario: fd 不可用时回退
- **WHEN** 文件树需要执行全量扫描且系统检测到 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到现有的 Node.js 递归遍历方案，功能不受影响

#### Scenario: 自动遵守 gitignore
- **WHEN** 使用 `fd` 扫描文件
- **THEN** 扫描结果 SHALL 自动排除 `.gitignore` 中指定的文件和目录（`fd` 默认行为）

### Requirement: 全部文件扫描 IPC 通道
系统 SHALL 提供扫描全部文件的 IPC 通道，支持返回指定目录下所有非隐藏文件的树结构。

#### Scenario: 使用 fd 扫描全部文件
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令可用
- **THEN** 系统 SHALL 执行 `fd --type f --no-hidden` 并排除常见大目录，将结果解析为树结构返回

#### Scenario: fd 不可用时回退
- **WHEN** 渲染进程请求扫描全部文件且 `fd` 命令不可用
- **THEN** 系统 SHALL 回退到 Node.js 递归遍历方案，排除隐藏文件、gitignore 文件和常见大目录

#### Scenario: spec 模式限定全量扫描范围
- **WHEN** 渲染进程以 spec 模式请求扫描全部文件并提供 spec 目录配置
- **THEN** 主进程 SHALL 只扫描配置的 spec 目录树，并返回对应的完整树结果

### Requirement: 右键菜单复制文件名
文件树节点右键菜单 SHALL 支持"复制文件名"操作。

#### Scenario: 菜单项显示
- **WHEN** 用户在文件树节点上右键点击
- **THEN** 上下文菜单 SHALL 包含"复制文件名"选项，位于"复制相对路径"之前

#### Scenario: 复制文件名
- **WHEN** 用户选择"复制文件名"菜单项
- **THEN** 系统 SHALL 将该节点的文件名（不含路径，例如 `readme.md`）复制到系统剪贴板

### Requirement: 右键菜单在访达中显示
文件树节点右键菜单 SHALL 支持"在访达中显示"操作，在系统文件管理器中定位该文件或目录。

#### Scenario: 菜单项显示
- **WHEN** 用户在文件树节点上右键点击
- **THEN** 上下文菜单 SHALL 包含"在访达中显示"选项，位于菜单末尾

#### Scenario: 在访达中显示文件
- **WHEN** 用户选择"在访达中显示"菜单项
- **THEN** 系统 SHALL 通过 IPC 调用 Electron 的 `shell.showItemInFolder` 打开系统文件管理器并选中该文件或目录

#### Scenario: IPC 通道
- **WHEN** 渲染进程请求在访达中显示某路径
- **THEN** 主进程 SHALL 提供 `fs:show-in-folder` IPC handler，调用 `shell.showItemInFolder(path)` 执行操作

### Requirement: 文件类型预览路由
文件预览面板 SHALL 根据选中文件的扩展名自动选择对应的预览组件进行渲染。

#### Scenario: Markdown 文件路由到 Markdown 预览
- **WHEN** 用户选中一个 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `MarkdownPreview` 组件渲染文件内容

#### Scenario: 代码文件路由到代码预览
- **WHEN** 用户选中一个非 `.md` 扩展名的文件
- **THEN** 系统 SHALL 使用 `CodePreview` 组件渲染文件内容，提供语法高亮

#### Scenario: 切换文件类型时预览组件切换
- **WHEN** 用户先选中一个 `.md` 文件，再选中一个 `.ts` 文件
- **THEN** 预览区 SHALL 从 Markdown 渲染模式无缝切换到代码高亮模式

### Requirement: 文件树内部分栏拖拽即时反馈
文件预览面板内部的文件树与预览区分栏 SHALL 在拖拽过程中即时更新宽度，不得让宽度或分隔条位置过渡动画造成拖拽滞后。

#### Scenario: 拖拽文件树分隔条时取消布局动画
- **WHEN** 用户按住文件树与文件预览区之间的分隔条并移动鼠标
- **THEN** 文件树宽度 SHALL 立即跟随鼠标位置更新
- **THEN** 文件树宽度、分隔条宽度和分隔条 margin SHALL 不应用 CSS transition

#### Scenario: 拖拽结束后恢复非拖拽态动画
- **WHEN** 用户释放文件树分隔条结束拖拽
- **THEN** 系统 SHALL 退出拖拽状态
- **THEN** 后续非拖拽的文件树展开 / 收起布局变化 MAY 继续使用短过渡动画

### Requirement: 文件树内部分栏比例持久化
文件预览面板 SHALL 保存用户拖拽后的文件树宽度比例，并在下次打开应用时恢复。

#### Scenario: 保存文件树宽度比例
- **WHEN** 用户拖拽文件树与文件预览区之间的分隔条并释放鼠标
- **THEN** 系统 SHALL 将调整后的文件树宽度比例保存到本地持久化缓存

#### Scenario: 恢复文件树宽度比例
- **WHEN** 用户已经调整过文件树宽度后重新打开应用
- **THEN** 文件预览面板 SHALL 使用上次保存的比例渲染文件树与预览区
- **THEN** 系统 SHALL 仍应用最小宽度约束，避免文件树或预览区恢复到不可用宽度

#### Scenario: 无缓存时使用默认文件树比例
- **WHEN** 用户首次打开应用且本地没有保存过文件树宽度比例
- **THEN** 文件预览面板 SHALL 使用当前内部分栏配置的默认比例

### Requirement: 文件树面板单独收起
文件预览面板 SHALL 支持通过 icon 单独收起文件树面板，使左侧文件预览模块只保留文件预览区域。内部文件树面板收起 SHALL 不注册快捷键，不复用用于收起整个文件系统模块的快捷键。

#### Scenario: 通过 icon 收起文件树面板
- **WHEN** 文件树面板处于展开状态，且用户点击文件树收起 icon
- **THEN** 文件树面板 SHALL 收起到零宽或近似零宽
- **THEN** 文件预览区域 SHALL 继续显示当前选中文件的预览内容

#### Scenario: 通过 icon 展开文件树面板
- **WHEN** 文件树面板处于收起状态，且用户点击文件树展开 icon
- **THEN** 文件树面板 SHALL 重新展开
- **THEN** 文件树面板 SHALL 恢复到收起前或本地缓存中的宽度比例

#### Scenario: 不通过快捷键切换内部文件树面板
- **WHEN** 用户按下用于收起整个文件系统模块的快捷键
- **THEN** 文件预览面板内部的文件树面板 SHALL 不单独响应该快捷键
- **THEN** 内部文件树面板的展开 / 收起状态 SHALL 只由文件预览面板内的 icon 切换

#### Scenario: 文件树收起时保留预览状态
- **WHEN** 用户收起文件树面板
- **THEN** 当前选中文件、文件内容和预览滚动区域 SHALL 不因文件树收起而被清空或重建

#### Scenario: 文件树收起时暂停目录读取
- **WHEN** 文件树面板处于收起状态
- **THEN** 系统 SHALL 不因终端 CWD 变化或 terminal tab 切换发起新的文件树目录读取请求

#### Scenario: 文件树展开时恢复 CWD 同步
- **WHEN** 文件树面板从收起状态重新展开
- **THEN** 系统 SHALL 获取当前活跃终端的工作目录
- **THEN** 文件树 SHALL 使用当前活跃终端工作目录恢复展示

#### Scenario: 文件树收起状态持久化
- **WHEN** 用户切换文件树面板展开 / 收起状态
- **THEN** 系统 SHALL 将当前状态保存到本地持久化缓存
- **THEN** 用户下次打开应用时，文件树面板 SHALL 恢复上次的展开 / 收起状态

### Requirement: 右侧预览区内容查找
系统 SHALL 在文件预览模块右侧预览区提供独立于文件树搜索的内容查找能力，用于搜索当前选中文件的预览文本。该能力在 Markdown 预览与其他文件预览中执行高亮和导航时 SHALL 保持渲染稳定性，不得因连续输入、快速导航或高亮更新导致预览区或主内容区渲染崩溃。

#### Scenario: 快捷键打开查找框
- **WHEN** 用户已在文件预览模块选中一个文件，且右侧预览区可见
- **THEN** 用户按下文件预览查找快捷键后，系统 SHALL 在右侧预览区顶部或覆盖层打开查找框
- **THEN** 查找框 SHALL 聚焦并允许用户立即输入搜索文本

#### Scenario: 输入关键词后高亮匹配
- **WHEN** 查找框处于打开状态，且用户输入搜索关键词
- **THEN** 系统 SHALL 在当前选中文件的预览内容中高亮所有文本匹配项
- **THEN** 系统 SHALL 标记一个当前匹配项，用于结果导航和定位

#### Scenario: 导航到上一个或下一个匹配项
- **WHEN** 查找框处于打开状态，且当前搜索结果数量大于 1
- **THEN** 用户触发“上一个”或“下一个”导航时，系统 SHALL 将当前匹配项切换到对应结果
- **THEN** 系统 SHALL 自动滚动预览区，使新的当前匹配项进入可视区域

#### Scenario: 无匹配结果
- **WHEN** 查找框处于打开状态，且当前关键词在预览内容中没有任何匹配
- **THEN** 系统 SHALL 保持查找框可见
- **THEN** 系统 SHALL 向用户展示 0 条结果状态，而不是关闭查找框

#### Scenario: 关闭查找框
- **WHEN** 查找框处于打开状态，且用户执行关闭操作
- **THEN** 系统 SHALL 关闭查找框
- **THEN** 系统 SHALL 清除当前文件预览中的查找高亮状态

#### Scenario: 切换文件时重置查找状态
- **WHEN** 查找框处于打开状态，且用户在文件树中切换到另一个文件
- **THEN** 系统 SHALL 关闭查找框
- **THEN** 系统 SHALL 清空旧文件的关键词、匹配结果和当前匹配项状态

#### Scenario: Markdown 预览连续输入保持稳定
- **WHEN** 当前选中文件为 Markdown 文件，且用户在查找框中快速连续输入或删除关键词
- **THEN** 系统 SHALL 持续更新当前文档中的查找高亮和结果状态
- **THEN** 系统 SHALL 不得因查找更新导致未捕获渲染错误、预览区空白或主内容区消失
