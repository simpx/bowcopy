import Phaser from 'phaser';

import type { RoomBounds } from '../../sim/rooms';
import type { SimVector } from '../../sim/player';

type FeedbackTone = 'wall' | 'hit' | 'death' | 'spawn' | 'dodge' | 'damage' | 'clear';

interface FloatingLabel {
  readonly text: Phaser.GameObjects.Text;
  readonly velocity: SimVector;
  readonly durationMs: number;
  ageMs: number;
}

interface FeedbackPulse {
  readonly position: SimVector;
  readonly color: number;
  readonly startRadius: number;
  readonly endRadius: number;
  readonly lineWidth: number;
  readonly durationMs: number;
  ageMs: number;
}

interface FeedbackParticle {
  position: SimVector;
  velocity: SimVector;
  color: number;
  radius: number;
  ageMs: number;
  durationMs: number;
}

interface RoomClearPulse {
  readonly bounds: RoomBounds;
  ageMs: number;
  durationMs: number;
}

const TONE_COLORS: Record<FeedbackTone, number> = {
  wall: 0xfff1b5,
  hit: 0xffcf57,
  death: 0xe96945,
  spawn: 0xa2d07e,
  dodge: 0x8fe8ff,
  damage: 0xff8f6b,
  clear: 0xf5e38a
};
const TEXT_COLORS: Record<FeedbackTone, string> = {
  wall: '#fff1b5',
  hit: '#ffcf57',
  death: '#ffd69c',
  spawn: '#c2f26d',
  dodge: '#9eefff',
  damage: '#ffad8f',
  clear: '#f5e38a'
};
const CLEAR_PARTICLE_COLORS = [0xf5e38a, 0xa2d07e, 0x8fe8ff, 0xffcf57] as const;
const PARTICLE_DEPTH = 118;
const PULSE_DEPTH = 116;
const LABEL_DEPTH = 122;

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const randomColor = (colors: readonly number[]): number =>
  colors[Math.floor(Math.random() * colors.length)] ?? colors[0] ?? 0xffffff;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

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

export class CombatFeedbackRenderer {
  private readonly labels: FloatingLabel[] = [];
  private readonly pulses: FeedbackPulse[] = [];
  private readonly particles: FeedbackParticle[] = [];
  private pulseGraphics?: Phaser.GameObjects.Graphics;
  private particleGraphics?: Phaser.GameObjects.Graphics;
  private roomClearPulse?: RoomClearPulse;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    this.pulseGraphics = this.scene.add.graphics().setDepth(PULSE_DEPTH);
    this.particleGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH);
  }

  update(deltaMs: number) {
    this.updateLabels(deltaMs);
    this.updatePulses(deltaMs);
    this.updateParticles(deltaMs);
  }

  playArrowWall(position: SimVector) {
    this.addPulse(position, 'wall', 4, 24, 2, 180);
    this.addLabel('Thunk', position, 'wall', { x: randomRange(-12, 12), y: -42 }, 360);
    this.emitBurst(position, 7, [TONE_COLORS.wall], 28, 88, 2.4, 190);
  }

  playArrowEnemy(position: SimVector, damage: number) {
    this.addPulse(position, 'hit', 6, 30, 3, 210);
    this.addLabel(`-${damage}`, { x: position.x, y: position.y - 20 }, 'hit', { x: 8, y: -48 }, 430);
    this.emitBurst(position, 9, [TONE_COLORS.hit, 0xfff1b5], 48, 112, 3, 210);
  }

  playEnemyDeath(position: SimVector) {
    this.addPulse(position, 'death', 10, 46, 4, 270);
    this.addLabel('Down', { x: position.x, y: position.y - 24 }, 'death', { x: 0, y: -52 }, 470);
    this.emitBurst(position, 18, [TONE_COLORS.death, TONE_COLORS.hit, 0xa2d07e], 70, 168, 4.8, 340);
  }

  playEnemySpawn(position: SimVector) {
    this.addPulse(position, 'spawn', 18, 42, 2, 300);
    this.addLabel('Pop', { x: position.x, y: position.y - 34 }, 'spawn', { x: 0, y: -30 }, 340);
    this.emitBurst(position, 8, [TONE_COLORS.spawn, 0xf1c07a], 34, 92, 3.4, 230);
  }

  playDodge(position: SimVector, direction: SimVector) {
    const normalized = normalize(direction);
    const labelPosition = {
      x: position.x - normalized.x * 18,
      y: position.y - 42 - normalized.y * 8
    };

    this.addPulse(position, 'dodge', 14, 38, 2, 220);
    this.addLabel('Dodge', labelPosition, 'dodge', { x: normalized.x * 34, y: -34 }, 340);
    this.emitDirectionalBurst(position, normalized, 10, TONE_COLORS.dodge, 42, 130, 3, 220);
  }

  playSporeBreak(position: SimVector) {
    this.addPulse(position, 'dodge', 6, 30, 2, 190);
    this.emitBurst(position, 12, [TONE_COLORS.dodge, 0xffd0d5, 0xfff1b5], 48, 138, 3.2, 240);
  }

  playDamage(position: SimVector, damage: number) {
    this.addPulse(position, 'damage', 18, 54, 4, 260);
    this.addLabel(`-${damage}`, { x: position.x, y: position.y - 48 }, 'damage', { x: -8, y: -44 }, 440);
    this.emitBurst(position, 14, [TONE_COLORS.damage, 0xffd0a1], 62, 148, 4.6, 290);
  }

  playRoomClear(bounds: RoomBounds) {
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    this.roomClearPulse = {
      bounds,
      ageMs: 0,
      durationMs: 520
    };
    this.addPulse(center, 'clear', 44, 118, 5, 420);
    this.addLabel('Room clear', { x: center.x, y: center.y - 92 }, 'clear', { x: 0, y: -28 }, 760);

    for (let index = 0; index < 34; index += 1) {
      const edgeProgress = index / 34;
      const side = index % 4;
      const position =
        side === 0
          ? { x: bounds.x + bounds.width * edgeProgress, y: bounds.y + 18 }
          : side === 1
            ? { x: bounds.x + bounds.width - 18, y: bounds.y + bounds.height * edgeProgress }
            : side === 2
              ? { x: bounds.x + bounds.width * (1 - edgeProgress), y: bounds.y + bounds.height - 18 }
              : { x: bounds.x + 18, y: bounds.y + bounds.height * (1 - edgeProgress) };

      this.emitBurst(position, 1, CLEAR_PARTICLE_COLORS, 86, 176, 4.1, 460);
    }
  }

  destroy() {
    this.pulseGraphics?.destroy();
    this.particleGraphics?.destroy();

    for (const label of this.labels) {
      label.text.destroy();
    }

    this.labels.length = 0;
    this.pulses.length = 0;
    this.particles.length = 0;
    this.roomClearPulse = undefined;
  }

  private addPulse(
    position: SimVector,
    tone: FeedbackTone,
    startRadius: number,
    endRadius: number,
    lineWidth: number,
    durationMs: number
  ) {
    this.pulses.push({
      position: { x: position.x, y: position.y },
      color: TONE_COLORS[tone],
      startRadius,
      endRadius,
      lineWidth,
      ageMs: 0,
      durationMs
    });
  }

  private addLabel(
    content: string,
    position: SimVector,
    tone: FeedbackTone,
    velocity: SimVector,
    durationMs: number
  ) {
    const text = this.scene.add
      .text(position.x, position.y, content, {
        color: TEXT_COLORS[tone],
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: tone === 'clear' ? '26px' : '18px',
        fontStyle: '800',
        stroke: '#07120d',
        strokeThickness: tone === 'clear' ? 5 : 4
      })
      .setOrigin(0.5)
      .setDepth(LABEL_DEPTH);

    this.labels.push({
      text,
      velocity,
      durationMs,
      ageMs: 0
    });
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
          x: position.x + randomRange(-4, 4),
          y: position.y + randomRange(-4, 4)
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - randomRange(12, 42)
        },
        color: randomColor(colors),
        radius: randomRange(radius * 0.55, radius),
        ageMs: 0,
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.18)
      });
    }
  }

  private emitDirectionalBurst(
    position: SimVector,
    direction: SimVector,
    count: number,
    color: number,
    minSpeed: number,
    maxSpeed: number,
    radius: number,
    durationMs: number
  ) {
    const baseAngle = Math.atan2(-direction.y, -direction.x);

    for (let index = 0; index < count; index += 1) {
      const angle = baseAngle + randomRange(-0.72, 0.72);
      const speed = randomRange(minSpeed, maxSpeed);

      this.particles.push({
        position: {
          x: position.x - direction.x * randomRange(6, 26),
          y: position.y - direction.y * randomRange(6, 26) - 8
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - randomRange(8, 24)
        },
        color,
        radius: randomRange(radius * 0.5, radius),
        ageMs: 0,
        durationMs: randomRange(durationMs * 0.72, durationMs * 1.1)
      });
    }
  }

  private updateLabels(deltaMs: number) {
    const deltaSeconds = deltaMs / 1000;

    for (let index = this.labels.length - 1; index >= 0; index -= 1) {
      const label = this.labels[index];

      label.ageMs += deltaMs;

      if (label.ageMs >= label.durationMs) {
        label.text.destroy();
        this.labels.splice(index, 1);
        continue;
      }

      const progress = clamp01(label.ageMs / label.durationMs);
      const lift = 1 - (1 - progress) ** 2;

      label.text.x += label.velocity.x * deltaSeconds;
      label.text.y += label.velocity.y * deltaSeconds;
      label.text.setAlpha(1 - progress);
      label.text.setScale(1 + Math.sin(lift * Math.PI) * 0.1);
    }
  }

  private updatePulses(deltaMs: number) {
    const graphics = this.pulseGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();
    this.drawRoomClearPulse(graphics, deltaMs);

    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];

      pulse.ageMs += deltaMs;

      if (pulse.ageMs >= pulse.durationMs) {
        this.pulses.splice(index, 1);
        continue;
      }

      const progress = clamp01(pulse.ageMs / pulse.durationMs);
      const radius = Phaser.Math.Linear(pulse.startRadius, pulse.endRadius, 1 - (1 - progress) ** 2);
      const alpha = (1 - progress) * 0.82;

      graphics.lineStyle(pulse.lineWidth * (1 - progress * 0.35), pulse.color, alpha);
      graphics.strokeCircle(pulse.position.x, pulse.position.y, radius);
      graphics.fillStyle(pulse.color, alpha * 0.16);
      graphics.fillCircle(pulse.position.x, pulse.position.y, radius * 0.38);
    }
  }

  private drawRoomClearPulse(graphics: Phaser.GameObjects.Graphics, deltaMs: number) {
    const pulse = this.roomClearPulse;

    if (!pulse) {
      return;
    }

    pulse.ageMs += deltaMs;

    if (pulse.ageMs >= pulse.durationMs) {
      this.roomClearPulse = undefined;
      return;
    }

    const progress = clamp01(pulse.ageMs / pulse.durationMs);
    const alpha = (1 - progress) * 0.32;
    const inset = Phaser.Math.Linear(20, 0, progress);
    const { bounds } = pulse;

    graphics.lineStyle(5, TONE_COLORS.clear, alpha);
    graphics.strokeRect(
      bounds.x + inset,
      bounds.y + inset,
      bounds.width - inset * 2,
      bounds.height - inset * 2
    );
    graphics.fillStyle(TONE_COLORS.clear, alpha * 0.18);
    graphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
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

      particle.velocity.x *= 0.982;
      particle.velocity.y = particle.velocity.y * 0.982 + 112 * deltaSeconds;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;

      const progress = clamp01(particle.ageMs / particle.durationMs);
      const alpha = 1 - progress;

      graphics.fillStyle(particle.color, alpha * 0.86);
      graphics.fillCircle(
        particle.position.x,
        particle.position.y,
        particle.radius * (1 - progress * 0.42)
      );
    }
  }
}
