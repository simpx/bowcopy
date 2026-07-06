import Phaser from 'phaser';

import { PURPLE_SHROOM_CHARACTER, RED_SHROOM_CHARACTER } from '../characters/layeredCharacterConfig';
import type {
  ShroomSporeProjectile,
  ShroomSporeProjectileEvent
} from '../../sim/projectiles';
import type { SimVector } from '../../sim/player';

interface SporeVisual {
  readonly sprite: Phaser.GameObjects.Image;
}

interface SporeImpactVisual {
  readonly position: SimVector;
  readonly color: number;
  ageMs: number;
  durationMs: number;
}

const SPORE_DEPTH = 58;
const TRAIL_DEPTH = 54;
const IMPACT_DEPTH = 60;
const PLAYER_IMPACT_COLOR = 0xffd0d5;
const EXPIRE_COLOR = 0xff7380;
const IMPACT_DURATION_MS = 210;
const SPORE_CONFIGS = {
  red: RED_SHROOM_CHARACTER.spores,
  purple: PURPLE_SHROOM_CHARACTER.spores
} as const;

export const preloadShroomSporeProjectileAssets = (scene: Phaser.Scene) => {
  for (const config of Object.values(SPORE_CONFIGS)) {
    if (!scene.textures.exists(config.textureKey)) {
      scene.load.image(config.textureKey, config.imageUrl);
    }
  }
};

export class ShroomSporeProjectileRenderer {
  private readonly spores = new Map<number, SporeVisual>();
  private readonly impacts: SporeImpactVisual[] = [];
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private impactGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.trailGraphics = this.scene.add.graphics().setDepth(TRAIL_DEPTH);
    this.impactGraphics = this.scene.add.graphics().setDepth(IMPACT_DEPTH);
  }

  update(deltaMs: number, spores: readonly ShroomSporeProjectile[]) {
    this.drawTrails(spores);
    this.syncSpores(spores);
    this.updateImpacts(deltaMs);
  }

  playEvents(events: readonly ShroomSporeProjectileEvent[]) {
    for (const event of events) {
      this.impacts.push({
        position: event.position,
        color: event.type === 'shroom-spore-hit-player' ? PLAYER_IMPACT_COLOR : EXPIRE_COLOR,
        ageMs: 0,
        durationMs: IMPACT_DURATION_MS
      });
    }
  }

  destroy() {
    this.trailGraphics?.destroy();
    this.impactGraphics?.destroy();

    for (const spore of this.spores.values()) {
      spore.sprite.destroy();
    }

    this.spores.clear();
    this.impacts.length = 0;
  }

  private drawTrails(spores: readonly ShroomSporeProjectile[]) {
    const graphics = this.trailGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const spore of spores) {
      if (spore.trail.length < 2) {
        continue;
      }

      for (let index = 1; index < spore.trail.length; index += 1) {
        const previous = spore.trail[index - 1];
        const point = spore.trail[index];
        const progress = index / Math.max(1, spore.trail.length - 1);
        const width = SPORE_CONFIGS[spore.variant].trailWidth * progress;

        graphics.lineStyle(width, spore.color, 0.04 + progress * 0.28);
        graphics.lineBetween(previous.x, previous.y, point.x, point.y);
      }
    }
  }

  private syncSpores(spores: readonly ShroomSporeProjectile[]) {
    const activeIds = new Set<number>();

    for (const spore of spores) {
      activeIds.add(spore.id);

      const visual = this.spores.get(spore.id) ?? this.createSporeVisual(spore.id, spore.variant);
      const travelProgress = Math.min(1, spore.ageMs / spore.travelMs);
      const wobble = Math.sin(spore.ageMs * 0.026 + spore.id) * 0.08;
      const config = SPORE_CONFIGS[spore.variant];
      const scale = config.scale * (0.78 + travelProgress * 0.22);

      if (visual.sprite.texture.key !== config.textureKey) {
        visual.sprite.setTexture(config.textureKey);
      }

      visual.sprite.setPosition(spore.position.x, spore.position.y);
      visual.sprite.setRotation(Math.atan2(spore.direction.y, spore.direction.x) + wobble);
      visual.sprite.setDepth(SPORE_DEPTH + spore.position.y / 1000);
      visual.sprite.setScale(scale);
      visual.sprite.setAlpha(spore.ageMs > spore.travelMs ? 0.84 : 1);
    }

    for (const [id, visual] of this.spores) {
      if (!activeIds.has(id)) {
        visual.sprite.destroy();
        this.spores.delete(id);
      }
    }
  }

  private createSporeVisual(id: number, variant: ShroomSporeProjectile['variant']): SporeVisual {
    const sprite = this.scene.add
      .image(0, 0, SPORE_CONFIGS[variant].textureKey)
      .setOrigin(0.5);
    const visual = { sprite };

    this.spores.set(id, visual);

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
      const radius = 4 + progress * 18;

      graphics.lineStyle(3, impact.color, alpha * 0.72);
      graphics.strokeCircle(impact.position.x, impact.position.y, radius);
      graphics.fillStyle(impact.color, alpha * 0.54);
      graphics.fillCircle(impact.position.x, impact.position.y, 2.6);
    }
  }
}
