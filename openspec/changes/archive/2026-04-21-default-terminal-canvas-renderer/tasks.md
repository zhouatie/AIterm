## 1. Renderer 默认行为调整

- [x] 1.1 调整终端 renderer 偏好读取逻辑，在不存在已保存值时默认关闭“优先尝试 WebGL renderer”
- [x] 1.2 更新终端初始化流程，使默认路径先尝试 Canvas renderer，Canvas 不可用时回退到 DOM，且在用户显式开启 WebGL 时继续保留 WebGL → Canvas → DOM 链路

## 2. 设置面板更新

- [x] 2.1 更新设置面板中的终端 renderer 配置默认展示状态，使首次打开时默认显示为关闭 WebGL
- [x] 2.2 在终端 renderer 配置区增加明确说明文案，标注 WebGL 有已知 bug（页面乱码）

## 3. 验证

- [x] 3.1 验证无已保存偏好时，新建终端默认使用 Canvas renderer
- [x] 3.2 验证显式开启 WebGL 后，新建或重新初始化终端会尝试 WebGL，并在失败时回退到 Canvas 或 DOM
