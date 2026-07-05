# Replication Plan

这个计划的目标是复刻视频里的做法，而不是复制它的最终素材。我们先做一套自制的 Bowbert 风格资产，再实现可玩的房间清怪 roguelike。

## Stack

默认建议使用 Phaser 3 + TypeScript + Vite。

理由：

- 这是 2D 俯视角、sprite/shape 驱动的动作游戏。
- Phaser 已经提供输入、相机、sprite、碰撞、粒子、场景等基础设施。
- HUD 和菜单可以放在 DOM 层，战斗场景放在 canvas。
- 后续如果要做 tilemap 或房间模板，Phaser 的工具链也比较直接。

## Architecture Rules

- Simulation owns gameplay state: player stats, enemies, projectiles, room state, timers, collisions, sigils.
- Renderer owns visuals: sprites, squash/stretch transforms, camera shake, particles, UI feedback.
- Asset keys come from manifests, not raw filenames.
- Reference crops in `refs/asset-crops/` are not runtime assets.
- Final game assets must live under `assets/` and be original/recreated.

## Phase 1: Asset Targets

先做最小可玩所需资产。

### Player

- `assets/characters/bowbert/`
- Needed:
  - body base;
  - eyes/pupils layer;
  - idle pose;
  - walk/squash profile values;
  - roll ghost silhouette or tint variant;
  - optional hat layer.

Style goals:

- simple round/bean body;
- thick dark outline;
- large readable eyes;
- small asymmetry so it feels handmade;
- animation mostly procedural, not frame-heavy.

### Bow

- `assets/weapons/bow/`
- Needed:
  - relaxed bow;
  - half-drawn bow;
  - fully drawn bow;
  - arrow sprite;
  - hit marker or small burst.

Style goals:

- three visible charge states;
- readable at small size;
- rotate around player hand/side pivot.

### Basic Enemies

- `assets/enemies/dart_goober/`
  - square/wood body, leafy top, blue facial lines, angry eyes.
- `assets/enemies/dart_tri_goober/`
  - triangular version, same family, slightly faster.
- `assets/enemies/red_shroom/`
  - red mushroom body, two antenna caps, spore attack.
- `assets/enemies/purple_shroom/`
  - purple spiky mushroom, stronger spore attack.
- `assets/enemies/slime/`
  - blue blob, hop movement, optional small slimelet variant.
- `assets/enemies/kaboomlet/`
  - black round bomb body, fuse/star marker, armed flash states.
- `assets/enemies/spooper_gooper/`
  - dark ghost body, big eyes, visible/invisible states.

## Phase 2: Gameplay MVP

MVP scope:

1. Single room.
2. Player movement and mouse aim.
3. Bow charge and arrow firing.
4. Dodge roll with cooldown and ghost trail.
5. One enemy: dart goober.
6. Arrow collision against walls and enemies.
7. Room clear state.

Exit criteria:

- shooting feels readable;
- enemy movement is not perfectly robotic;
- roll can dodge or reposition;
- enemy can die and room can clear.

## Phase 3: Room Loop

Add the core roguelike loop:

1. Load a small blueprint map.
2. Generate connected rooms from the blueprint.
3. Open/close doors based on combat state.
4. Trigger enemy spawn when player enters the room center.
5. Clear room unlocks exits.

Initial blueprint can be a character grid:

```txt
..P..
.NNN.
PNYNP
.NNN.
..B..
```

Legend:

- `Y`: start room
- `N`: normal room
- `P`: wizard/power-up room
- `B`: boss placeholder
- `.`: empty

## Phase 4: Enemy Expansion

Add enemies in this order:

1. Dart Tri Goober: same ranged AI, different stats.
2. Red Shroom: stationary hazard spores.
3. Purple Shroom: stronger spore variant.
4. Slime: hop movement and split/spawn slimelets.
5. Kaboomlet: chase, arm, explode, chain-kill enemies.
6. Spooper Gooper: visible attack window and invisibility.

Rule: every new enemy should reuse at least one existing system. If a monster requires a completely separate architecture, it waits.

## Phase 5: Juice

Add feedback systems after the core loop works:

- camera shake by event strength;
- bow-charge zoom and vignette;
- arrow hit particles;
- spawn particles;
- death particles;
- explosion ring;
- health UI wiggle and flash;
- short hit stop for strong impacts.

## Phase 6: Power-Ups

Add wizard room and sigils:

- Triple Shot: three arrows, longer cooldown.
- Zoomsters: higher speed, lower max hearts.
- Piercer: arrows pierce, charging slows movement.
- Arrow Fringe: extra random arrow on shoot.
- Peaceful: chance for room to spawn no monsters.
- Silly Hatter: cosmetic hat.

Power-up implementation should modify player stats and event hooks, not hardcode special cases into weapon code.

## First Implementation Cut

When we start coding, the first commit should create:

- Vite + TypeScript + Phaser project;
- `src/game/` scene bootstrap;
- `src/sim/` gameplay state;
- `src/assets/manifest.ts` stable asset keys;
- a placeholder Bowbert drawn from our own shapes or recreated PNG;
- one room and one enemy.

Reference images are already in `refs/asset-crops/`. They are only for visual analysis.
