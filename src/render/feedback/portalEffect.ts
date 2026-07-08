import Phaser from 'phaser';

/**
 * Shared "space magic" portal effect (docs: doorbert spawns, switcheroo swap
 * endpoints use the same visual language). A portal is a runtime-drawn dark
 * vortex: black core, rotating spiral arms, magenta rim. Purely external —
 * character base images never bake portals.
 */

const RIM_COLOR = 0xc65df0;
const ARM_COLOR = 0x8a3bb8;
const CORE_COLOR = 0x0a0512;
const OPEN_MS = 240;
const CLOSE_MS = 200;

interface Portal {
  readonly id: number;
  readonly position: { x: number; y: number };
  readonly radius: number;
  ageMs: number;
  closing: boolean;
  closeElapsedMs: number;
}

export class PortalEffectPool {
  private graphics?: Phaser.GameObjects.Graphics;
  private readonly portals = new Map<number, Portal>();
  private nextId = 1;
  private timeMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number
  ) {}

  create() {
    this.graphics = this.scene.add.graphics().setDepth(this.depth);
  }

  open(position: { x: number; y: number }, radius: number): number {
    const id = this.nextId++;

    this.portals.set(id, {
      id,
      position: { ...position },
      radius,
      ageMs: 0,
      closing: false,
      closeElapsedMs: 0
    });

    return id;
  }

  close(id: number) {
    const portal = this.portals.get(id);

    if (portal) {
      portal.closing = true;
    }
  }

  closeAll() {
    for (const portal of this.portals.values()) {
      portal.closing = true;
    }
  }

  /** Convenience for one-shot flashes (switcheroo endpoints). */
  flash(position: { x: number; y: number }, radius: number, lifeMs = 420) {
    const id = this.open(position, radius);

    this.scene.time.delayedCall(lifeMs, () => this.close(id));
  }

  update(deltaMs: number) {
    this.timeMs += deltaMs;

    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const portal of Array.from(this.portals.values())) {
      portal.ageMs += deltaMs;

      let scale = Phaser.Math.Clamp(portal.ageMs / OPEN_MS, 0, 1);

      if (portal.closing) {
        portal.closeElapsedMs += deltaMs;
        scale *= Phaser.Math.Clamp(1 - portal.closeElapsedMs / CLOSE_MS, 0, 1);

        if (portal.closeElapsedMs >= CLOSE_MS) {
          this.portals.delete(portal.id);
          continue;
        }
      }

      this.draw(graphics, portal, scale);
    }
  }

  hasActive(): boolean {
    return this.portals.size > 0;
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = undefined;
    this.portals.clear();
  }

  private draw(graphics: Phaser.GameObjects.Graphics, portal: Portal, scale: number) {
    const { x, y } = portal.position;
    const radius = portal.radius * (0.25 + 0.75 * scale);
    const spin = this.timeMs * 0.005;

    // Core void.
    graphics.fillStyle(CORE_COLOR, 0.92 * scale);
    graphics.fillEllipse(x, y, radius * 2, radius * 1.7);

    // Rotating spiral arms.
    graphics.lineStyle(Math.max(2, radius * 0.16), ARM_COLOR, 0.85 * scale);

    for (const armOffset of [0, Math.PI]) {
      const points: Phaser.Types.Math.Vector2Like[] = [];

      for (let step = 0; step <= 20; step += 1) {
        const progress = step / 20;
        const angle = spin + armOffset + progress * Math.PI * 1.7;
        const armRadius = radius * (0.15 + progress * 0.75);

        points.push({
          x: x + Math.cos(angle) * armRadius,
          y: y + Math.sin(angle) * armRadius * 0.85
        });
      }

      graphics.strokePoints(points, false, false);
    }

    // Rim glow.
    graphics.lineStyle(Math.max(2, radius * 0.12), RIM_COLOR, (0.55 + Math.sin(spin * 2.2) * 0.15) * scale);
    graphics.strokeEllipse(x, y, radius * 2.05, radius * 1.75);
  }
}
