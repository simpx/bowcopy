import Phaser from 'phaser';

import hexbrimBaseUrl from '../../../assets/characters/hexbrim/base.png';
import { HEXBRIM_RIG } from '../../characters/hexbrimRig';
import type { HexbrimEnemy, HexbrimEvent, HexbrimHexOrb, HexbrimWave } from '../../sim/enemies';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';
import { PortalEffectPool } from '../feedback/portalEffect';

interface HexbrimVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 80;
const HEX_COLOR = 0x8ef07a;
const HEX_CORE_COLOR = 0x1c3a14;
const SPAWN_COLORS = [0x6a3bb8, 0x2b1140, 0xffd75d] as const;
const HIT_COLORS = [0xfff1b5, 0xc65df0] as const;
const DISPEL_COLORS = [0xc65df0, 0xe8b6ff, 0x2b1140] as const;
const DEATH_COLORS = [0x6a3bb8, 0xffd75d, 0x111111] as const;
const VOLLEY_FLASH_COLORS = [0xc65df0, 0x8a3bb8] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const preloadHexbrimAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(HEXBRIM_RIG.base.textureKey)) {
    scene.load.image(HEXBRIM_RIG.base.textureKey, hexbrimBaseUrl);
  }
};

export class HexbrimRenderer {
  private readonly visuals = new Map<number, HexbrimVisual>();
  private readonly dissolveVisuals = new Set<Phaser.GameObjects.Image>();
  private readonly bursts: ParticleBurstPool;
  private readonly portals: PortalEffectPool;
  private hexGraphics?: Phaser.GameObjects.Graphics;
  private timeMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, {
      ...HOUSE_BURST_STYLE,
      ...{ originYOffset: -16, riseMin: 8, riseMax: 30, gravity: 20, alpha: 0.85 }
    });
    this.portals = new PortalEffectPool(scene, PARTICLE_DEPTH - 1);
  }

  create() {
    this.bursts.create();
    this.portals.create();
    this.hexGraphics = this.scene.add.graphics().setDepth(PARTICLE_DEPTH - 2);
  }

  update(
    timeMs: number,
    deltaMs: number,
    entities: readonly HexbrimEnemy[],
    hexOrbs: readonly HexbrimHexOrb[],
    waves: readonly HexbrimWave[] = []
  ) {
    this.timeMs = timeMs;
    this.syncEntities(timeMs, entities);
    this.drawHexes(hexOrbs, waves);
    this.bursts.update(deltaMs);
    this.portals.update(deltaMs);
  }

  playEvents(events: readonly HexbrimEvent[]) {
    for (const event of events) {
      if (event.type === 'hexbrim-spawned') {
        this.portals.flash(event.position, 44, 700);
        this.bursts.emit(event.position, 16, SPAWN_COLORS, 36, 96, 4.8, 300);
        continue;
      }

      if (event.type === 'hexbrim-teleport-out' || event.type === 'hexbrim-teleport-in') {
        this.portals.flash(event.position, 36, 480);
        this.bursts.emit(event.position, 8, DISPEL_COLORS, 30, 78, 3.4, 220);
        continue;
      }

      if (event.type === 'hexbrim-volley') {
        this.bursts.emit(event.origin, 7, VOLLEY_FLASH_COLORS, 36, 92, 3.2, 190);
        continue;
      }

      if (event.type === 'hexbrim-waves') {
        this.bursts.emit(event.origin, 10, [HEX_COLOR, 0xd8ffb0], 24, 64, 3.4, 220);
        continue;
      }

      if (event.type === 'hexbrim-hex-caught') {
        this.bursts.emit(event.position, 16, [HEX_COLOR, 0xd8ffb0, 0xffffff], 40, 100, 4.2, 300);
        continue;
      }

      if (event.type === 'hexbrim-hex-expired') {
        this.bursts.emit(event.position, 6, [HEX_COLOR, 0x2b1140], 18, 46, 2.6, 180);
        continue;
      }

      if (event.type === 'hexbrim-ritual-complete') {
        // Arena-wide detonation flash.
        this.portals.flash({ x: 0, y: 0 }, 0, 60);
        continue;
      }

      if (event.type === 'hexbrim-clones-split') {
        for (const position of event.positions) {
          this.portals.flash(position, 34, 460);
        }
        continue;
      }

      if (event.type === 'hexbrim-clone-dispelled') {
        this.bursts.emit(event.position, 14, DISPEL_COLORS, 44, 110, 4.2, 280);
        continue;
      }

      if (event.type === 'hexbrim-hit') {
        this.bursts.emit(event.position, 8, HIT_COLORS, 32, 84, 3.6, 190);
        continue;
      }

      if (event.type === 'hexbrim-killed') {
        // Defeat is a vanish, not a blast: the outfit drifts up, stretches
        // thin, and dissolves into the portal that opens beneath it.
        this.playDissolve(event.position);
      }
    }
  }

  destroy() {
    for (const visual of this.dissolveVisuals) {
      visual.destroy();
    }

    this.dissolveVisuals.clear();
    this.bursts.destroy();
    this.portals.destroy();
    this.hexGraphics?.destroy();
    this.hexGraphics = undefined;

    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }

    this.visuals.clear();
  }

  private playDissolve(position: { x: number; y: number }) {
    const { base } = HEXBRIM_RIG;

    this.portals.flash(position, 46, 1600);
    // Slow upward drift of dark motes instead of an explosive burst.
    this.bursts.emit(position, 18, DEATH_COLORS, 8, 36, 3.4, 1100);

    const ghost = this.scene.add
      .image(position.x, position.y + base.y, base.textureKey)
      .setOrigin(0.5)
      .setScale(base.scale)
      .setDepth(78);

    this.dissolveVisuals.add(ghost);
    this.scene.tweens.add({
      targets: ghost,
      y: ghost.y - 40,
      scaleX: base.scale * 0.55,
      scaleY: base.scale * 1.35,
      alpha: 0,
      angle: 6,
      duration: 1300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.dissolveVisuals.delete(ghost);
        ghost.destroy();
      }
    });
  }

  private syncEntities(timeMs: number, entities: readonly HexbrimEnemy[]) {
    const activeIds = new Set<number>();

    for (const entity of entities) {
      activeIds.add(entity.id);

      const visual = this.visuals.get(entity.id) ?? this.createVisual(entity.id);

      this.updateVisual(timeMs, entity, visual);
    }

    for (const [id, visual] of this.visuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.visuals.delete(id);
      }
    }
  }

  private createVisual(id: number): HexbrimVisual {
    const { base } = HEXBRIM_RIG;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.26
    );
    const body = this.scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    const artLayer = this.scene.add.container(0, base.y, [body]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { container, shadow, artLayer, body };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, entity: HexbrimEnemy, visual: HexbrimVisual) {
    const { base, motion } = HEXBRIM_RIG;
    const hitFlash = clamp01(entity.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(entity.spawnProgress)) ** 3;
    const hover = Math.sin(entity.swayPhase) * (motion.hoverBob ?? 6);
    const sway = Math.sin(entity.swayPhase * 0.8) * (motion.swayTilt ?? 0.06);
    const telegraphShake =
      entity.phase === 'volley' || entity.phase === 'hexcast' || entity.phase === 'wavecast'
        ? Math.sin(timeMs * 0.11) * 2.2 * entity.telegraphProgress
        : entity.phase === 'channel'
          ? Math.sin(timeMs * 0.18) * 3.4 * (0.4 + entity.telegraphProgress * 0.6)
          : 0;
    const squash =
      hitFlash * (motion.hitScaleX ?? 0.07) +
      (entity.phase === 'hexcast' ? 0.05 * entity.telegraphProgress : 0) +
      (entity.phase === 'stagger' ? 0.12 * (1 - entity.phaseElapsedMs / Math.max(1, entity.phaseDurationMs)) : 0);

    visual.container.setPosition(entity.position.x + telegraphShake, entity.position.y);
    visual.container.setDepth(72 + entity.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(entity.spawnProgress * Math.PI) * 0.1));
    visual.container.setAlpha(entity.visible ? 0.2 + spawnEase * 0.8 : 0);
    visual.container.setRotation(sway);

    visual.shadow.setAlpha(entity.visible ? 0.1 + spawnEase * 0.14 : 0);
    visual.shadow.setScale(1 + Math.abs(hover) * 0.01, 1);

    visual.artLayer.setPosition(0, base.y + hover);
    visual.artLayer.setScale(base.scale * (1 + squash), base.scale * (1 - squash));
    visual.body.setTint(
      hitFlash > 0
        ? 0xfff0df
        : entity.phase === 'channel'
          ? (Math.sin(timeMs * 0.02) > 0 ? 0xd8f0a0 : 0xffffff)
          : entity.phase === 'volley' && entity.telegraphProgress > 0.4
            ? 0xe8c8ff
            : 0xffffff
    );
  }

  private drawHexes(hexOrbs: readonly HexbrimHexOrb[], waves: readonly HexbrimWave[]) {
    const graphics = this.hexGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const wave of waves) {
      if (wave.radius <= 0) {
        continue;
      }

      const fade = 1 - wave.radius / wave.maxRadius;
      const pulse = 0.85 + Math.sin(this.timeMs * 0.02 + wave.id) * 0.15;

      // Expanding shockwave ring: soft outer glow + crisp core line.
      graphics.lineStyle(11, HEX_CORE_COLOR, 0.3 * fade);
      graphics.strokeCircle(wave.origin.x, wave.origin.y, wave.radius);
      graphics.lineStyle(5, HEX_COLOR, 0.75 * fade * pulse);
      graphics.strokeCircle(wave.origin.x, wave.origin.y, wave.radius);
      graphics.lineStyle(1.6, 0xd8ffb0, 0.85 * fade);
      graphics.strokeCircle(wave.origin.x, wave.origin.y, wave.radius);
    }

    for (const orb of hexOrbs) {
      const pulse = 0.85 + Math.sin(this.timeMs * 0.015 + orb.id) * 0.15;
      const fading = Math.min(1, (orb.lifeMs / orb.maxLifeMs) * 4);
      const spin = this.timeMs * 0.008 + orb.id;

      // Halo, core, and a small orbiting rune — a slow, ominous tracker.
      graphics.fillStyle(HEX_CORE_COLOR, 0.5 * fading);
      graphics.fillCircle(orb.position.x, orb.position.y, orb.radius * 1.5 * pulse);
      graphics.fillStyle(HEX_COLOR, 0.85 * fading);
      graphics.fillCircle(orb.position.x, orb.position.y, orb.radius * pulse);
      graphics.fillStyle(0xd8ffb0, 0.9 * fading);
      graphics.fillCircle(orb.position.x, orb.position.y, orb.radius * 0.45 * pulse);
      graphics.fillStyle(HEX_COLOR, 0.7 * fading);
      graphics.fillCircle(
        orb.position.x + Math.cos(spin) * orb.radius * 1.6,
        orb.position.y + Math.sin(spin) * orb.radius * 1.3,
        4
      );
    }
  }
}
