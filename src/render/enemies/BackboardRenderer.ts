import Phaser from 'phaser';

import backboardBaseUrl from '../../../assets/characters/backboard/base.png';
import { BACKBOARD_RIG } from '../../characters/backboardRig';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import type { SimVector } from '../../sim/player';
import type { BackboardEnemy, BackboardEvent } from '../../sim/enemies';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface BackboardVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Ellipse;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xc98a4b, 0x8a5a2b, 0xfff3b1] as const;
const HIT_COLORS = [0xfff1b5, 0xc98a4b] as const;
const REFLECT_COLORS = [0xffd75d, 0xfff8df, 0xc98a4b] as const;
const DEATH_COLORS = [0xc98a4b, 0x6b421f, 0x111111] as const;
const GLOW_COLOR = 0xffd75d;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadBackboardAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(BACKBOARD_RIG.base.textureKey)) {
    scene.load.image(BACKBOARD_RIG.base.textureKey, backboardBaseUrl);
  }
};

export class BackboardRenderer {
  private readonly visuals = new Map<number, BackboardVisual>();
  private readonly bursts: ParticleBurstPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, {
      ...HOUSE_BURST_STYLE,
      ...{ riseMin: 4, riseMax: 24, gravity: 90 }
    });
  }

  create() {
    this.bursts.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly BackboardEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.bursts.update(deltaMs);
  }

  playEvents(events: readonly BackboardEvent[]) {
    for (const event of events) {
      if (event.type === 'backboard-spawned') {
        this.bursts.emit(event.position, 10, SPAWN_COLORS, 28, 74, 4.2, 220);
        continue;
      }

      if (event.type === 'backboard-reflected') {
        this.bursts.emit(event.origin, 9, REFLECT_COLORS, 46, 120, 3.4, 200);
        continue;
      }

      if (event.type === 'backboard-hit') {
        this.bursts.emit(event.position, 7, HIT_COLORS, 30, 76, 3.4, 180);
        continue;
      }

      if (event.type === 'backboard-killed') {
        this.bursts.emit(event.position, 26, DEATH_COLORS, 56, 140, 5.2, 360);
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

  private syncEnemies(timeMs: number, enemies: readonly BackboardEnemy[]) {
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);

      const visual = this.visuals.get(enemy.id) ?? this.createVisual(enemy.id);

      this.updateVisual(timeMs, enemy, visual);
    }

    for (const [id, visual] of this.visuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.visuals.delete(id);
      }
    }
  }

  private createVisual(id: number): BackboardVisual {
    const { base } = BACKBOARD_RIG;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.3
    );
    const glow = this.scene.add.ellipse(0, base.y, 74, 108, GLOW_COLOR, 0);
    const body = this.scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, glow, artLayer]);
    const visual = { container, shadow, artLayer, body, eyes, glow };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: BackboardEnemy, visual: BackboardVisual) {
    const { base, motion } = BACKBOARD_RIG;
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const phaseProgress = clamp01(enemy.phaseElapsedMs / Math.max(1, enemy.phaseDurationMs));
    const walkWave = Math.sin(enemy.walkPhase) * enemy.moveAmount;
    const idleWave = Math.sin(timeMs * 0.004 + enemy.id);

    let squashX = walkWave * motion.walkSquash + idleWave * motion.idleSquash;
    let squashY = -squashX;
    let shiver = 0;

    if (enemy.phase === 'brace') {
      // Plant down: pre-parry squash.
      squashX += 0.1 * phaseProgress;
      squashY -= 0.14 * phaseProgress;
    } else if (enemy.phase === 'parry') {
      // Broadside: wider, trembling wall.
      squashX += 0.16;
      squashY -= 0.06;
      shiver = Math.sin(timeMs * 0.09) * 1.6;
    } else if (enemy.phase === 'recover') {
      // Sag, slowly rebounding.
      const sag = 1 - phaseProgress;

      squashX -= 0.08 * sag;
      squashY += 0.12 * sag;
    }

    squashX += hitFlash * motion.hitScaleX;
    squashY -= hitFlash * motion.hitScaleY;

    visual.container.setPosition(enemy.position.x + shiver, enemy.position.y);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);
    visual.container.setRotation(walkWave * (motion.walkTilt ?? 0.04));

    visual.shadow.setScale(0.82 + spawnEase * 0.18 + Math.abs(walkWave) * 0.08, 1);
    visual.shadow.setAlpha(0.14 + spawnEase * 0.2);

    const glowStrength =
      enemy.phase === 'brace' ? phaseProgress * 0.5 : enemy.phase === 'parry' ? 0.55 + Math.sin(timeMs * 0.02) * 0.1 : 0;

    visual.glow.setAlpha(glowStrength * 0.4);
    visual.glow.setScale(1 + glowStrength * 0.25);

    visual.artLayer.setPosition(0, base.y + idleWave * (motion.idleBob ?? 2) - Math.abs(walkWave) * (motion.walkBob ?? 2));
    visual.artLayer.setScale(base.scale * (1 + squashX), base.scale * (1 + squashY));
    visual.body.setTint(hitFlash > 0 ? 0xfff1d0 : enemy.phase === 'parry' ? 0xffe9c0 : 0xffffff);

    this.drawEyes(visual.eyes, enemy, timeMs);
  }

  private drawEyes(graphics: Phaser.GameObjects.Graphics, enemy: BackboardEnemy, timeMs: number) {
    const gaze = BACKBOARD_RIG.gaze;
    const expressions = resolveEyeExpressions(gaze.emotions);
    const hitFlash = enemy.hitFlashMs > 0;
    const expression =
      (hitFlash ? expressions.hit : undefined) ??
      (enemy.phase === 'brace' ? expressions.aim : undefined) ??
      (enemy.phase === 'parry' ? expressions.angry : undefined) ??
      (enemy.phase === 'recover' ? expressions.dizzy : undefined) ??
      expressions.default;
    const facing = normalize(enemy.facing);

    graphics.clear();

    for (const name of ['left', 'right'] as const) {
      drawRuntimeEye(graphics, name, gaze.eyes[name], BACKBOARD_RIG.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: gaze.pupilOffsetScale.x,
        offsetScaleY: gaze.pupilOffsetScale.y,
        timeMs
      });
    }
  }
}
