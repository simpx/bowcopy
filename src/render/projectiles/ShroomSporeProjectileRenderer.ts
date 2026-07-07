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

interface SporeCloudParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  alpha: number;
  ageMs: number;
  durationMs: number;
}

const SPORE_DEPTH = 58;
const TRAIL_DEPTH = 54;
const CLOUD_DEPTH = 55;
const IMPACT_DEPTH = 60;
const PLAYER_IMPACT_COLOR = 0xffd0d5;
const DODGE_BREAK_COLOR = 0x9eefff;
const EXPIRE_COLOR = 0xff7380;
const IMPACT_DURATION_MS = 210;
const MAX_CLOUD_PARTICLES = 360;
const CLOUD_COLORS: Record<ShroomSporeProjectile['variant'], readonly number[]> = {
  red: [0xff4d54, 0xff7380, 0xffb19a],
  purple: [0x8d75ff, 0x6f8dff, 0x6ed4ff, 0xb8aaff]
};
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
  private readonly cloudParticles: SporeCloudParticle[] = [];
  private readonly cloudEmitMs = new Map<number, number>();
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private cloudGraphics?: Phaser.GameObjects.Graphics;
  private impactGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.trailGraphics = this.scene.add.graphics().setDepth(TRAIL_DEPTH);
    this.cloudGraphics = this.scene.add.graphics().setDepth(CLOUD_DEPTH);
    this.impactGraphics = this.scene.add.graphics().setDepth(IMPACT_DEPTH);
  }

  update(deltaMs: number, spores: readonly ShroomSporeProjectile[]) {
    this.drawTrails(spores);
    this.emitSporeClouds(deltaMs, spores);
    this.syncSpores(spores);
    this.updateClouds(deltaMs);
    this.updateImpacts(deltaMs);
  }

  playEvents(events: readonly ShroomSporeProjectileEvent[]) {
    for (const event of events) {
      const color =
        event.type === 'shroom-spore-hit-player'
          ? PLAYER_IMPACT_COLOR
          : event.type === 'shroom-spore-dodge-broken'
            ? DODGE_BREAK_COLOR
            : EXPIRE_COLOR;

      this.impacts.push({
        position: event.position,
        color,
        ageMs: 0,
        durationMs: event.type === 'shroom-spore-dodge-broken' ? 260 : IMPACT_DURATION_MS
      });

      this.emitImpactCloud(event.position, color, event.type === 'shroom-spore-dodge-broken' ? 18 : 10);
    }
  }

  destroy() {
    this.trailGraphics?.destroy();
    this.cloudGraphics?.destroy();
    this.impactGraphics?.destroy();

    for (const spore of this.spores.values()) {
      spore.sprite.destroy();
    }

    this.spores.clear();
    this.impacts.length = 0;
    this.cloudParticles.length = 0;
    this.cloudEmitMs.clear();
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

      const lingerProgress =
        spore.ageMs <= spore.travelMs
          ? 0
          : Math.min(1, (spore.ageMs - spore.travelMs) / Math.max(1, spore.lingerMs));
      const fade = 1 - lingerProgress * 0.78;
      const config = SPORE_CONFIGS[spore.variant];
      const tailStartIndex = 1;
      const dotCount = spore.variant === 'purple' ? 7 : 5;
      const highlightColor = spore.variant === 'purple' ? 0xb8aaff : 0xffb19a;

      for (let index = tailStartIndex; index < spore.trail.length; index += 1) {
        const previous = spore.trail[index - 1];
        const point = spore.trail[index];
        const progress = (index - tailStartIndex) / Math.max(1, spore.trail.length - tailStartIndex - 1);
        const spread = config.trailWidth * (0.2 + progress * 0.18);
        const alpha = (0.2 + progress * 0.34) * fade;
        const tangent = {
          x: point.x - previous.x,
          y: point.y - previous.y
        };
        const tangentLength = Math.max(1, Math.hypot(tangent.x, tangent.y));
        const normal = {
          x: -tangent.y / tangentLength,
          y: tangent.x / tangentLength
        };

        for (let dot = 0; dot < dotCount; dot += 1) {
          const seed = spore.id * 31.7 + index * 11.3 + dot * 5.1;
          const along = 0.18 + (dot / Math.max(1, dotCount - 1)) * 0.7;
          const side = Math.sin(seed) * spread;
          const back = Math.cos(seed * 1.7) * spread * 0.55;
          const radius = Math.max(1.4, config.trailWidth * (0.07 + progress * 0.05));
          const x = previous.x + (point.x - previous.x) * along + normal.x * side - spore.direction.x * back;
          const y = previous.y + (point.y - previous.y) * along + normal.y * side - spore.direction.y * back;

          graphics.fillStyle(dot % 4 === 0 ? highlightColor : spore.color, alpha * (0.62 + progress * 0.22));
          graphics.fillCircle(x, y, radius);
        }
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

  private emitSporeClouds(deltaMs: number, spores: readonly ShroomSporeProjectile[]) {
    const activeIds = new Set<number>();

    for (const spore of spores) {
      activeIds.add(spore.id);

      const intervalMs = spore.ageMs <= spore.travelMs
        ? spore.variant === 'purple' ? 34 : 42
        : spore.variant === 'purple' ? 58 : 72;
      let emitMs = (this.cloudEmitMs.get(spore.id) ?? 0) + deltaMs;
      let emitted = 0;

      while (emitMs >= intervalMs && emitted < 3) {
        emitMs -= intervalMs;
        emitted += 1;
        this.emitSporeCloud(spore);
      }

      this.cloudEmitMs.set(spore.id, emitMs);
    }

    for (const id of this.cloudEmitMs.keys()) {
      if (!activeIds.has(id)) {
        this.cloudEmitMs.delete(id);
      }
    }
  }

  private emitSporeCloud(spore: ShroomSporeProjectile) {
    const travelProgress = Math.min(1, spore.ageMs / Math.max(1, spore.travelMs));
    const isLingering = spore.ageMs > spore.travelMs;
    const normal = {
      x: -spore.direction.y,
      y: spore.direction.x
    };
    const colors = CLOUD_COLORS[spore.variant];
    const count = isLingering
      ? spore.variant === 'purple' ? 5 : 3
      : spore.variant === 'purple' ? 8 : 5;

    for (let index = 0; index < count; index += 1) {
      const side = randomRange(-1, 1);
      const back = isLingering ? randomRange(-10, 10) : randomRange(8, 30);
      const spread = isLingering ? randomRange(8, 26) : randomRange(5, 18);
      const position = {
        x: spore.position.x - spore.direction.x * back + normal.x * side * spread,
        y: spore.position.y - spore.direction.y * back + normal.y * side * spread
      };
      const drift = isLingering ? randomRange(12, 32) : randomRange(18, 52);
      const velocity = {
        x: -spore.direction.x * randomRange(8, 24) + normal.x * side * drift,
        y: -spore.direction.y * randomRange(8, 24) + normal.y * side * drift - randomRange(2, 18)
      };

      this.pushCloudParticle({
        position,
        velocity,
        color: randomColor(colors),
        radius: randomRange(1.3, spore.variant === 'purple' ? 3.2 : 2.8) * (0.78 + travelProgress * 0.24),
        alpha: randomRange(0.34, spore.variant === 'purple' ? 0.58 : 0.48),
        ageMs: 0,
        durationMs: randomRange(isLingering ? 520 : 340, isLingering ? 840 : 620)
      });
    }
  }

  private emitImpactCloud(position: SimVector, color: number, count: number) {
    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(24, 112);

      this.pushCloudParticle({
        position: {
          x: position.x + randomRange(-4, 4),
          y: position.y + randomRange(-4, 4)
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - randomRange(8, 28)
        },
        color,
        radius: randomRange(2, 5.4),
        alpha: randomRange(0.24, 0.46),
        ageMs: 0,
        durationMs: randomRange(360, 720)
      });
    }
  }

  private pushCloudParticle(particle: SporeCloudParticle) {
    this.cloudParticles.push(particle);

    if (this.cloudParticles.length > MAX_CLOUD_PARTICLES) {
      this.cloudParticles.splice(0, this.cloudParticles.length - MAX_CLOUD_PARTICLES);
    }
  }

  private updateClouds(deltaMs: number) {
    const graphics = this.cloudGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    const deltaSeconds = deltaMs / 1000;

    for (let index = this.cloudParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.cloudParticles[index];

      particle.ageMs += deltaMs;

      if (particle.ageMs >= particle.durationMs) {
        this.cloudParticles.splice(index, 1);
        continue;
      }

      particle.position = {
        x: particle.position.x + particle.velocity.x * deltaSeconds,
        y: particle.position.y + particle.velocity.y * deltaSeconds
      };
      particle.velocity = {
        x: particle.velocity.x * 0.982,
        y: particle.velocity.y * 0.982
      };

      const progress = particle.ageMs / particle.durationMs;
      const alpha = particle.alpha * (1 - progress) ** 1.35;
      const radius = particle.radius * (1 + progress * 0.55);

      graphics.fillStyle(particle.color, alpha);
      graphics.fillCircle(particle.position.x, particle.position.y, radius);
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

const randomRange = (min: number, max: number): number =>
  Phaser.Math.FloatBetween(min, max);

const randomColor = (colors: readonly number[]): number =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? 0xffffff;
