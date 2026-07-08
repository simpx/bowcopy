import Phaser from 'phaser';

import kaboomletBaseUrl from '../../../assets/characters/kaboomlet/base.png';
import { KABOOMLET_RIG } from '../../characters/kaboomletRig';
import type { KaboomletEnemy, KaboomletEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';

interface KaboomletVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
}


interface ExplosionRing {
  position: SimVector;
  ageMs: number;
  durationMs: number;
  radius: number;
}

interface ExplosionCloud {
  position: SimVector;
  ageMs: number;
  durationMs: number;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SPAWN_COLORS = [0xffcf57, 0x303030, 0xffffff] as const;
const HIT_COLORS = [0xfff1b5, 0xff6a45] as const;
const EXPLOSION_COLORS = [0xffcf57, 0xff6a45, 0x111111] as const;
const WARNING_COLOR = 0xf1283e;
const BLAST_SHADOW = 0x111111;
const BLAST_RIM = 0xffcf57;
const BLAST_FILL = 0xfff3b4;
const BLAST_CORE = 0xfff8df;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));



const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadKaboomletAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(KABOOMLET_RIG.base.textureKey)) {
    scene.load.image(KABOOMLET_RIG.base.textureKey, kaboomletBaseUrl);
  }
};

export class KaboomletRenderer {
  private readonly visuals = new Map<number, KaboomletVisual>();
  private readonly explosionRings: ExplosionRing[] = [];
  private readonly explosionClouds: ExplosionCloud[] = [];
  private warningGraphics?: Phaser.GameObjects.Graphics;
  private readonly bursts: ParticleBurstPool;
  private explosionGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, { ...HOUSE_BURST_STYLE, ...{ originYOffset: -12, riseMax: 32, drag: 0.982, gravity: 110 } });
  }

  create() {
    this.warningGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH - 2);
    this.explosionGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
    this.bursts.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly KaboomletEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.drawWarningRings(timeMs, enemies);
    this.updateExplosionEffects(deltaMs);
    this.bursts.update(deltaMs);
  }

  playEvents(events: readonly KaboomletEvent[]) {
    for (const event of events) {
      if (event.type === 'kaboomlet-spawned') {
        this.bursts.emit(event.position, 12, SPAWN_COLORS, 32, 82, 4.6, 230);
        continue;
      }

      if (event.type === 'kaboomlet-hit') {
        this.bursts.emit(event.position, 8, HIT_COLORS, 34, 84, 3.8, 180);
        continue;
      }

      if (event.type === 'kaboomlet-killed') {
        this.bursts.emit(event.position, 24, EXPLOSION_COLORS, 54, 136, 5.4, 340);
        continue;
      }

      if (event.type === 'kaboomlet-exploded') {
        this.explosionRings.push({
          position: event.position,
          ageMs: 0,
          durationMs: 300,
          radius: event.radius
        });
        this.explosionClouds.push({
          position: event.position,
          ageMs: 0,
          durationMs: 230
        });
        this.bursts.emit(event.position, 36, EXPLOSION_COLORS, 78, 220, 6.2, 420);
      }
    }
  }

  destroy() {
    this.warningGraphics?.destroy();
    this.explosionGraphics?.destroy();
    this.bursts.destroy();
    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }
    this.visuals.clear();
    this.explosionRings.length = 0;
    this.explosionClouds.length = 0;
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
    const body = this.scene.add.image(0, 0, KABOOMLET_RIG.base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, KABOOMLET_RIG.base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { container, shadow, artLayer, body, eyes };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: KaboomletEnemy, visual: KaboomletVisual) {
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const idleBob = Math.sin(timeMs * 0.004 + enemy.id) * KABOOMLET_RIG.motion.idleBob;
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

    visual.artLayer.setPosition(0, KABOOMLET_RIG.base.y + idleBob);
    visual.artLayer.setScale(KABOOMLET_RIG.base.scale * scaleX, KABOOMLET_RIG.base.scale * scaleY);
    visual.body.setTint(hitFlash > 0 ? 0xfff1d0 : 0xffffff);
    this.drawKaboomletEyes(visual.eyes, normalize(enemy.facing), enemy.armedProgress);
  }

  private drawKaboomletEyes(
    graphics: Phaser.GameObjects.Graphics,
    facing: SimVector,
    armedProgress: number
  ) {
    const { width, height } = KABOOMLET_RIG.base.imageSize;
    const offsetX = Phaser.Math.Clamp(facing.x, -1, 1) * width * KABOOMLET_RIG.gaze.pupilOffsetScale.x;
    const offsetY = Phaser.Math.Clamp(facing.y, -1, 1) * height * KABOOMLET_RIG.gaze.pupilOffsetScale.y;

    graphics.clear();
    graphics.fillStyle(0x050505, 1);

    for (const name of ['left', 'right'] as const) {
      const eye = KABOOMLET_RIG.gaze.eyes[name];
      const x = (eye.x - 0.5) * width + offsetX;
      const y = (eye.y - 0.5) * height + offsetY;
      const pupilWidth = eye.radiusX * width * (1.2 + armedProgress * 0.28);
      const pupilHeight = eye.radiusY * height * (1.14 + armedProgress * 0.2);

      graphics.save();
      graphics.translateCanvas(x, y);
      graphics.rotateCanvas(eye.rotation);
      graphics.fillEllipse(0, 0, pupilWidth, pupilHeight);
      graphics.restore();
    }
  }

  private drawWarningRings(timeMs: number, enemies: readonly KaboomletEnemy[]) {
    const graphics = this.warningGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const enemy of enemies) {
      if (enemy.phase !== 'armed') {
        continue;
      }

      const pulse = (Math.sin(timeMs * 0.016) + 1) / 2;
      const alpha = 0.34 + enemy.armedProgress * 0.34 + pulse * 0.2;
      const radius = KABOOMLET_RIG.explosion.radius * (0.86 + enemy.armedProgress * 0.14);

      this.strokeDashedCircle(graphics, enemy.position.x, enemy.position.y, radius, WARNING_COLOR, alpha);
    }
  }

  private strokeDashedCircle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number
  ) {
    const dashAngle = 0.18;
    const gapAngle = 0.12;

    graphics.lineStyle(5, color, alpha);

    for (let angle = 0; angle < Math.PI * 2; angle += dashAngle + gapAngle) {
      const end = Math.min(Math.PI * 2, angle + dashAngle);
      graphics.beginPath();
      graphics.arc(x, y, radius, angle, end, false);
      graphics.strokePath();
    }
  }

  private updateExplosionEffects(deltaMs: number) {
    const graphics = this.explosionGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (let index = this.explosionClouds.length - 1; index >= 0; index -= 1) {
      const cloud = this.explosionClouds[index];
      cloud.ageMs += deltaMs;

      if (cloud.ageMs >= cloud.durationMs) {
        this.explosionClouds.splice(index, 1);
        continue;
      }

      const progress = cloud.ageMs / cloud.durationMs;
      this.drawExplosionCloud(graphics, cloud.position, progress);
    }

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
  }

  private drawExplosionCloud(
    graphics: Phaser.GameObjects.Graphics,
    position: SimVector,
    progress: number
  ) {
    const alpha = 1 - Math.max(0, progress - 0.72) / 0.28;
    const radius = 42 + progress * 30;
    const cloud = [
      { x: 0, y: 0, scale: 1 },
      { x: -0.42, y: 0.08, scale: 0.68 },
      { x: 0.38, y: -0.2, scale: 0.62 },
      { x: 0.26, y: 0.42, scale: 0.55 },
      { x: -0.08, y: -0.44, scale: 0.48 }
    ];

    graphics.fillStyle(BLAST_SHADOW, alpha * 0.72);
    for (const item of cloud) {
      graphics.fillCircle(
        position.x + item.x * radius + 4,
        position.y + item.y * radius + 5,
        radius * item.scale * 0.62
      );
    }

    graphics.fillStyle(BLAST_RIM, alpha);
    for (const item of cloud) {
      graphics.fillCircle(
        position.x + item.x * radius,
        position.y + item.y * radius,
        radius * item.scale * 0.58
      );
    }

    graphics.fillStyle(BLAST_FILL, alpha);
    for (const item of cloud) {
      graphics.fillCircle(
        position.x + item.x * radius * 0.78,
        position.y + item.y * radius * 0.78,
        radius * item.scale * 0.46
      );
    }

    graphics.fillStyle(BLAST_CORE, alpha);
    graphics.fillCircle(position.x - radius * 0.12, position.y + radius * 0.04, radius * 0.36);
  }
}
