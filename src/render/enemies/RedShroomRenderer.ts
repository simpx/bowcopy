import Phaser from 'phaser';

import {
  PURPLE_SHROOM_CHARACTER,
  RED_SHROOM_CHARACTER,
  type EyeName
} from '../characters/layeredCharacterConfig';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import type { RedShroomEnemy, RedShroomEvent, ShroomVariant } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface RedShroomVisual {
  readonly variant: ShroomVariant;
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
  readonly chargeGlow: Phaser.GameObjects.Arc;
}


const HIT_FLASH_MS = 190;
const PARTICLE_DEPTH = 78;
const EYE_NAMES: readonly EyeName[] = ['left', 'right'];
const SPAWN_COLORS = [0xffd9a5, 0xff5a68, 0xffffff] as const;
const HIT_COLORS = [0xfff1b5, 0xff5a68] as const;
const BURST_COLORS = [0xff4d54, 0xff8a7b, 0xfff1d0] as const;
const DEATH_COLORS = [0xff4d54, 0xf5e38a, 0x111111] as const;
const SHROOM_CHARACTERS = {
  red: RED_SHROOM_CHARACTER,
  purple: PURPLE_SHROOM_CHARACTER
} as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const randomColor = (colors: readonly number[]): number =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? 0xffffff;

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

export const preloadRedShroomAssets = (scene: Phaser.Scene) => {
  for (const character of Object.values(SHROOM_CHARACTERS)) {
    if (!scene.textures.exists(character.base.textureKey)) {
      scene.load.image(character.base.textureKey, character.base.imageUrl);
    }
  }
};

export class RedShroomRenderer {
  private readonly visuals = new Map<number, RedShroomVisual>();
  private readonly bursts: ParticleBurstPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, { ...HOUSE_BURST_STYLE, ...{ originYOffset: -20, drag: 0.984, gravity: 0 } });
  }

  create() {
    this.bursts.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly RedShroomEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.bursts.update(deltaMs);
  }

  playEvents(events: readonly RedShroomEvent[]) {
    for (const event of events) {
      if (event.type === 'red-shroom-spawned') {
        this.bursts.emit(event.position, 14, SPAWN_COLORS, 38, 92, 4.8, 260);
        continue;
      }

      if (event.type === 'red-shroom-hit') {
        this.bursts.emit(event.position, 8, HIT_COLORS, 38, 84, 3.8, 190);
        continue;
      }

      if (event.type === 'red-shroom-killed') {
        this.bursts.emit(event.position, 30, DEATH_COLORS, 70, 162, 5.8, 380);
        continue;
      }

      if (event.type === 'red-shroom-spore-burst') {
        this.emitDirectionalBurst(event.origin, 22, BURST_COLORS, 54, 138, 3.6, 260);
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

  private syncEnemies(timeMs: number, enemies: readonly RedShroomEnemy[]) {
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);

      const visual = this.visuals.get(enemy.id) ?? this.createVisual(enemy.id, enemy.variant);

      this.updateVisual(timeMs, enemy, visual);
    }

    for (const [id, visual] of this.visuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.visuals.delete(id);
      }
    }
  }

  private createVisual(id: number, variant: ShroomVariant): RedShroomVisual {
    const { base } = SHROOM_CHARACTERS[variant];
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
    const chargeGlow = this.scene.add.circle(0, -42, 12, 0xff4d54, 0);
    const container = this.scene.add.container(0, 0, [shadow, artLayer, chargeGlow]);
    const visual = {
      variant,
      container,
      shadow,
      artLayer,
      body,
      eyes,
      chargeGlow
    };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: RedShroomEnemy, visual: RedShroomVisual) {
    const character = SHROOM_CHARACTERS[enemy.variant];
    const idleWave = Math.sin(timeMs * 0.0038 + enemy.id * 0.9);
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = this.getSpawnEase(enemy.spawnProgress);
    const charge = enemy.phase === 'charging' ? enemy.sporeCharge : 0;
    const release = enemy.releasePulse;
    const facing = normalize(enemy.facing);
    const emotion = this.getEyeEmotion(enemy, charge, hitFlash, release);
    const walkWave = Math.sin(enemy.walkPhase);
    const walkPulse = Math.abs(Math.cos(enemy.walkPhase));
    const squash =
      idleWave * character.motion.idleSquash +
      walkPulse * enemy.moveAmount * 0.035 +
      charge * character.motion.chargeSquash -
      release * character.motion.releaseSquash;
    const scaleX = character.base.scale * (1 + squash + hitFlash * character.motion.hitScaleX);
    const scaleY = character.base.scale * (1 - squash - hitFlash * character.motion.hitScaleY);

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(68 + enemy.position.y / 1000);
    visual.container.setRotation(Phaser.Math.Clamp(facing.x, -1, 1) * 0.018 + idleWave * 0.01);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.82 + spawnEase * 0.18 + charge * 0.1 + enemy.moveAmount * walkPulse * 0.08, 1);
    visual.shadow.setAlpha(0.12 + spawnEase * 0.22);

    visual.artLayer.setPosition(
      0,
      character.base.y +
        idleWave * character.motion.idleBob +
        walkWave * enemy.moveAmount * 2.4 -
        release * 4
    );
    visual.artLayer.setScale(scaleX, scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);
    this.drawEyes(visual.eyes, enemy.variant, facing, emotion, timeMs);

    visual.chargeGlow.setPosition(0, character.spores.originOffsetY);
    visual.chargeGlow.setScale(0.4 + charge * 1.2 + release * 0.7);
    visual.chargeGlow.setAlpha(charge * 0.28 + release * 0.38);
  }

  private getSpawnEase(progress: number): number {
    const clamped = clamp01(progress);

    return 1 - (1 - clamped) ** 3;
  }

  private getEyeEmotion(
    enemy: RedShroomEnemy,
    charge: number,
    hitFlash: number,
    release: number
  ): string {
    if (hitFlash > 0.08) {
      return 'hit';
    }

    if (enemy.dizzyMs > 0 || release > 0.05) {
      return 'dizzy';
    }

    if (charge > 0.62) {
      return 'aim';
    }

    return enemy.phase === 'charging' ? 'angry' : 'default';
  }

  private drawEyes(
    graphics: Phaser.GameObjects.Graphics,
    variant: ShroomVariant,
    facing: SimVector,
    emotionName: string,
    timeMs: number
  ) {
    const character = SHROOM_CHARACTERS[variant];
    const expressions = resolveEyeExpressions(character.gaze.emotions);
    const expression = expressions[emotionName] ?? expressions.default;

    graphics.clear();

    for (const name of EYE_NAMES) {
      drawRuntimeEye(graphics, name, character.gaze.eyes[name], character.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: character.gaze.pupilOffsetScale.x,
        offsetScaleY: character.gaze.pupilOffsetScale.y,
        timeMs
      });
    }
  }

  private emitDirectionalBurst(
    position: SimVector,
    count: number,
    colors: readonly number[],
    minSpeed: number,
    maxSpeed: number,
    radius: number,
    durationMs: number
  ) {
    for (let index = 0; index < count; index += 1) {
      const corner = index % 4;
      const angle =
        corner === 0
          ? -Math.PI * 0.75
          : corner === 1
            ? -Math.PI * 0.25
            : corner === 2
              ? Math.PI * 0.75
              : Math.PI * 0.25;
      const speed = randomRange(minSpeed, maxSpeed);

      this.bursts.spawn({
        position: {
          x: position.x + randomRange(-4, 4),
          y: position.y + randomRange(-4, 4)
        },
        velocity: {
          x: Math.cos(angle + randomRange(-0.24, 0.24)) * speed,
          y: Math.sin(angle + randomRange(-0.24, 0.24)) * speed
        },
        color: randomColor(colors),
        radius: randomRange(radius * 0.55, radius),
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.18)
      });
    }
  }
}
