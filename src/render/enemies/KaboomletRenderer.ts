import Phaser from 'phaser';

import { KABOOMLET_RIG } from '../../characters/kaboomletRig';
import type { KaboomletEnemy, KaboomletEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';

interface KaboomletVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly body: Phaser.GameObjects.Graphics;
}

interface KaboomletParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

interface ExplosionRing {
  position: SimVector;
  ageMs: number;
  durationMs: number;
  radius: number;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xffcf57, 0x303030, 0xffffff] as const;
const HIT_COLORS = [0xfff1b5, 0xff6a45] as const;
const EXPLOSION_COLORS = [0xffcf57, 0xff6a45, 0x111111] as const;

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

export const preloadKaboomletAssets = () => undefined;

export class KaboomletRenderer {
  private readonly visuals = new Map<number, KaboomletVisual>();
  private readonly particles: KaboomletParticle[] = [];
  private readonly explosionRings: ExplosionRing[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(timeMs: number, deltaMs: number, enemies: readonly KaboomletEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.updateParticles(deltaMs);
  }

  playEvents(events: readonly KaboomletEvent[]) {
    for (const event of events) {
      if (event.type === 'kaboomlet-spawned') {
        this.emitBurst(event.position, 12, SPAWN_COLORS, 32, 82, 4.6, 230);
        continue;
      }

      if (event.type === 'kaboomlet-hit') {
        this.emitBurst(event.position, 8, HIT_COLORS, 34, 84, 3.8, 180);
        continue;
      }

      if (event.type === 'kaboomlet-killed') {
        this.emitBurst(event.position, 24, EXPLOSION_COLORS, 54, 136, 5.4, 340);
        continue;
      }

      if (event.type === 'kaboomlet-exploded') {
        this.explosionRings.push({
          position: event.position,
          ageMs: 0,
          durationMs: 300,
          radius: event.radius
        });
        this.emitBurst(event.position, 36, EXPLOSION_COLORS, 78, 220, 6.2, 420);
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
    this.explosionRings.length = 0;
  }

  private syncEnemies(timeMs: number, enemies: readonly KaboomletEnemy[]) {
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

  private createVisual(id: number): KaboomletVisual {
    const shadow = this.scene.add.ellipse(
      0,
      KABOOMLET_RIG.base.shadow.y,
      KABOOMLET_RIG.base.shadow.width,
      KABOOMLET_RIG.base.shadow.height,
      0x07120d,
      0.32
    );
    const body = this.scene.add.graphics();
    const container = this.scene.add.container(0, 0, [shadow, body]);
    const visual = { container, shadow, body };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: KaboomletEnemy, visual: KaboomletVisual) {
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const wobble = Math.sin(enemy.wobblePhase) * (enemy.phase === 'chasing' ? KABOOMLET_RIG.motion.chaseWobble : KABOOMLET_RIG.motion.idleSquash);
    const armedPulse = enemy.phase === 'armed'
      ? Math.sin(timeMs * 0.035) * KABOOMLET_RIG.motion.armedPulse * (0.35 + enemy.armedProgress * 0.65)
      : 0;
    const explosionSquash = enemy.phase === 'exploding'
      ? KABOOMLET_RIG.motion.explosionAnticipation * (1 - enemy.explosionProgress)
      : 0;
    const scaleX = 1 + Math.abs(wobble) + armedPulse + explosionSquash + hitFlash * KABOOMLET_RIG.motion.hitScaleX;
    const scaleY = 1 - Math.abs(wobble) - armedPulse * 0.5 - explosionSquash * 0.5 - hitFlash * KABOOMLET_RIG.motion.hitScaleY;

    visual.container.setPosition(enemy.position.x, enemy.position.y);
    visual.container.setDepth(68 + enemy.position.y / 1000);
    visual.container.setRotation(Phaser.Math.Clamp(enemy.velocity.x / 180, -1, 1) * 0.07 + wobble * 0.45);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(enemy.phase === 'exploding' ? 1 - enemy.explosionProgress : 0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.82 + spawnEase * 0.18 + enemy.moveAmount * 0.08, 1);
    visual.shadow.setAlpha(0.14 + spawnEase * 0.2);

    visual.body.setScale(scaleX, scaleY);
    this.drawKaboomlet(visual.body, normalize(enemy.facing), enemy.armedProgress, hitFlash, timeMs);
  }

  private drawKaboomlet(
    graphics: Phaser.GameObjects.Graphics,
    facing: SimVector,
    armedProgress: number,
    hitFlash: number,
    timeMs: number
  ) {
    const flash = armedProgress > 0 && Math.sin(timeMs * 0.035) > 0.25;
    const bodyColor = hitFlash > 0 ? 0xfff1d0 : flash ? 0xff6a45 : 0x303030;

    graphics.clear();
    graphics.lineStyle(7, 0x050505, 1);
    graphics.fillStyle(bodyColor, 1);
    graphics.fillCircle(0, 0, 31);
    graphics.strokeCircle(0, 0, 31);

    graphics.lineStyle(5, 0x050505, 1);
    graphics.lineBetween(-8, -29, 0, -43);
    graphics.lineStyle(4, flash ? 0xffcf57 : 0xb06a30, 1);
    graphics.lineBetween(0, -43, 12 + armedProgress * 5, -51);

    for (const name of ['left', 'right'] as const) {
      const eye = KABOOMLET_RIG.gaze.eyes[name];
      const pupilX = eye.x + Phaser.Math.Clamp(facing.x, -1, 1) * KABOOMLET_RIG.gaze.pupilOffsetScale.x;
      const pupilY = eye.y + Phaser.Math.Clamp(facing.y, -1, 1) * KABOOMLET_RIG.gaze.pupilOffsetScale.y;

      graphics.save();
      graphics.translateCanvas(eye.x, eye.y);
      graphics.rotateCanvas(eye.rotation);
      graphics.lineStyle(4, 0x050505, 1);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillEllipse(0, 0, eye.radiusX * 3, eye.radiusY * 2.8);
      graphics.strokeEllipse(0, 0, eye.radiusX * 3, eye.radiusY * 2.8);
      graphics.restore();

      graphics.fillStyle(0x050505, 1);
      graphics.fillEllipse(pupilX, pupilY, eye.radiusX * (1.25 + armedProgress * 0.35), eye.radiusY * (1.2 + armedProgress * 0.28));
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
        position: { x: position.x + randomRange(-5, 5), y: position.y - 12 + randomRange(-5, 5) },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - randomRange(8, 32) },
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

    for (let index = this.explosionRings.length - 1; index >= 0; index -= 1) {
      const ring = this.explosionRings[index];
      ring.ageMs += deltaMs;
      if (ring.ageMs >= ring.durationMs) {
        this.explosionRings.splice(index, 1);
        continue;
      }
      const progress = ring.ageMs / ring.durationMs;
      graphics.lineStyle(7 * (1 - progress), 0xffcf57, 0.55 * (1 - progress));
      graphics.strokeCircle(ring.position.x, ring.position.y, ring.radius * progress);
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.ageMs += deltaMs;

      if (particle.ageMs >= particle.durationMs) {
        this.particles.splice(index, 1);
        continue;
      }

      particle.velocity.x *= 0.982;
      particle.velocity.y = particle.velocity.y * 0.982 + 110 * deltaSeconds;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = particle.ageMs / particle.durationMs;
      graphics.fillStyle(particle.color, (1 - progress) * 0.82);
      graphics.fillCircle(particle.position.x, particle.position.y, particle.radius * (1 - progress * 0.45));
    }
  }
}
