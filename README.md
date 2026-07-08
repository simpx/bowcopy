# Bowcopy / Bowbert

一个学习用途的 roguelike 复刻实验。这个仓库的目的，是根据 YouTube 视频里的开发过程还原一个类似的小游戏，并验证这种做法是否真的可行：用极少量手工素材、程序化动画、参数化敌人、模板化房间和大量反馈效果，快速做出一个可玩的俯视角房间清怪 roguelike。

参考视频：Icoso 的 [I Made a Roguelike Game in 72 Hours!](https://www.youtube.com/watch?v=ju0LjRGAu5k)

本项目不是商业复刻，也不是最终素材生产仓库。它更像一个可运行的研究样机：先尽量贴近视频效果，把移动、射箭、怪物、房间、UI、音效和角色生产流程跑通，再判断后续是否值得继续扩展成原创游戏。

## 目标

- 复刻核心玩法循环：进入房间、关门、刷怪、清怪、开门、探索下一房间。
- 复刻核心手感：移动端双摇杆、持续射箭、翻滚、箭矢碰撞、受击、爆炸和房间反馈。
- 复刻低成本素材方案：AI base 图 + runtime 眼神/附件 + 程序化 squash/stretch + 粒子/VFX。
- 验证模板化房间和 DSL 房间路线是否足够支撑一个小型 roguelike 原型。
- 沉淀一套可复用的 character studio 流程，让后续角色可以从设定、生成、rig、tuning 到实机接入渐进完成。

## 当前状态

当前版本是一个 Phaser + TypeScript + Vite 原型，重点面向横屏手机操作：

- 左摇杆移动。
- 右摇杆瞄准并射箭；不动右摇杆时不自动攻击。
- 闪避按钮按移动方向翻滚，翻滚期间可以撞破部分孢子。
- 房间内会刷多波敌人，清理后可以进入下一个房间。
- 已接入的敌人包括 goober、蘑菇怪、炸弹怪、史莱姆和幽灵类原型。
- 角色资产放在 `assets/characters/<character-id>/`，每个目录尽量自描述，包含 base、rig、brief、tuning 和 playtest 截图。

本仓库仍处于验证阶段，很多数值、动画和怪物行为还在调试中。

## 运行

```bash
npm install
npm run dev -- --host 0.0.0.0
```

构建检查：

```bash
npm run build
```

## 角色 Studio

本项目自带一条人机协同的角色生产线,完整工作流见 **`docs/studio.md`**(配套 skill:`.claude/skills/bowcopy-studio/`)。核心组件:

- **工作台** `workbench.html`:all-in-one review 页面,由**游戏运行时同一份** sim + renderer 驱动;鼠标即玩家位置,受击/击杀/重生走真实命中路径,支持暂停/慢放;卡片内可**直接调参并保存回 rig.json**(唯一事实源,游戏直接读取);`?focus=<id>` 单角色聚焦。
- **AI 自审截图** `npm run studio:capture -- <id>`:自动驱动工作台输出 spawn/move/attack/hit/death 状态截图到角色 `playtest/states/`,AI 生成资产后先自己看图返工,再交人验收。
- **严格 QC** `npm run studio:qc`(纯标准库):透明背景、贴边检测、rig 尺寸一致性、状态证据、色板 vs 参考偏移、目录卫生,输出 `assets/characters/qc-report.json` 供工作台展示。
- **复用优先**:`assets/index.json` 资产索引(`python3 tools/index_assets.py` 重建)、`src/characters/eyeEmotionTemplates.ts` 三种已验证眼型模板、`src/render/feedback/particleBurst.ts` 共享粒子风格。
- **敌人套件注册表** `src/game/enemies/`:每个敌人一个自包含 kit(sim + 渲染 + 事件 + 数量公式 + 调试钩子),新敌人接入 = 1 个 kit 文件 + 注册 1 行 + 房间主题映射。

## 参考资料

所有从视频整理出来的资料放在 `refs/`：

- `refs/source.md`：视频来源、章节、采集说明。
- `refs/video-notes.md`：基于字幕和画面的中文时间线笔记。
- `refs/systems-breakdown.md`：面向实现的系统拆解。
- `refs/keyframes/`：少量低清关键帧和 contact sheet，仅作学习参考。
- `refs/asset-crops/`：主角、弓和敌人的低清裁切参考。
- `docs/replication-plan.md`：复刻实现路线。
- `docs/mvp-spec.md`：第一版可玩 MVP 规格。
- `docs/character-rig.md`：角色 rig、眼神模板和批量素材生产工作流。

注意：`refs/` 中的截图来自第三方视频，仅用于本学习仓库的研究索引，不应作为最终游戏素材发布或再分发。

MVP 可在 `assets/prototype-video-crops/` 临时使用视频抠图来验证复刻可行性；正式发布前必须替换成自制素材。参考图不进入最终游戏包。

## 资产生产流程

项目里的角色不是传统 sprite sheet 管线，而是采用更适合这个实验的分层方式：

- `base.png`：AI 生成或重绘后的基础角色图，通常包含身体、轮廓、眼白等稳定部分。
- `attachments/`：可以随 runtime 放置或旋转的附件，例如弓、帽子、特殊装饰。
- `rig.json`：角色参数,其中 `runtime` 段是游戏直接读取的唯一事实源(scale、gaze、motion、attack/vfx 等);调参在工作台页面完成并写回。
- `playtest/`：实机截图、对比图和 review 证据。

原则是：base 图负责稳定外形，runtime 负责眼神、表情、弹性动作、攻击特效和反馈。这样可以避免为每个动作都画完整 sprite，同时保留比较强的手感和表情变化。

## 随仓库保存的 Skills

Claude Code 与 Codex 共用同一套 studio SOP:

- 权威工作流:`docs/studio.md`;项目约定速查:`CLAUDE.md`。
- skill 入口(两边内容相同):`.claude/skills/bowcopy-studio/` 与 `.codex/skills/bowcopy-studio/`。
- 生产知识(踩坑记录,如武器不烘进主角 base、孢子/拖尾不烘进蘑菇 base、斜切眼白在 base 阶段确定):`docs/studio/prompt-rules.md`、`docs/studio/qc-failures.md`、`docs/studio/quality-rubric.md`。

## 计划中的游戏结构

### 玩家

- 横屏移动端优先：左虚拟摇杆移动，右虚拟摇杆瞄准并按住持续射箭。
- 右手闪避按钮按当前移动方向翻滚；不移动时按当前朝向翻滚。
- MVP 先不做手动蓄力，但每次射箭仍有短暂拉弓/释放动画。
- 玩家眼睛轻微跟随瞄准方向。
- 通过正弦波驱动 idle、walk、roll 等 squash/stretch 动画。
- 射箭、命中、死亡、闪避和清房间都要有粒子、残影或镜头反馈。

### 敌人

- 基础远程怪：朝玩家方向移动，带随机偏角，停下后发射弹体。
- 参数变体：复用同一个 AI，只改速度、血量、体型或弹幕。
- 蘑菇怪：发射停留型孢子，形成区域威胁。
- 史莱姆：跳跃移动，死亡后分裂成小史莱姆。
- 炸弹怪：追逐玩家，进入引爆状态，可被箭提前触发，爆炸范围内敌人死亡。
- 幽灵怪：短暂现身并发射多发弹体，隐身时不可命中。

### 地牢

- 用像素图或二维数组描述地图骨架。
- 颜色或符号代表不同房间类型：起点、普通房、商店/巫师房、Boss 房。
- 房间模板根据相邻方向决定开口和门。
- 同类房间随机挑选模板，装饰物位置、翻转和出现概率随机化。
- 玩家进入房间中心触发刷怪；清空敌人后解锁门。

### 成长

- 巫师房给出随机 power-up。
- power-up 以“增强 + 轻微代价”的形式改变玩法。
- 示例：三连射但冷却更长、移动更快但生命更少、箭矢穿透但蓄力时移动变慢。

## 后续实现路线

1. 建立最小可运行项目：窗口、移动端输入、玩家移动。
2. 做移动端横屏布局、左移动摇杆、右瞄准摇杆。
3. 做右摇杆按住持续射箭与箭矢碰撞。
4. 加入闪避按钮、无敌窗口和残影。
5. 完成程序化动画：眼睛朝向、形变、攻击姿态、受击反应。
6. 做基础粒子和镜头反馈。
7. 做房间模板、门状态和清怪循环。
8. 加入巫师房和 power-up。
9. 扩展地图、Boss 和更多房间类型。

## 项目边界

这是学习项目，代码和自制素材可以自由迭代；第三方视频、截图和原始素材只作为参考，不进入最终发布包。
