import Phaser from 'phaser';

import slimeParentBaseUrl from '../../../assets/characters/slime-parent/base.png';
import slimeBaseUrl from '../../../assets/characters/slime/base.png';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { SLIME_PARENT_RIG } from '../../characters/slimeParentRig';
import { SLIME_RIG } from '../../characters/slimeRig';
import type { SimVector } from '../../sim/player';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import type { SlimeEnemy, SlimeEvent, SlimeRole } from '../../sim/enemies';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface SlimeVisual {
  readonly role: SlimeRole;
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
}


const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xb3f46c, 0x64ba4a, 0xfff3b1] as const;
const HIT_COLORS = [0xfff1b5, 0xb3f46c] as const;
const LAND_COLORS = [0x83d558, 0x486f3e] as const;
const DEATH_COLORS = [0xb3f46c, 0x64ba4a, 0x111111] as const;

type SlimeRig = typeof SLIME_RIG | typeof SLIME_PARENT_RIG;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));



const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadSlimeAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(SLIME_RIG.base.textureKey)) {
    scene.load.image(SLIME_RIG.base.textureKey, slimeBaseUrl);
  }

  if (!scene.textures.exists(SLIME_PARENT_RIG.base.textureKey)) {
    scene.load.image(SLIME_PARENT_RIG.base.textureKey, slimeParentBaseUrl);
  }
};

export class SlimeRenderer {
  private readonly visuals = new Map<number, SlimeVisual>();
  private readonly bursts: ParticleBurstPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, { ...HOUSE_BURST_STYLE, ...{ riseMin: 4, riseMax: 22, gravity: 80 } });
  }

  create() {
    this.bursts.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly SlimeEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.bursts.update(deltaMs);
  }

  playEvents(events: readonly SlimeEvent[]) {
    for (const event of events) {
      if (event.type === 'slime-spawned') {
        this.bursts.emit(event.position, 10, SPAWN_COLORS, 28, 72, 4.2, 220);
        continue;
      }

      if (event.type === 'slime-landed') {
        this.bursts.emit(event.position, 8, LAND_COLORS, 18, 46, 3.2, 170);
        continue;
      }

      if (event.type === 'slime-hit') {
        this.bursts.emit(event.position, 7, HIT_COLORS, 30, 76, 3.5, 180);
        continue;
      }

      if (event.type === 'slime-killed') {
        this.bursts.emit(event.position, 28, DEATH_COLORS, 58, 142, 5.5, 360);
      }
    }
  }

  destroy() {
    this.bursts.destroy();
    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }
    this.visuals.clear();
  }

  private syncEnemies(timeMs: number, enemies: readonly SlimeEnemy[]) {
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);
      let visual = this.visuals.get(enemy.id);

      if (visual && visual.role !== enemy.role) {
        visual.container.destroy();
        this.visuals.delete(enemy.id);
        visual = undefined;
      }

      visual ??= this.createVisual(enemy.id, enemy.role);
      this.updateVisual(timeMs, enemy, visual);
    }

    for (const [id, visual] of this.visuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.visuals.delete(id);
      }
    }
  }

  private createVisual(id: number, role: SlimeRole): SlimeVisual {
    const rig = this.getRig(role);
    const shadow = this.scene.add.ellipse(
      0,
      rig.base.shadow.y,
      rig.base.shadow.width,
      rig.base.shadow.height,
      0x07120d,
      0.3
    );
    const body = this.scene.add.image(0, 0, rig.base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, rig.base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { role, container, shadow, artLayer, body, eyes };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: SlimeEnemy, visual: SlimeVisual) {
    const rig = this.getRig(enemy.role);
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const idleWave = Math.sin(timeMs * 0.004 + enemy.id);
    const squash = enemy.squash + idleWave * rig.motion.idleWobble;
    const scaleX = 1 + squash + hitFlash * rig.motion.hitScaleX;
    const scaleY = 1 - squash - hitFlash * rig.motion.hitScaleY;

    visual.container.setPosition(enemy.position.x, enemy.position.y - enemy.airHeight);
    visual.container.setDepth(68 + enemy.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setPosition(0, rig.base.shadow.y + enemy.airHeight);
    visual.shadow.setScale(0.82 + spawnEase * 0.18 + enemy.moveAmount * 0.12, 1);
    visual.shadow.setAlpha((0.14 + spawnEase * 0.18) * (1 - clamp01(enemy.airHeight / 90) * 0.38));

    visual.artLayer.setPosition(
      0,
      rig.base.y +
        idleWave * rig.motion.idleBob +
        Math.sin(enemy.walkPhase) * enemy.moveAmount * 2.2
    );
    visual.artLayer.setScale(rig.base.scale * scaleX, rig.base.scale * scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xf5ffd5 : 0xffffff);
    this.drawSlimeEyes(visual.eyes, rig, normalize(enemy.facing), enemy.phase === 'jumping');
  }

  private drawSlimeEyes(
    graphics: Phaser.GameObjects.Graphics,
    rig: SlimeRig,
    facing: SimVector,
    jumping: boolean
  ) {
    const expressions = resolveEyeExpressions(rig.gaze.emotions);
    const expression = (jumping ? expressions.alert : undefined) ?? expressions.default;

    graphics.clear();

    for (const name of ['left', 'right'] as const) {
      drawRuntimeEye(graphics, name, rig.gaze.eyes[name], rig.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: rig.gaze.pupilOffsetScale.x,
        offsetScaleY: rig.gaze.pupilOffsetScale.y,
        timeMs: 0
      });
    }
  }

  private getRig(role: SlimeRole): SlimeRig {
    return role === 'parent' ? SLIME_PARENT_RIG : SLIME_RIG;
  }
}
