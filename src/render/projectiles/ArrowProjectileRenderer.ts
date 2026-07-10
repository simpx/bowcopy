import Phaser from 'phaser';

import type { ArrowProjectile, ArrowProjectileEvent } from '../../sim/projectiles';
import type { SimVector } from '../../sim/player';

interface ArrowVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shaft: Phaser.GameObjects.Rectangle;
  readonly head: Phaser.GameObjects.Triangle;
  readonly fletching: Phaser.GameObjects.Triangle;
}

interface ImpactVisual {
  readonly position: SimVector;
  ageMs: number;
  durationMs: number;
}

const SHAFT_COLOR = 0x5d3b2c;
const SHAFT_HIGHLIGHT = 0xf7ead7;
const HEAD_COLOR = 0xffcf57;
const FLETCHING_COLOR = 0xeef7ff;
const TRAIL_COLOR = 0xffd06a;
const IMPACT_COLOR = 0xfff1b5;
const IMPACT_DURATION_MS = 180;

export const preloadArrowProjectileAssets = (_scene: Phaser.Scene) => {};

export class ArrowProjectileRenderer {
  private readonly arrows = new Map<number, ArrowVisual>();
  private readonly impacts: ImpactVisual[] = [];
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private impactGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.trailGraphics = this.scene.add.graphics().setDepth(58);
    this.impactGraphics = this.scene.add.graphics().setDepth(59);
  }

  update(deltaMs: number, arrows: readonly ArrowProjectile[]) {
    this.drawTrails(arrows);
    this.syncArrows(arrows);
    this.updateImpacts(deltaMs);
  }

  playEvents(events: readonly ArrowProjectileEvent[]) {
    for (const event of events) {
      if (event.type === 'arrow-hit-boundary') {
        this.impacts.push({
          position: event.position,
          ageMs: 0,
          durationMs: IMPACT_DURATION_MS
        });
        continue;
      }

      // Max range reached: the arrow falters — same dust language as a
      // wall hit, slightly softer, so the range cap reads as intentional.
      if (event.type === 'arrow-expired') {
        this.impacts.push({
          position: event.position,
          ageMs: 0,
          durationMs: IMPACT_DURATION_MS * 0.7
        });
      }
    }
  }

  destroy() {
    this.trailGraphics?.destroy();
    this.impactGraphics?.destroy();

    for (const arrow of this.arrows.values()) {
      arrow.container.destroy();
    }

    this.arrows.clear();
    this.impacts.length = 0;
  }

  private drawTrails(arrows: readonly ArrowProjectile[]) {
    const graphics = this.trailGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const arrow of arrows) {
      if (arrow.trail.length < 2) {
        continue;
      }

      for (let index = 1; index < arrow.trail.length; index += 1) {
        const previous = arrow.trail[index - 1];
        const point = arrow.trail[index];
        const progress = index / Math.max(1, arrow.trail.length - 1);

        graphics.lineStyle(7 * progress, TRAIL_COLOR, 0.08 + progress * 0.2);
        graphics.lineBetween(previous.x, previous.y, point.x, point.y);
      }
    }
  }

  private syncArrows(arrows: readonly ArrowProjectile[]) {
    const activeIds = new Set<number>();

    for (const arrow of arrows) {
      activeIds.add(arrow.id);

      const visual = this.arrows.get(arrow.id) ?? this.createArrowVisual(arrow.id);
      const angle = Math.atan2(arrow.direction.y, arrow.direction.x);

      visual.container.setPosition(arrow.position.x, arrow.position.y);
      visual.container.setRotation(angle);
      visual.container.setDepth(62 + arrow.position.y / 1000);
    }

    for (const [id, visual] of this.arrows) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.arrows.delete(id);
      }
    }
  }

  private createArrowVisual(id: number): ArrowVisual {
    const shaft = this.scene.add.rectangle(-15, 0, 34, 4, SHAFT_COLOR, 1).setOrigin(0.5);
    const highlight = this.scene.add.rectangle(-14, -1.2, 24, 1.3, SHAFT_HIGHLIGHT, 0.7);
    const head = this.scene.add.triangle(18, 0, -7, -7, 8, 0, -7, 7, HEAD_COLOR, 1);
    const fletching = this.scene.add.triangle(-31, 0, 7, -6, -5, 0, 7, 6, FLETCHING_COLOR, 0.95);
    const container = this.scene.add.container(0, 0, [shaft, highlight, head, fletching]);
    const visual = {
      container,
      shaft,
      head,
      fletching
    };

    this.arrows.set(id, visual);

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
      const radius = 4 + progress * 16;
      const alpha = 1 - progress;

      graphics.lineStyle(2, IMPACT_COLOR, alpha * 0.75);
      graphics.strokeCircle(impact.position.x, impact.position.y, radius);
      graphics.fillStyle(IMPACT_COLOR, alpha * 0.65);
      graphics.fillCircle(impact.position.x, impact.position.y, 2.2);
    }
  }
}
