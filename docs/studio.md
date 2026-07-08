# Bowcopy Studio:人机协同的角色生产线

这个项目的"studio"是一套围绕本项目角色特点(眼睛表达情绪、固定 base 图 + runtime 形变、附件分层、少量可复用特效)搭建的工具链。目标:**人只在需要品味判断的时刻出现**——选参考、验收、微调;其余由 AI 借助下面的工具自主完成并自我审查。

## 三阶段工作流

### 阶段 1:创意 → 设定(人机高频交互)

1. 讨论创意,确定角色的角色定位、行为模式(goober / shroom / hopper / bomb / ghost 或新模式)、眼型(三选一)、攻击与特效。
2. AI 生成概念图(或人提供截图),候选放进 `assets/characters/<id>/source/`。
3. 人选定参考图后,AI 把决定落盘到 `brief.md` frontmatter:`lockedReference`、`status: reference-locked`。
4. **决策必须落文件,不依赖聊天记录。**

产出:`brief.md`(设定 + prompt packets)+ `source/` 参考图。

### 阶段 2:AI 自主生产 + 自我审查(人只做验收与微调)

AI 依次执行,不需要人在场:

1. **查复用**:读 `assets/index.json`(过期则 `python3 tools/index_assets.py` 重建),优先复用现成弹体 / 特效 / 音效 / 眼神模板(`src/characters/eyeEmotionTemplates.ts`)、粒子风格(`src/render/feedback/particleBurst.ts`)。
2. **生成资产**:按 brief 中的 prompt packet 生图,候选进 `candidates/`,验收后成为 `base.png`,并排图存 `comparison.png`。
3. **填 rig**:runtime 数值写进 `assets/characters/<id>/rig.json` 的 `runtime` 段(**唯一事实源**,游戏直接 import)。
4. **机器 QC**:`npm run studio:qc`——透明背景、贴边、尺寸一致性、状态证据、色板偏移、目录卫生。错误必须清零。
5. **自我目检**:`npm run studio:capture -- <id>`——用真实 runtime 渲染 spawn / move / attack / hit / death 各状态截图到 `playtest/states/`,AI 自己看图对照 quality rubric,不合格就返工。
6. **交人验收**:人打开 workbench(见下),看的就是实机效果;可在页面里直接微调数值并保存。

产出:完整的角色文件夹 + 通过 QC + 状态截图证据。

### 阶段 3:接入游戏

1. 写一个套件文件 `src/game/enemies/<id>Kit.ts`(参照现有 kit:sim 系统 + 渲染器 + 事件路由 + encounter 数量公式 + 调试钩子)。
2. 在 `src/game/enemies/index.ts` 注册一行。
3. 在 `CombatRoomScene.getCurrentEncounterKind()` 里映射房间主题(或先用 `?encounter=<kind>` 调试 URL)。
4. `npm run build` 通过 + `?encounter=<kind>` 截图作为 playtest 证据 → `brief.md` 状态推进到 `playtested`。

## 工作台(人类的主界面)

```bash
npm run dev
# http://localhost:5173/workbench.html        全角色 review
# http://localhost:5173/workbench.html?focus=<id>   单角色大图
```

- 所有角色由**游戏同一份 sim + renderer** 驱动;鼠标 = 玩家位置,注视/瞄准实时跟随。
- 每卡片:受击 / 击杀 / 重生(真实命中路径)、状态 chip(brief.md)、QC 结果、对比图、遗留事项。
- **调参**:展开数值面板,改动即时生效,`保存到 rig.json` 直接写回唯一事实源——人微调不经过 AI 转录。
- 暂停 / 0.25x 慢放逐帧看形变与特效。

## 命令速查

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 游戏 `/` + 工作台 `/workbench.html` |
| `npm run studio:qc` | 严格 QC,生成 `assets/characters/qc-report.json` |
| `npm run studio:capture -- <id>` | 状态截图(AI 自审用);`--all` 全量 |
| `python3 tools/index_assets.py` | 重建复用资产索引 `assets/index.json` |
| `node tools/sync_rigs.mjs` | 把仍写在 TS 里的 rig 值导出到 rig.json(引导用) |
| `npm run build` | 类型检查 + 构建(接入后的硬性门槛) |
| `/?encounter=<kind>` | 游戏内调试指定遭遇;`&effect=explosion\|spore\|damage`、`&split=1`、`&variant=red\|purple` |

## 参考文档(按环节阅读)

- `docs/studio/prompt-rules.md`:生图 prompt packet 写法。
- `docs/studio/qc-failures.md`:已知的美术失败模式,验收生成图前必读。
- `docs/studio/quality-rubric.md`:交人 review 前角色要达到的质量线。

## 唯一事实源约定

| 内容 | 位置 |
| --- | --- |
| runtime 数值(scale/眼/动作/攻击) | `assets/characters/<id>/rig.json` 的 `runtime` 段 |
| 状态与遗留事项 | `brief.md` frontmatter(`status` 只存这里) |
| 眼神情绪模板 | `src/characters/eyeEmotionTemplates.ts` |
| 粒子 burst 风格 | `src/render/feedback/particleBurst.ts` |
| 敌人游戏接入 | `src/game/enemies/<id>Kit.ts` + 注册表 |
| 可复用资产清单 | `assets/index.json`(生成物) |

## 状态门(必须有证据才能推进)

`brief` → `reference-locked`(lockedReference 存在)→ `asset-generated`(base.png + comparison.png)→ `rigged`(rig.json runtime 填好)→ `tuned`(workbench 里人验收过)→ `runtime-integrated`(kit + build 通过)→ `playtested`(playtest/ 有实机截图)→ `done`。

QC 会检查状态与证据是否匹配;`tuned` 及以上缺 comparison.png 会告警,`playtested` 缺 playtest 截图直接报错。
