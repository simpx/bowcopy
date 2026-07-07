import Phaser from 'phaser';

import { DART_TRI_GOOBER_RIG } from '../../characters/dartTriGooberRig';
import type { DartGooberEnemy, DartGooberEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';

interface DartTriGooberVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly body: Phaser.GameObjects.Graphics;
  readonly eyes: Phaser.GameObjects.Graphics;
  readonly muzzleGlow: Phaser.GameObjects.Arc;
}

interface DartTriGooberParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xf1c07a, 0x99c66e, 0xffe6a1] as const;
const HIT_COLORS = [0xfff1b5, 0xffcf57] as const;
const DEATH_COLORS = [0xe96945, 0x99c66e, 0xffcf57] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const randomColor = (colors: readonly number[]): number =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? 0xffffff;

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadDartTriGooberAssets = () => undefined;

export class DartTriGooberRenderer {
  private readonly visuals = new Map<number, DartTriGooberVisual>();
  private readonly particles: DartTriGooberParticle[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(timeMs: number, deltaMs: number, enemies: readonly DartGooberEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.updateParticles(deltaMs);
  }

  playEvents(events: readonly DartGooberEvent[]) {
    for (const event of events) {
      if (event.type === 'dart-goober-spawned') {
        this.emitBurst(event.position, 12, SPAWN_COLORS, 36, 88, 4.4, 240);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        this.emitBurst(event.position, 6, HIT_COLORS, 32, 74, 3.1, 170);
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.emitBurst(event.position, 24, DEATH_COLORS, 58, 142, 5.4, 360);
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
    const shadow = this.scene.add.ellipse(
      0,
      DART_TRI_GOOBER_RIG.base.shadow.y,
      DART_TRI_GOOBER_RIG.base.shadow.width,
      DART_TRI_GOOBER_RIG.base.shadow.height,
      0x07120d,
      0.32
    );
    const body = this.scene.add.graphics();
    const eyes = this.scene.add.graphics();
    const muzzleGlow = this.scene.add.circle(0, -20, DART_TRI_GOOBER_RIG.attack.muzzleRadius, 0xffd36a, 0);
    const art = this.scene.add.container(0, DART_TRI_GOOBER_RIG.base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, art, muzzleGlow]);
    const visual = { container, shadow, body, eyes, muzzleGlow };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: DartGooberEnemy, visual: DartTriGooberVisual) {
    const idleWave = Math.sin(timeMs * 0.004 + enemy.id * 0.8);
    const walkWave = Math.sin(enemy.walkPhase) * enemy.moveAmount;
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const charge = enemy.phase === 'shooting' ? enemy.shootCharge : 0;
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const squash = Math.abs(walkWave) * DART_TRI_GOOBER_RIG.motion.walkSquash + idleWave * DART_TRI_GOOBER_RIG.motion.idleSquash;
    const anticipation = charge * DART_TRI_GOOBER_RIG.attack.anticipation;
    const scaleX = DART_TRI_GOOBER_RIG.base.scale * (1 + squash - anticipation + hitFlash * DART_TRI_GOOBER_RIG.motion.hitScaleX);
    const scaleY = DART_TRI_GOOBER_RIG.base.scale * (1 - squash + anticipation - hitFlash * DART_TRI_GOOBER_RIG.motion.hitScaleY);
    const facing = normalize(enemy.facing);

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setRotation(Phaser.Math.Clamp(enemy.velocity.x / 180, -1, 1) * DART_TRI_GOOBER_RIG.motion.velocityTilt + walkWave * DART_TRI_GOOBER_RIG.motion.walkTilt);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.18));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.8 + spawnEase * 0.2 + Math.abs(walkWave) * 0.08, 1);
    visual.shadow.setAlpha(0.14 + spawnEase * 0.2);

    visual.body.setScale(scaleX / DART_TRI_GOOBER_RIG.base.scale, scaleY / DART_TRI_GOOBER_RIG.base.scale);
    visual.eyes.setScale(scaleX / DART_TRI_GOOBER_RIG.base.scale, scaleY / DART_TRI_GOOBER_RIG.base.scale);
    this.drawBody(visual.body, hitFlash, charge);
    this.drawEyes(visual.eyes, facing, charge, hitFlash);

    visual.muzzleGlow.setPosition(
      facing.x * DART_TRI_GOOBER_RIG.attack.muzzleX,
      DART_TRI_GOOBER_RIG.attack.muzzleY + facing.y * DART_TRI_GOOBER_RIG.attack.muzzleAimY
    );
    visual.muzzleGlow.setScale(DART_TRI_GOOBER_RIG.attack.muzzleScaleBase + charge * DART_TRI_GOOBER_RIG.attack.muzzleScaleCharge);
    visual.muzzleGlow.setAlpha(enemy.phase === 'shooting'
      ? DART_TRI_GOOBER_RIG.attack.muzzleAlphaBase + charge * DART_TRI_GOOBER_RIG.attack.muzzleAlphaCharge
      : 0);
  }

  private drawBody(graphics: Phaser.GameObjects.Graphics, hitFlash: number, charge: number) {
    graphics.clear();
    graphics.lineStyle(8, 0x070707, 1);
    graphics.fillStyle(hitFlash > 0 ? 0xfff1d0 : 0xd68b51, 1);
    graphics.beginPath();
    graphics.moveTo(0, -46 - charge * 2);
    graphics.lineTo(49, 34);
    graphics.lineTo(-49, 34);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.lineStyle(6, 0x070707, 1);
    graphics.fillStyle(0x7a4b2e, 1);
    graphics.fillEllipse(0, 18, 62, 22);
    graphics.strokeEllipse(0, 18, 62, 22);
  }

  private drawEyes(
    graphics: Phaser.GameObjects.Graphics,
    facing: SimVector,
    charge: number,
    hitFlash: number
  ) {
    graphics.clear();

    for (const name of ['left', 'right'] as const) {
      const eye = DART_TRI_GOOBER_RIG.gaze.eyes[name];
      const side = name === 'left' ? -1 : 1;
      const pupilX = eye.x + Phaser.Math.Clamp(facing.x, -1, 1) * DART_TRI_GOOBER_RIG.gaze.pupilOffsetScale.x;
      const pupilY = eye.y + Phaser.Math.Clamp(facing.y, -1, 1) * DART_TRI_GOOBER_RIG.gaze.pupilOffsetScale.y;
      const pupilScale = hitFlash > 0 ? 0.7 : 1 + charge * 0.12;

      graphics.save();
      graphics.translateCanvas(eye.x, eye.y);
      graphics.rotateCanvas(eye.rotation);
      graphics.lineStyle(5, 0x050505, 1);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillEllipse(0, 0, eye.radiusX * 3.2, eye.radiusY * 3.1);
      graphics.strokeEllipse(0, 0, eye.radiusX * 3.2, eye.radiusY * 3.1);
      graphics.restore();

      graphics.save();
      graphics.translateCanvas(pupilX, pupilY);
      graphics.rotateCanvas(side * (0.35 + charge * 0.18));
      graphics.fillStyle(0x050505, 1);
      graphics.fillEllipse(0, 0, eye.radiusX * 1.75 * pupilScale, eye.radiusY * 1.45 * pupilScale);
      graphics.restore();
    }
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
        position: { x: position.x + randomRange(-5, 5), y: position.y - 10 + randomRange(-5, 5) },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - randomRange(8, 28) },
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

      particle.velocity.x *= 0.985;
      particle.velocity.y = particle.velocity.y * 0.985 + 120 * deltaSeconds;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = particle.ageMs / particle.durationMs;
      graphics.fillStyle(particle.color, (1 - progress) * 0.82);
      graphics.fillCircle(particle.position.x, particle.position.y, particle.radius * (1 - progress * 0.45));
    }
  }
}
