import Phaser from 'phaser';

import type {
  EnemyDartProjectile,
  EnemyDartProjectileEvent,
  EnemyProjectileStyle
} from '../../sim/projectiles';
import type { SimVector } from '../../sim/player';

interface DartVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly style: EnemyProjectileStyle;
}

interface DartImpactVisual {
  readonly position: SimVector;
  readonly style: EnemyProjectileStyle;
  readonly hitPlayer: boolean;
  readonly color: number;
  ageMs: number;
  durationMs: number;
}

const SHAFT_COLOR = 0x2f5331;
const SHAFT_HIGHLIGHT = 0xc9f19c;
const TIP_COLOR = 0xf36b4e;
const FLETCHING_COLOR = 0x9fe071;
const TRAIL_COLOR = 0xc2f26d;
const WALL_IMPACT_COLOR = 0xd7ffa7;
const PLAYER_IMPACT_COLOR = 0xffd0a1;
const IMPACT_DURATION_MS = 190;
const INK_BODY_COLOR = 0x050504;
const INK_HIGHLIGHT_COLOR = 0x2d2b28;
const INK_IMPACT_DURATION_MS = 260;

export const preloadEnemyDartProjectileAssets = (_scene: Phaser.Scene) => {};

export class EnemyDartProjectileRenderer {
  private readonly darts = new Map<number, DartVisual>();
  private readonly impacts: DartImpactVisual[] = [];
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private impactGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.trailGraphics = this.scene.add.graphics().setDepth(54);
    this.impactGraphics = this.scene.add.graphics().setDepth(55);
  }

  update(deltaMs: number, darts: readonly EnemyDartProjectile[]) {
    this.drawTrails(darts);
    this.syncDarts(darts);
    this.updateImpacts(deltaMs);
  }

  playEvents(events: readonly EnemyDartProjectileEvent[]) {
    for (const event of events) {
      if (event.type === 'enemy-dart-expired' && event.style !== 'black-ink') {
        continue;
      }

      this.impacts.push({
        position: event.position,
        style: event.style,
        hitPlayer: event.type === 'enemy-dart-hit-player',
        color:
          event.style === 'black-ink'
            ? INK_BODY_COLOR
            : event.type === 'enemy-dart-hit-player'
              ? PLAYER_IMPACT_COLOR
              : WALL_IMPACT_COLOR,
        ageMs: 0,
        durationMs: event.style === 'black-ink' ? INK_IMPACT_DURATION_MS : IMPACT_DURATION_MS
      });
    }
  }

  destroy() {
    this.trailGraphics?.destroy();
    this.impactGraphics?.destroy();

    for (const dart of this.darts.values()) {
      dart.container.destroy();
    }

    this.darts.clear();
    this.impacts.length = 0;
  }

  private drawTrails(darts: readonly EnemyDartProjectile[]) {
    const graphics = this.trailGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const dart of darts) {
      if (dart.trail.length < 2) {
        continue;
      }

      if (dart.style === 'black-ink') {
        this.drawInkTrail(graphics, dart);
        continue;
      }

      for (let index = 1; index < dart.trail.length; index += 1) {
        const previous = dart.trail[index - 1];
        const point = dart.trail[index];
        const progress = index / Math.max(1, dart.trail.length - 1);

        graphics.lineStyle(5 * progress, TRAIL_COLOR, 0.05 + progress * 0.2);
        graphics.lineBetween(previous.x, previous.y, point.x, point.y);
      }
    }
  }

  private drawInkTrail(graphics: Phaser.GameObjects.Graphics, dart: EnemyDartProjectile) {
    for (let index = 1; index < dart.trail.length; index += 1) {
      const point = dart.trail[index];
      const progress = index / Math.max(1, dart.trail.length - 1);
      const speckCount = 1 + Math.round(progress * 2);

      for (let speck = 0; speck < speckCount; speck += 1) {
        const seed = dart.id * 37 + index * 11 + speck * 17;
        const offsetX = (this.stableNoise(seed) - 0.5) * 12;
        const offsetY = (this.stableNoise(seed + 7) - 0.5) * 10;
        const radius = 0.9 + this.stableNoise(seed + 13) * (1.2 + progress * 1.6);

        graphics.fillStyle(INK_BODY_COLOR, 0.1 + progress * 0.4);
        graphics.fillCircle(point.x + offsetX, point.y + offsetY, radius);
      }
    }
  }

  private syncDarts(darts: readonly EnemyDartProjectile[]) {
    const activeIds = new Set<number>();

    for (const dart of darts) {
      activeIds.add(dart.id);

      let visual = this.darts.get(dart.id);
      if (visual && visual.style !== dart.style) {
        visual.container.destroy();
        this.darts.delete(dart.id);
        visual = undefined;
      }
      visual ??= this.createDartVisual(dart.id, dart.style);
      const angle = Math.atan2(dart.direction.y, dart.direction.x);

      visual.container.setPosition(dart.position.x, dart.position.y);
      visual.container.setRotation(angle);
      visual.container.setDepth(57 + dart.position.y / 1000);
    }

    for (const [id, visual] of this.darts) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.darts.delete(id);
      }
    }
  }

  private createDartVisual(id: number, style: EnemyProjectileStyle): DartVisual {
    if (style === 'black-ink') {
      return this.createInkVisual(id);
    }

    const shaft = this.scene.add.rectangle(-8, 0, 26, 4, SHAFT_COLOR, 1).setOrigin(0.5);
    const highlight = this.scene.add.rectangle(-7, -1.1, 18, 1.2, SHAFT_HIGHLIGHT, 0.66);
    const tip = this.scene.add.triangle(12, 0, -6, -6, 8, 0, -6, 6, TIP_COLOR, 1);
    const fletching = this.scene.add.triangle(-23, 0, 5, -5, -4, 0, 5, 5, FLETCHING_COLOR, 0.95);
    const container = this.scene.add.container(0, 0, [shaft, highlight, tip, fletching]);
    const visual = {
      container,
      style
    };

    this.darts.set(id, visual);

    return visual;
  }

  /** Solid black bullet head per the source reference (spooper-gooper
   *  source/video-black-bullet-reference.jpg): round nose, tapered tail. */
  private createInkVisual(id: number): DartVisual {
    const ink = this.scene.add.graphics();

    // Teardrop pointing +x: round nose at the front, tail tapering behind.
    ink.fillStyle(INK_BODY_COLOR, 1);
    ink.beginPath();
    ink.arc(4, 0, 9, -Math.PI / 2, Math.PI / 2, false);
    ink.lineTo(-16, 3.2);
    ink.arc(-16, 0, 3.2, Math.PI / 2, (3 * Math.PI) / 2, false);
    ink.closePath();
    ink.fillPath();

    ink.fillStyle(INK_HIGHLIGHT_COLOR, 0.5);
    ink.fillCircle(6, -3.4, 1.7);

    const container = this.scene.add.container(0, 0, [ink]);
    const visual = {
      container,
      style: 'black-ink' as const
    };

    this.darts.set(id, visual);

    return visual;
  }

  private updateImpacts(deltaMs: number) {
    const graphics = this.impactGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (let index = this.impacts.length - 1; index >= 0; index -= 1) {
      const impact = this.impacts[index];

      impact.ageMs += deltaMs;

      if (impact.ageMs >= impact.durationMs) {
        this.impacts.splice(index, 1);
        continue;
      }

      const progress = impact.ageMs / impact.durationMs;
      const alpha = 1 - progress;

      if (impact.style === 'black-ink') {
        this.drawInkImpact(graphics, impact, progress, alpha);
        continue;
      }

      const radius = 3 + progress * 13;

      graphics.lineStyle(2, impact.color, alpha * 0.75);
      graphics.strokeCircle(impact.position.x, impact.position.y, radius);
      graphics.fillStyle(impact.color, alpha * 0.58);
      graphics.fillCircle(impact.position.x, impact.position.y, 2.1);
    }
  }

  private drawInkImpact(
    graphics: Phaser.GameObjects.Graphics,
    impact: DartImpactVisual,
    progress: number,
    alpha: number
  ) {
    const radius = 8 + progress * (impact.hitPlayer ? 22 : 20);
    const cloud = [
      { x: 0, y: 0, scale: 1 },
      { x: -0.5, y: 0.12, scale: 0.66 },
      { x: 0.42, y: -0.24, scale: 0.58 },
      { x: 0.24, y: 0.48, scale: 0.5 },
      { x: -0.18, y: -0.44, scale: 0.44 }
    ];

    graphics.fillStyle(impact.color, alpha * 0.74);
    for (const puff of cloud) {
      graphics.fillCircle(
        impact.position.x + puff.x * radius,
        impact.position.y + puff.y * radius,
        radius * puff.scale
      );
    }

    const speckColor = impact.hitPlayer ? PLAYER_IMPACT_COLOR : 0xffffff;
    graphics.fillStyle(speckColor, alpha * (impact.hitPlayer ? 0.32 : 0.42));
    for (let index = 0; index < 18; index += 1) {
      const theta = this.stableNoise(index + 4) * Math.PI * 2;
      const distance = radius * (0.25 + this.stableNoise(index + 11) * 1.08);
      graphics.fillCircle(
        impact.position.x + Math.cos(theta) * distance,
        impact.position.y + Math.sin(theta) * distance,
        1 + this.stableNoise(index + 21) * 1.8
      );
    }
  }

  private stableNoise(seed: number): number {
    const value = Math.sin(seed * 12.9898) * 43758.5453;

    return value - Math.floor(value);
  }
}
