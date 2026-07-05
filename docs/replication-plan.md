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
- Temporary runtime crops may live under `assets/prototype-video-crops/` for MVP feasibility testing.
- Final release assets must be original/recreated and must replace the prototype video crops.

## Mobile Direction

Target landscape mobile first. Portrait is possible later, but the current combat model needs two thumbs: one for movement and one for aiming. Landscape keeps the room, enemies, arrows, and dodge button readable without covering the center playfield.

Controls:

- Left virtual joystick: movement.
- Right virtual joystick: bow direction and active attack.
- Right joystick hold: keep firing arrows at a fixed rhythm in the held direction.
- Right joystick drag: adjust aim direction while firing.
- Right joystick release: stop firing and keep the last facing direction.
- Right dodge button: dodge in current movement direction.
- If the player is not moving when dodge is pressed, dodge in the current aim/facing direction.

HUD layout:

- Hearts at top-left.
- Optional room/minimap chip at top-right.
- Left joystick fixed in bottom-left safe area.
- Right aim joystick fixed in bottom-right safe area.
- Dodge button sits above or inside the right thumb cluster, far enough from the aim joystick to avoid accidental presses.
- Keep the screen center and lower-middle playfield clear.

Combat implication:

- This is no longer pure auto-attack.
- MVP does not use player-controlled bow charge.
- Each arrow still plays a short procedural draw/release animation before firing.
- Enemy and room design should assume the player can aim while moving, but dodge has a cooldown and uses movement direction.
- Charge can return later as an upgrade, special attack, or sigil.

## MVP Visual Requirements

MVP must include the original video's procedural animation idea. This is not a polish-only phase.

Required:

- Player and enemies may use temporary video crops for MVP, but animation should still be driven by runtime transforms instead of full frame-by-frame sprite sheets.
- Squash/stretch animation uses sine-wave driven scale and rotation profiles.
- Idle, walk, shoot, hit, and dodge each have distinct animation profiles.
- Eyes track aim direction or target direction with clamped pupil offsets.
- Enemy eyes and body tilt should sell intent and impact.
- Bow attack uses a short automatic draw/release pose even without manual charge.
- Arrows have flight trails or small motion streaks.
- Arrow-wall and arrow-enemy hits spawn particles.
- Enemy death spawns particles.
- Dodge spawns ghost afterimages.
- Camera shake is present for hit, damage, dodge, and room clear events.
- The MVP room uses a reference-matching green floor, thick border, door/opening shapes, and scattered decorations.
- Door close, enemy spawn, enemy clear, and room clear feedback are required.

MVP can skip:

- Final exported PNG assets.
- Full room generation.
- Boss rooms.
- Sigil system.
- Manual charge depth.

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
  - drawn bow;
  - release pose;
  - arrow sprite;
  - hit marker or small burst.

Style goals:

- visible relaxed, draw, and release poses for automatic firing;
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
2. Mobile landscape layout.
3. Left virtual joystick movement.
4. Right virtual joystick aim and hold-to-fire.
5. Dodge button with cooldown and ghost trail.
6. One enemy: dart goober.
7. Arrow collision against walls and enemies.
8. Room clear state.
9. Procedural player/enemy animation.
10. Arrow, hit, death, dodge, and camera feedback.

Exit criteria:

- shooting feels readable;
- right-stick hold reliably fires in the intended direction;
- dodge follows movement direction and does not fight aiming;
- enemy movement is not perfectly robotic;
- roll can dodge or reposition;
- enemy can die and room can clear.
- the game still feels alive when using placeholder art because eyes, squash/stretch, particles, and camera feedback are active.

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

## Phase 5: Expanded Juice

MVP already includes baseline juice. After the core loop works, expand it:

- camera shake by event strength;
- bow-fire anticipation and release kick;
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
- `src/input/` mobile action mapper;
- `src/assets/manifest.ts` stable asset keys;
- a placeholder Bowbert drawn from our own shapes or recreated PNG;
- landscape virtual joystick UI;
- procedural animation profiles for player and Dart Goober;
- baseline particles and camera shake;
- one room and one enemy.

Reference images are already in `refs/asset-crops/`. They are only for visual analysis.
