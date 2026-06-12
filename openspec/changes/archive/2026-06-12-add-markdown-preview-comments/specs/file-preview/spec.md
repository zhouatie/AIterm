## ADDED Requirements

### Requirement: Markdown 预览划线评论
系统 SHALL 允许用户在 Markdown 文件预览中基于当前可见文本选区创建、查看、编辑和删除划线评论。评论 SHALL 作为独立批注数据保存，不 SHALL 直接改写源 Markdown 正文。

#### Scenario: 通过文本选区创建评论
- **WHEN** 用户在 `.md` 文件预览正文中选择一段非空文本并触发添加评论操作
- **THEN** 系统 SHALL 打开评论输入界面，允许用户为该选区输入评论内容
- **AND** 用户确认后，系统 SHALL 为该选区创建一条评论记录

#### Scenario: 拒绝无效选区
- **WHEN** 用户未选择文本、只选择空白文本，或选区不完全位于当前 Markdown 预览正文内
- **THEN** 系统 SHALL 不创建评论
- **AND** 系统 SHALL 不改变当前 Markdown 文件内容

#### Scenario: 显示已评论文本
- **WHEN** 当前 Markdown 文件存在可定位的评论锚点
- **THEN** 系统 SHALL 在对应预览文本上显示划线或等效批注高亮
- **AND** 系统 SHALL 为该评论显示可点击的评论标记或等效入口

#### Scenario: 查看评论内容
- **WHEN** 用户点击已评论文本对应的评论标记或等效入口
- **THEN** 系统 SHALL 显示该评论的正文内容
- **AND** 系统 SHALL 标识当前正在查看的评论所对应的文本范围

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
系统 SHALL 保持 Markdown 划线评论与现有预览查找、标题树导航、GFM checkbox 写回和普通滚动浏览互不破坏。

#### Scenario: 预览查找与评论高亮共存
- **WHEN** 当前 Markdown 文件同时存在评论划线和预览查找关键词匹配
- **THEN** 系统 SHALL 同时展示评论标记和查找匹配状态
- **AND** 查找上一个/下一个匹配的导航 SHALL 继续滚动到当前匹配项

#### Scenario: 标题树导航保持可用
- **WHEN** 当前 Markdown 文件存在评论且用户点击标题树中的标题项
- **THEN** Markdown 预览滚动容器 SHALL 滚动到对应标题位置
- **AND** 系统 SHALL 保持当前文件的评论数据与评论标记可用

#### Scenario: GFM checkbox 写回保持可用
- **WHEN** 当前 Markdown 文件存在评论且用户点击 GFM task checkbox
- **THEN** 系统 SHALL 继续按现有规则切换对应任务 marker 并写回源 Markdown 文件
- **AND** 系统 SHALL 在预览重新渲染后重新计算评论锚点与评论标记

#### Scenario: 评论不改变普通 Markdown 渲染
- **WHEN** 当前 Markdown 文件包含 GFM 表格、删除线、链接、代码块或图片
- **THEN** 系统 SHALL 继续按现有 Markdown 预览规则渲染这些内容
- **AND** 评论功能 SHALL 不向 Markdown 渲染结果插入会破坏这些元素语义的额外文本内容
