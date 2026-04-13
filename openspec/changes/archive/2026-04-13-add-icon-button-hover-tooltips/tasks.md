## 1. 共享 Tooltip 能力

- [x] 1.1 新增统一的 icon 按钮 tooltip 文案 helper，支持“基础功能说明 + 可选快捷键动作”生成最终提示文案
- [x] 1.2 复用现有快捷键绑定与格式化能力，确保 tooltip 读取的是当前生效绑定而不是默认值

## 2. 各模块按钮接入

- [x] 2.1 更新 `src/App.tsx` 的标题栏 icon 按钮 tooltip，覆盖文件树显隐和主题切换按钮
- [x] 2.2 更新 `src/components/FileTree.tsx` 的 icon 按钮 tooltip，覆盖刷新与展开/收起按钮，并保持 `spec` 文字按钮不纳入本次范围
- [x] 2.3 更新 `src/components/TerminalPanel.tsx` 的 icon 按钮 tooltip，覆盖新建 workspace、新建 terminal tab、关闭 terminal tab、terminal 侧边栏收起/展开按钮
- [x] 2.4 更新 `src/components/SettingsPanel.tsx` 的关闭 icon 按钮 tooltip，并与共享 helper 保持一致

## 3. 快捷键联动与交互验证

- [x] 3.1 验证文件树显隐按钮和 terminal 侧边栏显隐按钮会随当前状态显示正确的操作说明
- [x] 3.2 验证带快捷键的 icon 按钮会在 tooltip 文案末尾展示当前生效快捷键，且设置面板改绑保存后会同步更新
- [x] 3.3 验证没有快捷键的 icon 按钮仍会显示功能说明，且非 icon 按钮不会被错误纳入本次 tooltip 规则
