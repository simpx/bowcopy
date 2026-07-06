# Character Rig Workflow

角色素材不是单张 PNG，而是由 base image 和一份 rig 参数共同组成。

## Rig 的职责

`rig` 是程序化渲染说明书，负责描述：

- base 图的位置、尺寸、缩放和阴影。
- 眼睛类型、眼睛中心、半径、旋转和可用表情。
- 弓、帽子、鞋子等附件未来应该挂在哪里。
- idle、walk、attack、hit 等动作参数。

当前代码里 rig 先用 TypeScript 模块承载：

- `src/characters/rigSchema.ts`
- `src/characters/bowbertRig.ts`
- `src/characters/dartGooberRig.ts`

这样可以保留 TypeScript 的 literal key 推断，renderer 仍能得到精确的表情类型。以后需要批量生产素材时，可以再增加 JSON 导入/导出工具。

## 眼睛类型

不同角色不能共用同一套眼神模板。

- `round-external`：Bowbert 这种大圆白眼，适合 runtime 黑瞳、弯弧、横线、X、斜压线。
- `angry-embedded`：Dart Goober 这种嵌入式怒眼，适合 `cut-ellipse` 怒眼块、缩瞳、受击小斜点。

AI 自动识别素材时，首先应该输出眼睛 archetype，再选择对应的表情模板。

## 运行时入口

游戏 runtime 仍然从 `src/render/characters/layeredCharacterConfig.ts` 读取角色配置。这个文件现在只负责：

1. 导入角色 rig。
2. 绑定 Vite 解析后的图片 URL。
3. 保持旧 renderer 的导入路径稳定。

后续 renderer 和调参页应逐步直接围绕 rig schema 工作。
