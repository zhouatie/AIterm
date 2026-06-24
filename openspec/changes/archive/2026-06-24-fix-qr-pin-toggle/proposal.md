## Why

二维码工具当前在文本固定后，主操作仍然表现为“固定/更新固定时间”，用户无法从当前上下文直接取消固定，容易形成“固定后无法取消固定”的体验问题。

## What Changes

- 当当前二维码文本已存在于固定常驻链接时，主固定操作 SHALL 切换为取消固定操作。
- 取消固定当前文本 SHALL 从固定常驻链接中移除对应项，同时保留当前输入和同文本最近生成记录。
- 当前文本已固定时，主操作不再用于重复固定或更新时间。
- 固定列表内已有的取消固定入口保持可用。
- 二维码生成、复制 SVG、最近记录保存和固定项持久化行为保持不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `utility-tools`: 明确二维码工具当前文本已固定时，主固定操作应允许取消固定。

## Impact

- 主要影响 `src/components/UtilityToolsPanel.tsx` 的二维码工具固定/取消固定交互。
- 更新 `openspec/specs/utility-tools/spec.md` 对应的二维码固定常驻链接规格。
