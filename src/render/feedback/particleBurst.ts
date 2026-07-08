import Phaser from 'phaser';

import type { SimVector } from '../../sim/player';

/**
 * Shared doodle-style burst particles used by every character renderer.
 * Visual identity of the project: round filled dots that pop outward,
 * rise slightly, then drift down while fading and shrinking.
 *
 * Each renderer keeps its own accepted feel via ParticleBurstStyle instead
 * of copying the emitter code. New characters should reuse one of the
 * exported styles (or derive from HOUSE_BURST_STYLE) rather than writing
 * a new particle loop.
 */
export interface ParticleBurstStyle {
  /** Random origin jitter in px around the emit position. */
  readonly jitter: number;
  /** Vertical offset of the emit origin relative to the character position. */
  readonly originYOffset: number;
  /** Extra upward kick range applied at spawn. */
  readonly riseMin: number;
  readonly riseMax: number;
  /** Per-frame velocity damping. */
  readonly drag: number;
  /** Downward acceleration in px/s^2 (0 = floaty, e.g. spores/ghosts). */
  readonly gravity: number;
  /** Peak fill alpha. */
  readonly alpha: number;
  /** How much of the radius is lost over the particle lifetime. */
  readonly shrink: number;
}

export const HOUSE_BURST_STYLE: ParticleBurstStyle = {
  jitter: 5,
  originYOffset: -10,
  riseMin: 8,
  riseMax: 30,
  drag: 0.985,
  gravity: 120,
  alpha: 0.82,
  shrink: 0.45
};

interface BurstParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const randomColor = (colors: readonly number[]): number =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? 0xffffff;

export class ParticleBurstPool {
  private readonly particles: BurstParticle[] = [];
  private graphics?: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    private readonly style: ParticleBurstStyle = HOUSE_BURST_STYLE
  ) {}

  create() {
    this.graphics = this.scene.add.graphics().setDepth(this.depth);
  }

  /**
   * Low-level spawn for custom emitters (directional trails, corner bursts).
   * The particle still lives, moves, fades, and shrinks with this pool's style.
   */
  spawn(particle: {
    position: SimVector;
    velocity: SimVector;
    color: number;
    radius: number;
    durationMs: number;
  }) {
    this.particles.push({ ...particle, ageMs: 0 });
  }

  emit(
    position: SimVector,
    count: number,
    colors: readonly number[],
    minSpeed: number,
    maxSpeed: number,
    radius: number,
    durationMs: number
  ) {
    const { jitter, originYOffset, riseMin, riseMax } = this.style;

    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(minSpeed, maxSpeed);

      this.particles.push({
        position: {
          x: position.x + randomRange(-jitter, jitter),
          y: position.y + originYOffset + randomRange(-jitter, jitter)
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - randomRange(riseMin, riseMax)
        },
        color: randomColor(colors),
        radius: randomRange(radius * 0.55, radius),
        ageMs: 0,
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.18)
      });
    }
  }

  update(deltaMs: number) {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    const { drag, gravity, alpha, shrink } = this.style;
    const deltaSeconds = deltaMs / 1000;

    graphics.clear();

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];

      particle.ageMs += deltaMs;

      if (particle.ageMs >= particle.durationMs) {
        this.particles.splice(index, 1);
        continue;
      }

      particle.velocity.x *= drag;
      particle.velocity.y = particle.velocity.y * drag + gravity * deltaSeconds;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = particle.ageMs / particle.durationMs;

      graphics.fillStyle(particle.color, (1 - progress) * alpha);
      graphics.fillCircle(
        particle.position.x,
        particle.position.y,
        particle.radius * (1 - progress * shrink)
      );
    }
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = undefined;
    this.particles.length = 0;
  }
}
