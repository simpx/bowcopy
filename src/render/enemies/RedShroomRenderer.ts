import Phaser from 'phaser';

import {
  RED_SHROOM_CHARACTER,
  type EmbeddedEyeTuning,
  type EyeEmotionTuning,
  type EyeName,
  type RedShroomEyeEmotion
} from '../characters/layeredCharacterConfig';
import type { RedShroomEnemy, RedShroomEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';

interface RedShroomEyeVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly pupil: Phaser.GameObjects.Graphics;
  readonly tuning: EmbeddedEyeTuning;
}

interface RedShroomVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Record<EyeName, RedShroomEyeVisual>;
  readonly chargeGlow: Phaser.GameObjects.Arc;
}

interface RedShroomParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

const BODY_SCALE = RED_SHROOM_CHARACTER.base.scale;
const HIT_FLASH_MS = 190;
const PARTICLE_DEPTH = 78;
const EYE_NAMES: readonly EyeName[] = ['left', 'right'];
const SPAWN_COLORS = [0xffd9a5, 0xff5a68, 0xffffff] as const;
const HIT_COLORS = [0xfff1b5, 0xff5a68] as const;
const BURST_COLORS = [0xff4d54, 0xff8a7b, 0xfff1d0] as const;
const DEATH_COLORS = [0xff4d54, 0xf5e38a, 0x111111] as const;
const EYE_PUPIL_COLOR = 0x050505;

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
  if (!scene.textures.exists(RED_SHROOM_CHARACTER.base.textureKey)) {
    scene.load.image(RED_SHROOM_CHARACTER.base.textureKey, RED_SHROOM_CHARACTER.base.imageUrl);
  }
};

export class RedShroomRenderer {
  private readonly visuals = new Map<number, RedShroomVisual>();
  private readonly particles: RedShroomParticle[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(timeMs: number, deltaMs: number, enemies: readonly RedShroomEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.updateParticles(deltaMs);
  }

  playEvents(events: readonly RedShroomEvent[]) {
    for (const event of events) {
      if (event.type === 'red-shroom-spawned') {
        this.emitBurst(event.position, 14, SPAWN_COLORS, 38, 92, 4.8, 260);
        continue;
      }

      if (event.type === 'red-shroom-hit') {
        this.emitBurst(event.position, 8, HIT_COLORS, 38, 84, 3.8, 190);
        continue;
      }

      if (event.type === 'red-shroom-killed') {
        this.emitBurst(event.position, 30, DEATH_COLORS, 70, 162, 5.8, 380);
        continue;
      }

      if (event.type === 'red-shroom-spore-burst') {
        this.emitDirectionalBurst(event.origin, 22, BURST_COLORS, 54, 138, 3.6, 260);
      }
    }
  }

  destroy() {
    this.particleGraphics?.destroy();

    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }

    this.visuals.clear();
    this.particles.length = 0;
  }

  private syncEnemies(timeMs: number, enemies: readonly RedShroomEnemy[]) {
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

  private createVisual(id: number): RedShroomVisual {
    const { base, gaze } = RED_SHROOM_CHARACTER;
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
    const eyes = Object.fromEntries(
      EYE_NAMES.map((name) => [name, this.createEye(gaze.eyes[name])])
    ) as Record<EyeName, RedShroomEyeVisual>;
    const artLayer = this.scene.add.container(
      0,
      base.y,
      [body, ...EYE_NAMES.map((name) => eyes[name].container)]
    );
    const chargeGlow = this.scene.add.circle(0, -42, 12, 0xff4d54, 0);
    const container = this.scene.add.container(0, 0, [shadow, artLayer, chargeGlow]);
    const visual = {
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
    const idleWave = Math.sin(timeMs * 0.0038 + enemy.id * 0.9);
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = this.getSpawnEase(enemy.spawnProgress);
    const charge = enemy.phase === 'charging' ? enemy.sporeCharge : 0;
    const release = enemy.releasePulse;
    const facing = normalize(enemy.facing);
    const emotion = this.getEyeEmotion(enemy, charge, hitFlash, release);
    const squash =
      idleWave * RED_SHROOM_CHARACTER.motion.idleSquash +
      charge * RED_SHROOM_CHARACTER.motion.chargeSquash -
      release * RED_SHROOM_CHARACTER.motion.releaseSquash;
    const scaleX = BODY_SCALE * (1 + squash + hitFlash * RED_SHROOM_CHARACTER.motion.hitScaleX);
    const scaleY = BODY_SCALE * (1 - squash - hitFlash * RED_SHROOM_CHARACTER.motion.hitScaleY);

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(68 + enemy.position.y / 1000);
    visual.container.setRotation(Phaser.Math.Clamp(facing.x, -1, 1) * 0.018 + idleWave * 0.01);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.82 + spawnEase * 0.18 + charge * 0.1, 1);
    visual.shadow.setAlpha(0.12 + spawnEase * 0.22);

    visual.artLayer.setPosition(0, RED_SHROOM_CHARACTER.base.y + idleWave * RED_SHROOM_CHARACTER.motion.idleBob - release * 4);
    visual.artLayer.setScale(scaleX, scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : charge > 0.1 ? 0xffd2d6 : 0xffffff);
    this.updateEyes(visual.eyes, facing, emotion, timeMs);

    visual.chargeGlow.setPosition(0, RED_SHROOM_CHARACTER.spores.originOffsetY);
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
  ): RedShroomEyeEmotion {
    if (hitFlash > 0.08) {
      return 'dizzy';
    }

    if (release > 0.2) {
      return 'alert';
    }

    if (charge > 0.62) {
      return 'aim';
    }

    return enemy.phase === 'charging' ? 'angry' : 'default';
  }

  private createEye(tuning: EmbeddedEyeTuning): RedShroomEyeVisual {
    const { width, height } = RED_SHROOM_CHARACTER.base.imageSize;
    const container = this.scene.add.container(
      (tuning.x - 0.5) * width,
      (tuning.y - 0.5) * height
    );
    const pupil = this.scene.add.graphics();

    container.add(pupil);

    return {
      container,
      pupil,
      tuning
    };
  }

  private updateEyes(
    eyes: Record<EyeName, RedShroomEyeVisual>,
    facing: SimVector,
    eyeEmotion: RedShroomEyeEmotion,
    timeMs: number
  ) {
    const emotion = RED_SHROOM_CHARACTER.gaze.emotions[eyeEmotion];
    const { width, height } = RED_SHROOM_CHARACTER.base.imageSize;
    const offsetX =
      Phaser.Math.Clamp(facing.x, -1, 1) * width * RED_SHROOM_CHARACTER.gaze.pupilOffsetScale.x +
      emotion.pupilShiftX * width;
    const offsetY =
      Phaser.Math.Clamp(facing.y, -1, 1) * height * RED_SHROOM_CHARACTER.gaze.pupilOffsetScale.y +
      emotion.pupilShiftY * height;

    for (const name of EYE_NAMES) {
      this.updateEye(eyes[name], name, emotion, offsetX, offsetY, timeMs);
    }
  }

  private updateEye(
    eye: RedShroomEyeVisual,
    name: EyeName,
    emotion: EyeEmotionTuning,
    offsetX: number,
    offsetY: number,
    timeMs: number
  ) {
    const { width, height } = RED_SHROOM_CHARACTER.base.imageSize;
    const side = name === 'left' ? -1 : 1;
    const tiltDirection = emotion.eyeTiltMode === 'same' ? 1 : side;
    const lidCompression = 1 - (emotion.upperLid + emotion.lowerLid) * 0.24;
    const pupilWidth = eye.tuning.radiusX * width * 2 * emotion.pupilScale * emotion.eyeScaleX;
    const pupilHeight =
      eye.tuning.radiusY *
      height *
      2 *
      emotion.pupilScale *
      emotion.eyeScaleY *
      Phaser.Math.Clamp(lidCompression, 0.45, 1);

    eye.container.setRotation(eye.tuning.rotation + tiltDirection * emotion.eyeTiltAdd);
    eye.pupil.setPosition(offsetX, offsetY);
    this.drawEyePupil(eye.pupil, name, emotion, pupilWidth, pupilHeight, timeMs);
  }

  private drawEyePupil(
    graphics: Phaser.GameObjects.Graphics,
    name: EyeName,
    emotion: EyeEmotionTuning,
    width: number,
    height: number,
    timeMs: number
  ) {
    graphics.clear();

    if (emotion.shape === 'spiral') {
      this.drawSpiralPupil(graphics, width, height, timeMs);
      return;
    }

    if (emotion.shape === 'x') {
      this.drawXPupil(graphics, width, height);
      return;
    }

    graphics.fillStyle(EYE_PUPIL_COLOR, 1);

    if (emotion.shape !== 'cut-ellipse') {
      graphics.fillEllipse(0, 0, width, height);
      return;
    }

    this.drawCutEllipsePupil(
      graphics,
      name,
      width,
      height,
      emotion.cutSlope ?? 1.6,
      emotion.cutOffset ?? -0.42
    );
  }

  private drawSpiralPupil(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    timeMs: number
  ) {
    const radius = Math.min(width, height) * 0.48;
    const points: Phaser.Types.Math.Vector2Like[] = [];
    const phase = timeMs * 0.006;

    for (let index = 0; index < 62; index += 1) {
      const progress = index / 61;
      const angle = progress * Math.PI * 4.8 + phase;
      const localRadius = radius * progress;

      points.push({
        x: Math.cos(angle) * localRadius,
        y: Math.sin(angle) * localRadius
      });
    }

    graphics.lineStyle(Math.max(4, radius * 0.16), EYE_PUPIL_COLOR, 1);
    graphics.strokePoints(points, false, false);
  }

  private drawXPupil(graphics: Phaser.GameObjects.Graphics, width: number, height: number) {
    const halfWidth = width * 0.42;
    const halfHeight = height * 0.42;

    graphics.lineStyle(Math.max(4, Math.min(width, height) * 0.16), EYE_PUPIL_COLOR, 1);
    graphics.lineBetween(-halfWidth, -halfHeight, halfWidth, halfHeight);
    graphics.lineBetween(halfWidth, -halfHeight, -halfWidth, halfHeight);
  }

  private drawCutEllipsePupil(
    graphics: Phaser.GameObjects.Graphics,
    name: EyeName,
    width: number,
    height: number,
    cutSlope: number,
    cutOffset: number
  ) {
    const inner = name === 'left' ? 1 : -1;
    const rx = width / 2;
    const ry = height / 2;
    const ellipsePoints: Phaser.Types.Math.Vector2Like[] = [];

    for (let index = 0; index < 72; index += 1) {
      const angle = (Math.PI * 2 * index) / 72;
      ellipsePoints.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }

    const points = this.clipNormalizedEllipse(ellipsePoints, cutSlope, cutOffset).map(
      (point) => new Phaser.Math.Vector2(point.x * rx * inner, point.y * ry)
    );

    graphics.fillStyle(EYE_PUPIL_COLOR, 1);
    graphics.fillPoints(points, true, true);
  }

  private clipNormalizedEllipse(
    points: Phaser.Types.Math.Vector2Like[],
    cutSlope: number,
    cutOffset: number
  ): Phaser.Types.Math.Vector2Like[] {
    const clipped: Phaser.Types.Math.Vector2Like[] = [];
    const isInside = (point: Phaser.Types.Math.Vector2Like) =>
      point.y - cutSlope * point.x - cutOffset >= 0;
    const getIntersection = (
      start: Phaser.Types.Math.Vector2Like,
      end: Phaser.Types.Math.Vector2Like
    ): Phaser.Types.Math.Vector2Like => {
      const startDistance = start.y - cutSlope * start.x - cutOffset;
      const endDistance = end.y - cutSlope * end.x - cutOffset;
      const ratio =
        Math.abs(startDistance - endDistance) > 0.000001
          ? startDistance / (startDistance - endDistance)
          : 0;

      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
    };

    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const currentInside = isInside(current);
      const nextInside = isInside(next);

      if (currentInside && nextInside) {
        clipped.push(next);
      } else if (currentInside && !nextInside) {
        clipped.push(getIntersection(current, next));
      } else if (!currentInside && nextInside) {
        clipped.push(getIntersection(current, next), next);
      }
    }

    return clipped;
  }

  private emitBurst(
    position: SimVector,
    count: number,
    colors: readonly number[],
    minSpeed: number,
    maxSpeed: number,
    radius: number,
    durationMs: number
  ) {
    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(minSpeed, maxSpeed);

      this.particles.push({
        position: {
          x: position.x + randomRange(-5, 5),
          y: position.y - 20 + randomRange(-5, 5)
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - randomRange(8, 30)
        },
        color: randomColor(colors),
        radius: randomRange(radius * 0.55, radius),
        ageMs: 0,
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.18)
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

      this.particles.push({
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
        ageMs: 0,
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.18)
      });
    }
  }

  private updateParticles(deltaMs: number) {
    const graphics = this.particleGraphics;

    if (!graphics) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;

    graphics.clear();

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];

      particle.ageMs += deltaMs;

      if (particle.ageMs >= particle.durationMs) {
        this.particles.splice(index, 1);
        continue;
      }

      particle.velocity.x *= 0.984;
      particle.velocity.y *= 0.984;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = particle.ageMs / particle.durationMs;
      const alpha = 1 - progress;

      graphics.fillStyle(particle.color, alpha * 0.82);
      graphics.fillCircle(
        particle.position.x,
        particle.position.y,
        particle.radius * (1 - progress * 0.45)
      );
    }
  }
}
