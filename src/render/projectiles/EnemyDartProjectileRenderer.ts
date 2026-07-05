import Phaser from 'phaser';

import type { EnemyDartProjectile, EnemyDartProjectileEvent } from '../../sim/projectiles';
import type { SimVector } from '../../sim/player';

interface DartVisual {
  readonly container: Phaser.GameObjects.Container;
}

interface DartImpactVisual {
  readonly position: SimVector;
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
      if (event.type === 'enemy-dart-expired') {
        continue;
      }

      this.impacts.push({
        position: event.position,
        color: event.type === 'enemy-dart-hit-player' ? PLAYER_IMPACT_COLOR : WALL_IMPACT_COLOR,
        ageMs: 0,
        durationMs: IMPACT_DURATION_MS
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

      for (let index = 1; index < dart.trail.length; index += 1) {
        const previous = dart.trail[index - 1];
        const point = dart.trail[index];
        const progress = index / Math.max(1, dart.trail.length - 1);

        graphics.lineStyle(5 * progress, TRAIL_COLOR, 0.05 + progress * 0.2);
        graphics.lineBetween(previous.x, previous.y, point.x, point.y);
      }
    }
  }

  private syncDarts(darts: readonly EnemyDartProjectile[]) {
    const activeIds = new Set<number>();

    for (const dart of darts) {
      activeIds.add(dart.id);

      const visual = this.darts.get(dart.id) ?? this.createDartVisual(dart.id);
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

  private createDartVisual(id: number): DartVisual {
    const shaft = this.scene.add.rectangle(-8, 0, 26, 4, SHAFT_COLOR, 1).setOrigin(0.5);
    const highlight = this.scene.add.rectangle(-7, -1.1, 18, 1.2, SHAFT_HIGHLIGHT, 0.66);
    const tip = this.scene.add.triangle(12, 0, -6, -6, 8, 0, -6, 6, TIP_COLOR, 1);
    const fletching = this.scene.add.triangle(-23, 0, 5, -5, -4, 0, 5, 5, FLETCHING_COLOR, 0.95);
    const container = this.scene.add.container(0, 0, [shaft, highlight, tip, fletching]);
    const visual = {
      container
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
      const radius = 3 + progress * 13;

      graphics.lineStyle(2, impact.color, alpha * 0.75);
      graphics.strokeCircle(impact.position.x, impact.position.y, radius);
      graphics.fillStyle(impact.color, alpha * 0.58);
      graphics.fillCircle(impact.position.x, impact.position.y, 2.1);
    }
  }
}
