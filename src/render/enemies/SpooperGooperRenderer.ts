import Phaser from 'phaser';

import spooperGooperBaseUrl from '../../../assets/characters/spooper-gooper/base.png';
import { SPOOPER_GOOPER_RIG } from '../../characters/spooperGooperRig';
import type { SimVector } from '../../sim/player';
import type { SpooperGooperEnemy, SpooperGooperEvent } from '../../sim/enemies';

interface SpooperGooperVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
}

interface SpooperGooperParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

const HIT_FLASH_MS = 180;
const PARTICLE_DEPTH = 78;
const APPEAR_COLORS = [0xcfe7ff, 0xffffff, 0x7c8ba8] as const;
const HIT_COLORS = [0xffffff, 0xa9d5ff] as const;
const DEATH_COLORS = [0xcfe7ff, 0xffffff, 0x111111] as const;

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

export const preloadSpooperGooperAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(SPOOPER_GOOPER_RIG.base.textureKey)) {
    scene.load.image(SPOOPER_GOOPER_RIG.base.textureKey, spooperGooperBaseUrl);
  }
};

export class SpooperGooperRenderer {
  private readonly visuals = new Map<number, SpooperGooperVisual>();
  private readonly particles: SpooperGooperParticle[] = [];
  private particleGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(_timeMs: number, deltaMs: number, enemies: readonly SpooperGooperEnemy[]) {
    this.syncEnemies(enemies);
    this.updateParticles(deltaMs);
  }

  playEvents(events: readonly SpooperGooperEvent[]) {
    for (const event of events) {
      if (event.type === 'spooper-gooper-appeared' || event.type === 'spooper-gooper-vanished') {
        this.emitBurst(event.position, 12, APPEAR_COLORS, 22, 64, 4.4, 230);
        continue;
      }

      if (event.type === 'spooper-gooper-hit') {
        this.emitBurst(event.position, 8, HIT_COLORS, 34, 84, 3.8, 180);
        continue;
      }

      if (event.type === 'spooper-gooper-killed') {
        this.emitBurst(event.position, 30, DEATH_COLORS, 58, 148, 5.7, 380);
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

  private syncEnemies(enemies: readonly SpooperGooperEnemy[]) {
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);
      const visual = this.visuals.get(enemy.id) ?? this.createVisual(enemy.id);
      this.updateVisual(enemy, visual);
    }

    for (const [id, visual] of this.visuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.visuals.delete(id);
      }
    }
  }

  private createVisual(id: number): SpooperGooperVisual {
    const shadow = this.scene.add.ellipse(
      0,
      SPOOPER_GOOPER_RIG.base.shadow.y,
      SPOOPER_GOOPER_RIG.base.shadow.width,
      SPOOPER_GOOPER_RIG.base.shadow.height,
      0x07120d,
      0.2
    );
    const body = this.scene.add.image(0, 0, SPOOPER_GOOPER_RIG.base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, SPOOPER_GOOPER_RIG.base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { container, shadow, artLayer, body, eyes };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(enemy: SpooperGooperEnemy, visual: SpooperGooperVisual) {
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const hover = Math.sin(enemy.hoverPhase) * SPOOPER_GOOPER_RIG.motion.hoverBob;
    const drift = Math.cos(enemy.hoverPhase * 0.63) * SPOOPER_GOOPER_RIG.motion.hoverDrift * 0.12;
    const appearSquash = enemy.phase === 'appearing' || enemy.phase === 'disappearing'
      ? (1 - Math.abs(enemy.visibility - 0.5) * 2) * 0.18
      : 0;
    const attackSquash = enemy.attackCharge * 0.12;
    const scaleX = 1 + appearSquash + attackSquash + hitFlash * SPOOPER_GOOPER_RIG.motion.hitScaleX;
    const scaleY = 1 - appearSquash * 0.5 + attackSquash * 0.4 - hitFlash * SPOOPER_GOOPER_RIG.motion.hitScaleY;

    visual.container.setPosition(enemy.position.x + drift, enemy.position.y - hover);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setAlpha(enemy.visibility);

    visual.shadow.setScale(0.7 + enemy.visibility * 0.3, 1);
    visual.shadow.setAlpha(0.08 + enemy.visibility * 0.16);

    visual.artLayer.setPosition(0, SPOOPER_GOOPER_RIG.base.y);
    visual.artLayer.setScale(SPOOPER_GOOPER_RIG.base.scale * scaleX, SPOOPER_GOOPER_RIG.base.scale * scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);
    this.drawGhostEyes(visual.eyes, normalize(enemy.facing), enemy.attackCharge);
  }

  private drawGhostEyes(
    graphics: Phaser.GameObjects.Graphics,
    facing: SimVector,
    attackCharge: number
  ) {
    const { width, height } = SPOOPER_GOOPER_RIG.base.imageSize;
    const offsetX =
      Phaser.Math.Clamp(facing.x, -1, 1) * width * SPOOPER_GOOPER_RIG.gaze.pupilOffsetScale.x;
    const offsetY =
      Phaser.Math.Clamp(facing.y, -1, 1) * height * SPOOPER_GOOPER_RIG.gaze.pupilOffsetScale.y;

    graphics.clear();
    graphics.fillStyle(0x050505, 1);

    for (const name of ['left', 'right'] as const) {
      const eye = SPOOPER_GOOPER_RIG.gaze.eyes[name];
      const x = (eye.x - 0.5) * width + offsetX;
      const y = (eye.y - 0.5) * height + offsetY;
      const pupilWidth = eye.radiusX * width * (1.1 + attackCharge * 0.25);
      const pupilHeight = eye.radiusY * height * (1.05 + attackCharge * 0.16);

      graphics.save();
      graphics.translateCanvas(x, y);
      graphics.rotateCanvas(eye.rotation);
      graphics.fillEllipse(0, 0, pupilWidth, pupilHeight);
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
        position: { x: position.x + randomRange(-5, 5), y: position.y - 14 + randomRange(-5, 5) },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - randomRange(5, 20) },
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

      particle.velocity.x *= 0.986;
      particle.velocity.y *= 0.986;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = particle.ageMs / particle.durationMs;
      graphics.fillStyle(particle.color, (1 - progress) * 0.72);
      graphics.fillCircle(particle.position.x, particle.position.y, particle.radius * (1 - progress * 0.42));
    }
  }
}
