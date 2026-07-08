import Phaser from 'phaser';

import {
  DART_TRI_GOOBER_CHARACTER,
  type DartTriGooberEyeEmotion,
  type EmbeddedEyeTuning,
  type EyeEmotionTuning,
  type EyeName
} from '../characters/layeredCharacterConfig';
import type { DartGooberEnemy, DartGooberEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface DartTriGooberEyeVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly pupil: Phaser.GameObjects.Graphics;
  readonly tuning: EmbeddedEyeTuning;
}

interface DartTriGooberVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Record<EyeName, DartTriGooberEyeVisual>;
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
const EYE_PUPIL_COLOR = 0x050505;

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
    const { base, gaze } = DART_TRI_GOOBER_CHARACTER;
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
    ) as Record<EyeName, DartTriGooberEyeVisual>;
    const artLayer = this.scene.add.container(
      0,
      base.y,
      [body, ...EYE_NAMES.map((name) => eyes[name].container)]
    );
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
    this.updateEyes(visual.eyes, facing, eyeEmotion);

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
  ): DartTriGooberEyeEmotion {
    if (hitFlash > 0.05) {
      return 'hit';
    }

    if (charge > 0.45) {
      return 'aim';
    }

    return enemy.phase === 'shooting' ? 'angry' : 'default';
  }

  private createEye(tuning: EmbeddedEyeTuning): DartTriGooberEyeVisual {
    const { width, height } = DART_TRI_GOOBER_CHARACTER.base.imageSize;
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
    eyes: Record<EyeName, DartTriGooberEyeVisual>,
    facing: SimVector,
    eyeEmotion: DartTriGooberEyeEmotion
  ) {
    const emotion = DART_TRI_GOOBER_CHARACTER.gaze.emotions[eyeEmotion];
    const { width, height } = DART_TRI_GOOBER_CHARACTER.base.imageSize;
    const offsetX =
      Phaser.Math.Clamp(facing.x, -1, 1) * width * DART_TRI_GOOBER_CHARACTER.gaze.pupilOffsetScale.x +
      emotion.pupilShiftX * width;
    const offsetY =
      Phaser.Math.Clamp(facing.y, -1, 1) * height * DART_TRI_GOOBER_CHARACTER.gaze.pupilOffsetScale.y +
      emotion.pupilShiftY * height;

    for (const name of EYE_NAMES) {
      this.updateEye(eyes[name], name, emotion, offsetX, offsetY);
    }
  }

  private updateEye(
    eye: DartTriGooberEyeVisual,
    name: EyeName,
    emotion: EyeEmotionTuning,
    offsetX: number,
    offsetY: number
  ) {
    const { width, height } = DART_TRI_GOOBER_CHARACTER.base.imageSize;
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
    this.drawEyePupil(eye.pupil, name, emotion, pupilWidth, pupilHeight);
  }

  private drawEyePupil(
    graphics: Phaser.GameObjects.Graphics,
    name: EyeName,
    emotion: EyeEmotionTuning,
    width: number,
    height: number
  ) {
    graphics.clear();
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
}
