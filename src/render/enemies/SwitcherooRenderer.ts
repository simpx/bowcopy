import Phaser from 'phaser';

import switcherooBaseUrl from '../../../assets/characters/switcheroo/base.png';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { SWITCHEROO_RIG } from '../../characters/switcherooRig';
import type { SimVector } from '../../sim/player';
import type { SwitcherooEnemy, SwitcherooEvent } from '../../sim/enemies';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';
import { PortalEffectPool } from '../feedback/portalEffect';

interface SwitcherooVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const SCARED_AFTER_SWAP_MS = 650;
const SPAWN_COLORS = [0xc65df0, 0x8a3bb8, 0xfff3b1] as const;
const HIT_COLORS = [0xfff1b5, 0xc65df0] as const;
const SWAP_COLORS = [0xc65df0, 0xe8b6ff, 0x2b1140] as const;
const DEATH_COLORS = [0xc65df0, 0x8a3bb8, 0x111111] as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadSwitcherooAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(SWITCHEROO_RIG.base.textureKey)) {
    scene.load.image(SWITCHEROO_RIG.base.textureKey, switcherooBaseUrl);
  }
};

export class SwitcherooRenderer {
  private readonly visuals = new Map<number, SwitcherooVisual>();
  private readonly bursts: ParticleBurstPool;
  private readonly portals: PortalEffectPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, {
      ...HOUSE_BURST_STYLE,
      ...{ originYOffset: -10, riseMin: 6, riseMax: 26, gravity: 30, alpha: 0.8 }
    });
    this.portals = new PortalEffectPool(scene, PARTICLE_DEPTH - 1);
  }

  create() {
    this.bursts.create();
    this.portals.create();
  }

  update(timeMs: number, deltaMs: number, enemies: readonly SwitcherooEnemy[]) {
    this.syncEnemies(timeMs, enemies);
    this.bursts.update(deltaMs);
    this.portals.update(deltaMs);
  }

  playEvents(events: readonly SwitcherooEvent[]) {
    for (const event of events) {
      if (event.type === 'switcheroo-spawned') {
        this.bursts.emit(event.position, 10, SPAWN_COLORS, 28, 74, 4.0, 220);
        continue;
      }

      if (event.type === 'switcheroo-swapped') {
        // Twin portals at both endpoints — the shared space-magic language.
        this.portals.flash(event.fromPosition, 30, 460);
        this.portals.flash(event.toPosition, 30, 460);
        this.bursts.emit(event.fromPosition, 8, SWAP_COLORS, 34, 88, 3.4, 240);
        this.bursts.emit(event.toPosition, 8, SWAP_COLORS, 34, 88, 3.4, 240);
        continue;
      }

      if (event.type === 'switcheroo-fizzle') {
        this.bursts.emit(event.position, 4, SWAP_COLORS, 16, 40, 2.4, 160);
        continue;
      }

      if (event.type === 'switcheroo-hit') {
        this.bursts.emit(event.position, 7, HIT_COLORS, 30, 76, 3.2, 180);
        continue;
      }

      if (event.type === 'switcheroo-killed') {
        this.bursts.emit(event.position, 24, DEATH_COLORS, 54, 136, 5.0, 350);
      }
    }
  }

  destroy() {
    this.bursts.destroy();
    this.portals.destroy();

    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }

    this.visuals.clear();
  }

  private syncEnemies(timeMs: number, enemies: readonly SwitcherooEnemy[]) {
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

  private createVisual(id: number): SwitcherooVisual {
    const { base } = SWITCHEROO_RIG;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.26
    );
    const body = this.scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { container, shadow, artLayer, body, eyes };

    this.visuals.set(id, visual);

    return visual;
  }

  private updateVisual(timeMs: number, enemy: SwitcherooEnemy, visual: SwitcherooVisual) {
    const { base } = SWITCHEROO_RIG;
    const motion = SWITCHEROO_RIG.motion as Record<string, number>;
    const hitFlash = clamp01(enemy.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(enemy.spawnProgress)) ** 3;
    const hover = Math.sin(enemy.walkPhase) * (motion.hoverBob ?? 4);
    const vibrate = enemy.phase === 'windup' ? Math.sin(timeMs * 0.12) * 2.4 * enemy.windupProgress : 0;
    const squash =
      (enemy.phase === 'windup' ? 0.06 * enemy.windupProgress : 0) +
      hitFlash * (motion.hitScaleX ?? 0.08);

    visual.container.setPosition(enemy.position.x + vibrate, enemy.position.y - Math.abs(hover) * 0.4);
    visual.container.setDepth(69 + enemy.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(enemy.spawnProgress * Math.PI) * 0.12));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.8 + spawnEase * 0.2 + enemy.moveAmount * 0.1, 1);
    visual.shadow.setAlpha(0.12 + spawnEase * 0.16);

    visual.artLayer.setPosition(0, base.y + hover);
    visual.artLayer.setScale(base.scale * (1 + squash), base.scale * (1 - squash));
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);

    this.drawEyes(visual.eyes, enemy, timeMs);
  }

  private drawEyes(graphics: Phaser.GameObjects.Graphics, enemy: SwitcherooEnemy, timeMs: number) {
    const gaze = SWITCHEROO_RIG.gaze;
    const expressions = resolveEyeExpressions(gaze.emotions);
    const expression =
      (enemy.hitFlashMs > 0 ? expressions.hit : undefined) ??
      (enemy.phase === 'windup' ? expressions.alert : undefined) ??
      (enemy.sinceSwapMs < SCARED_AFTER_SWAP_MS ? expressions.scared : undefined) ??
      expressions.default;
    const facing = normalize(enemy.facing);

    graphics.clear();

    for (const name of ['left', 'right'] as const) {
      drawRuntimeEye(graphics, name, gaze.eyes[name], SWITCHEROO_RIG.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: gaze.pupilOffsetScale.x,
        offsetScaleY: gaze.pupilOffsetScale.y,
        timeMs
      });
    }
  }
}
