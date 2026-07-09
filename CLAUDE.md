# Bowcopy 项目约定

学习用途的 Phaser + TypeScript 俯视角 roguelike。角色生产工作流见 `docs/studio.md`(唯一 SOP,Claude/Codex 共用,skill 名 `bowcopy-studio`)。

## 硬性规则

- 角色 runtime 数值只存 `assets/characters/<id>/rig.json` 的 `runtime` 段;`src/characters/*Rig.ts` 是只读 shim,禁止写回字面量。
- 角色状态与决策只存 `brief.md` frontmatter;不要在 rig.json 里加 `status`。
- 人不直接写 rig.json/brief.md:workbench 里的调参和文字意见都进 `assets/characters/review-inbox.md`(建议,非决策),由 AI 逐条评估后选择性写回并清空 inbox。
- 生成新资产前先查 `assets/index.json` 复用;眼神从 `src/characters/eyeEmotionTemplates.ts` 模板起步;粒子用 `src/render/feedback/particleBurst.ts`。
- 新敌人接入 = `src/game/enemies/<id>Kit.ts` + 注册表一行 + 地牢蓝图钉房(`assets/rooms/room-theme-kit.json` 的 `dungeonDsl.legend`,`encounter`/`budget` 字段);不要把敌人逻辑写进 CombatRoomScene。
- 提交前:`npm run build` 必须通过;改了角色资产要跑 `npm run studio:qc`(错误必须清零)并用 `npm run studio:capture -- <id>` 自查截图。
- 资产提交与代码提交分开;资产提交信息写明状态推进(如 `red-shroom: rigged -> tuned`)。
- `playtest/states/`、`qc-report.json`、`index.json`、`review-inbox.md` 是生成物/中间产物,不进 git。

## 常用命令

- `npm run dev` — 游戏 `/` + 工作台 `/workbench.html`(review 与调参入口)
- `npm run studio:qc` / `npm run studio:capture -- <id>` / `python3 tools/index_assets.py`
- 调试遭遇:`/?encounter=<kind>`(kind 见 `src/game/enemies/EnemyKit.ts`);逐房评审:`/?debugroom=X,Y`,设初始血量:`/?debughp=N`
