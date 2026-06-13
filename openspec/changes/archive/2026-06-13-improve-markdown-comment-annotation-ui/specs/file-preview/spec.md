## MODIFIED Requirements

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
