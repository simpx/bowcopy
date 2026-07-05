import Phaser from 'phaser';

import dartGooberBodyUrl from '../../../assets/prototype-video-crops/enemies/dart-goober-body.png';
import type { DartGooberEnemy, DartGooberEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import { createCornerKeyedTexture } from '../player/keyedTexture';

interface DartGooberVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly body: Phaser.GameObjects.Image;
  readonly muzzleGlow: Phaser.GameObjects.Arc;
}

interface DartGooberParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

const BODY_RAW_KEY = 'dart-goober-body-raw';
const BODY_KEY = 'dart-goober-body-keyed';
const BODY_SCALE = 0.32;
const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xf1c07a, 0xa2d07e, 0xffe6a1] as const;
const HIT_COLORS = [0xfff1b5, 0xffcf57] as const;
const FIRE_COLORS = [0xffcf57, 0xc2f26d] as const;
const DEATH_COLORS = [0xe96945, 0xa2d07e, 0xffcf57] as const;

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

export const preloadDartGooberAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(BODY_RAW_KEY)) {
    scene.load.image(BODY_RAW_KEY, dartGooberBodyUrl);
  }
};

export class DartGooberRenderer {
  private readonly visuals = new Map<number, DartGooberVisual>();
  private readonly particles: DartGooberParticle[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    createCornerKeyedTexture(this.scene, BODY_RAW_KEY, BODY_KEY, { threshold: 46 });
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(timeMs: number, deltaMs: number, enemies: readonly DartGooberEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.updateParticles(deltaMs);
  }

  playEvents(events: readonly DartGooberEvent[]) {
    for (const event of events) {
      if (event.type === 'dart-goober-spawned') {
        this.emitBurst(event.position, 14, SPAWN_COLORS, 42, 96, 4.8, 250);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        this.emitBurst(event.position, 6, HIT_COLORS, 34, 78, 3.2, 170);
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.emitBurst(event.position, 26, DEATH_COLORS, 62, 148, 5.6, 360);
        continue;
      }

      if (event.type === 'enemy-dart-fired') {
        this.emitBurst(event.origin, 5, FIRE_COLORS, 28, 72, 2.6, 150);
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

  private createVisual(id: number): DartGooberVisual {
    const shadow = this.scene.add.ellipse(0, 20, 54, 15, 0x07120d, 0.32);
    const body = this.scene.add.image(0, -19, BODY_KEY).setOrigin(0.5).setScale(BODY_SCALE);
    const muzzleGlow = this.scene.add.circle(0, -20, 9, 0xffd36a, 0);
    const container = this.scene.add.container(0, 0, [shadow, body, muzzleGlow]);
    const visual = {
      container,
      shadow,
      body,
      muzzleGlow
    };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: DartGooberEnemy, visual: DartGooberVisual) {
    const idleWave = Math.sin(timeMs * 0.004 + enemy.id * 0.8);
    const walkWave = Math.sin(enemy.walkPhase) * enemy.moveAmount;
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const charge = enemy.phase === 'shooting' ? enemy.shootCharge : 0;
    const spawnEase = this.getSpawnEase(enemy.spawnProgress);
    const spawnBounce = enemy.spawnProgress < 1 ? Math.sin(enemy.spawnProgress * Math.PI) * 0.2 : 0;
    const facing = normalize(enemy.facing);
    const squash = Math.abs(walkWave) * 0.065 + idleWave * 0.018;
    const anticipation = charge * 0.11;
    const scaleX = BODY_SCALE * (1 + squash - anticipation + hitFlash * 0.08);
    const scaleY = BODY_SCALE * (1 - squash + anticipation - hitFlash * 0.04);

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setRotation(Phaser.Math.Clamp(enemy.velocity.x / 180, -1, 1) * 0.08 + walkWave * 0.05);
    visual.container.setScale(Math.max(0.05, spawnEase + spawnBounce));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.78 + spawnEase * 0.22 + Math.abs(walkWave) * 0.08, 1);
    visual.shadow.setAlpha(0.14 + spawnEase * 0.2);

    visual.body.setPosition(-facing.x * charge * 5, -19 + idleWave * 2 - Math.abs(walkWave) * 2);
    visual.body.setScale(scaleX, scaleY);
    visual.body.setFlipX(facing.x < -0.08);
    visual.body.setTint(hitFlash > 0 ? 0xfff1d0 : charge > 0.2 ? 0xffdda0 : 0xffffff);

    visual.muzzleGlow.setPosition(facing.x * 27, -20 + facing.y * 16);
    visual.muzzleGlow.setScale(0.45 + charge * 0.95);
    visual.muzzleGlow.setAlpha(enemy.phase === 'shooting' ? 0.1 + charge * 0.45 : 0);
  }

  private getSpawnEase(progress: number): number {
    const clamped = clamp01(progress);

    return 1 - (1 - clamped) ** 3;
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
          y: position.y - 10 + randomRange(-5, 5)
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
