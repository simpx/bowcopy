import Phaser from 'phaser';

import { DART_TRI_GOOBER_CHARACTER, type EyeName } from '../characters/layeredCharacterConfig';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import type { DartGooberEnemy, DartGooberEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface DartTriGooberVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
  readonly muzzleGlow: Phaser.GameObjects.Arc;
}


const BODY_SCALE = DART_TRI_GOOBER_CHARACTER.base.scale;
const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const EYE_NAMES: readonly EyeName[] = ['left', 'right'];
const SPAWN_COLORS = [0x67e54a, 0x28d7ff, 0xffe6a1] as const;
const HIT_COLORS = [0xfff1b5, 0xffcf57] as const;
const FIRE_COLORS = [0xffcf57, 0x28d7ff] as const;
const DEATH_COLORS = [0xe96945, 0x67e54a, 0x28d7ff] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));



const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

export const preloadDartTriGooberAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(DART_TRI_GOOBER_CHARACTER.base.textureKey)) {
    scene.load.image(DART_TRI_GOOBER_CHARACTER.base.textureKey, DART_TRI_GOOBER_CHARACTER.base.imageUrl);
  }
};

export class DartTriGooberRenderer {
  private readonly visuals = new Map<number, DartTriGooberVisual>();
  private readonly bursts: ParticleBurstPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, { ...HOUSE_BURST_STYLE, ...{ riseMax: 28 } });
  }

  create() {
    this.bursts.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly DartGooberEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.bursts.update(deltaMs);
  }

  playEvents(events: readonly DartGooberEvent[]) {
    for (const event of events) {
      if (event.type === 'dart-goober-spawned') {
        this.bursts.emit(event.position, 12, SPAWN_COLORS, 36, 88, 4.4, 240);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        this.bursts.emit(event.position, 6, HIT_COLORS, 32, 74, 3.1, 170);
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.bursts.emit(event.position, 24, DEATH_COLORS, 58, 142, 5.4, 360);
        continue;
      }

      if (event.type === 'enemy-dart-fired') {
        this.bursts.emit(event.origin, 5, FIRE_COLORS, 28, 72, 2.6, 150);
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

  private syncEnemies(timeMs: number, enemies: readonly DartGooberEnemy[]) {
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

  private createVisual(id: number): DartTriGooberVisual {
    const { base } = DART_TRI_GOOBER_CHARACTER;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.32
    );
    const body = this.scene.add
      .image(0, 0, base.textureKey)
      .setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, base.y, [body, eyes]);
    const muzzleGlow = this.scene.add.circle(0, -20, DART_TRI_GOOBER_CHARACTER.attack.muzzleRadius, 0xffd36a, 0);
    const container = this.scene.add.container(0, 0, [shadow, artLayer, muzzleGlow]);
    const visual = {
      container,
      shadow,
      artLayer,
      body,
      eyes,
      muzzleGlow
    };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: DartGooberEnemy, visual: DartTriGooberVisual) {
    const idleWave = Math.sin(timeMs * 0.004 + enemy.id * 0.8);
    const walkWave = Math.sin(enemy.walkPhase) * enemy.moveAmount;
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const charge = enemy.phase === 'shooting' ? enemy.shootCharge : 0;
    const spawnEase = this.getSpawnEase(enemy.spawnProgress);
    const spawnBounce = enemy.spawnProgress < 1 ? Math.sin(enemy.spawnProgress * Math.PI) * 0.18 : 0;
    const facing = normalize(enemy.facing);
    const eyeEmotion = this.getEyeEmotion(enemy, charge, hitFlash);
    const squash =
      Math.abs(walkWave) * DART_TRI_GOOBER_CHARACTER.motion.walkSquash +
      idleWave * DART_TRI_GOOBER_CHARACTER.motion.idleSquash;
    const anticipation = charge * DART_TRI_GOOBER_CHARACTER.attack.anticipation;
    const scaleX = BODY_SCALE * (1 + squash - anticipation + hitFlash * DART_TRI_GOOBER_CHARACTER.motion.hitScaleX);
    const scaleY = BODY_SCALE * (1 - squash + anticipation - hitFlash * DART_TRI_GOOBER_CHARACTER.motion.hitScaleY);

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setRotation(
      Phaser.Math.Clamp(enemy.velocity.x / 180, -1, 1) * DART_TRI_GOOBER_CHARACTER.motion.velocityTilt +
        walkWave * DART_TRI_GOOBER_CHARACTER.motion.walkTilt
    );
    visual.container.setScale(Math.max(0.05, spawnEase + spawnBounce));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.8 + spawnEase * 0.2 + Math.abs(walkWave) * 0.08, 1);
    visual.shadow.setAlpha(0.14 + spawnEase * 0.2);

    visual.artLayer.setPosition(
      -facing.x * charge * DART_TRI_GOOBER_CHARACTER.attack.chargeShift,
      DART_TRI_GOOBER_CHARACTER.base.y +
        idleWave * DART_TRI_GOOBER_CHARACTER.motion.idleBob -
        Math.abs(walkWave) * DART_TRI_GOOBER_CHARACTER.motion.walkBob
    );
    visual.artLayer.setScale(scaleX, scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xfff1d0 : charge > 0.2 ? 0xffdda0 : 0xffffff);
    this.drawEyes(visual.eyes, facing, eyeEmotion);

    visual.muzzleGlow.setPosition(
      facing.x * DART_TRI_GOOBER_CHARACTER.attack.muzzleX,
      DART_TRI_GOOBER_CHARACTER.attack.muzzleY + facing.y * DART_TRI_GOOBER_CHARACTER.attack.muzzleAimY
    );
    visual.muzzleGlow.setScale(
      DART_TRI_GOOBER_CHARACTER.attack.muzzleScaleBase +
        charge * DART_TRI_GOOBER_CHARACTER.attack.muzzleScaleCharge
    );
    visual.muzzleGlow.setAlpha(
      enemy.phase === 'shooting'
        ? DART_TRI_GOOBER_CHARACTER.attack.muzzleAlphaBase +
            charge * DART_TRI_GOOBER_CHARACTER.attack.muzzleAlphaCharge
        : 0
    );
  }

  private getSpawnEase(progress: number): number {
    const clamped = clamp01(progress);

    return 1 - (1 - clamped) ** 3;
  }

  private getEyeEmotion(
    enemy: DartGooberEnemy,
    charge: number,
    hitFlash: number
  ): string {
    if (hitFlash > 0.05) {
      return 'hit';
    }

    if (charge > 0.45) {
      return 'aim';
    }

    return enemy.phase === 'shooting' ? 'angry' : 'default';
  }

  private drawEyes(
    graphics: Phaser.GameObjects.Graphics,
    facing: SimVector,
    emotionName: string
  ) {
    const expressions = resolveEyeExpressions(DART_TRI_GOOBER_CHARACTER.gaze.emotions);
    const expression = expressions[emotionName] ?? expressions.default;

    graphics.clear();

    for (const name of EYE_NAMES) {
      drawRuntimeEye(graphics, name, DART_TRI_GOOBER_CHARACTER.gaze.eyes[name], DART_TRI_GOOBER_CHARACTER.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: DART_TRI_GOOBER_CHARACTER.gaze.pupilOffsetScale.x,
        offsetScaleY: DART_TRI_GOOBER_CHARACTER.gaze.pupilOffsetScale.y,
        timeMs: 0
      });
    }
  }
}
