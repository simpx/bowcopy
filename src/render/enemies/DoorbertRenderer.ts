import Phaser from 'phaser';

import doorbertBaseUrl from '../../../assets/characters/doorbert/base.png';
import keyletBaseUrl from '../../../assets/characters/keylet/base.png';
import { DOORBERT_RIG } from '../../characters/doorbertRig';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { KEYLET_RIG } from '../../characters/keyletRig';
import type { SimVector } from '../../sim/player';
import type { DoorbertEnemy, DoorbertEvent, KeyletEnemy } from '../../sim/enemies';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import { HOUSE_BURST_STYLE, ParticleBurstPool } from '../feedback/particleBurst';
import { PortalEffectPool } from '../feedback/portalEffect';

interface DoorVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
  readonly keyholeGlow: Phaser.GameObjects.Ellipse;
}

interface KeyletVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly artLayer: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly eyes: Phaser.GameObjects.Graphics;
}

const HIT_FLASH_MS = 170;
const PARTICLE_DEPTH = 78;
const PLAYER_NEAR_DISTANCE = 150;
const SPAWN_COLORS = [0x9a7448, 0x6d6a63, 0xfff3b1] as const;
const HIT_COLORS = [0xfff1b5, 0x9a7448] as const;
const BLOCK_COLORS = [0xbfb9ae, 0x8f8a80] as const;
const KEYLET_COLORS = [0xf0b429, 0xb27f19, 0xfff3b1] as const;
const DEATH_COLORS = [0x9a7448, 0x54402a, 0x111111] as const;
const KEYHOLE_GLOW_COLOR = 0xc65df0;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const preloadDoorbertAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(DOORBERT_RIG.base.textureKey)) {
    scene.load.image(DOORBERT_RIG.base.textureKey, doorbertBaseUrl);
  }

  if (!scene.textures.exists(KEYLET_RIG.base.textureKey)) {
    scene.load.image(KEYLET_RIG.base.textureKey, keyletBaseUrl);
  }
};

export class DoorbertRenderer {
  private readonly doorVisuals = new Map<number, DoorVisual>();
  private readonly keyletVisuals = new Map<number, KeyletVisual>();
  private readonly portalIds = new Map<number, number>();
  private readonly bursts: ParticleBurstPool;
  private readonly portals: PortalEffectPool;

  constructor(private readonly scene: Phaser.Scene) {
    this.bursts = new ParticleBurstPool(scene, PARTICLE_DEPTH, {
      ...HOUSE_BURST_STYLE,
      ...{ riseMin: 4, riseMax: 24, gravity: 100 }
    });
    this.portals = new PortalEffectPool(scene, PARTICLE_DEPTH - 1);
  }

  create() {
    this.bursts.create();
    this.portals.create();
  }

  update(
    timeMs: number,
    deltaMs: number,
    doors: readonly DoorbertEnemy[],
    keylets: readonly KeyletEnemy[],
    playerPosition: SimVector
  ) {
    this.syncDoors(timeMs, doors, playerPosition);
    this.syncKeylets(timeMs, keylets);
    this.bursts.update(deltaMs);
    this.portals.update(deltaMs);
  }

  playEvents(events: readonly DoorbertEvent[]) {
    for (const event of events) {
      if (event.type === 'doorbert-spawned') {
        this.bursts.emit(event.position, 12, SPAWN_COLORS, 30, 80, 4.4, 240);
        continue;
      }

      if (event.type === 'doorbert-portal-opened') {
        this.portalIds.set(event.id, this.portals.open(event.portalPosition, 34));
        continue;
      }

      if (event.type === 'doorbert-portal-closed') {
        const portalId = this.portalIds.get(event.id);

        if (portalId !== undefined) {
          this.portals.close(portalId);
          this.portalIds.delete(event.id);
        }
        continue;
      }

      if (event.type === 'keylet-spawned') {
        this.bursts.emit(event.position, 8, KEYLET_COLORS, 26, 68, 3.2, 200);
        continue;
      }

      if (event.type === 'keylet-killed') {
        this.bursts.emit(event.position, 12, KEYLET_COLORS, 40, 104, 3.8, 260);
        continue;
      }

      if (event.type === 'doorbert-blocked') {
        this.bursts.emit(event.position, 5, BLOCK_COLORS, 24, 58, 2.6, 150);
        continue;
      }

      if (event.type === 'doorbert-hit') {
        this.bursts.emit(event.position, 8, HIT_COLORS, 32, 80, 3.6, 190);
        continue;
      }

      if (event.type === 'doorbert-killed') {
        this.bursts.emit(event.position, 30, DEATH_COLORS, 60, 150, 5.6, 400);
      }
    }
  }

  destroy() {
    this.bursts.destroy();
    this.portals.destroy();

    for (const visual of this.doorVisuals.values()) {
      visual.container.destroy();
    }

    for (const visual of this.keyletVisuals.values()) {
      visual.container.destroy();
    }

    this.doorVisuals.clear();
    this.keyletVisuals.clear();
    this.portalIds.clear();
  }

  private syncDoors(timeMs: number, doors: readonly DoorbertEnemy[], playerPosition: SimVector) {
    const activeIds = new Set<number>();

    for (const door of doors) {
      activeIds.add(door.id);

      const visual = this.doorVisuals.get(door.id) ?? this.createDoorVisual(door.id);

      this.updateDoorVisual(timeMs, door, visual, playerPosition);
    }

    for (const [id, visual] of this.doorVisuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.doorVisuals.delete(id);
      }
    }
  }

  private createDoorVisual(id: number): DoorVisual {
    const { base } = DOORBERT_RIG;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.32
    );
    const keyholeGlow = this.scene.add.ellipse(0, base.y + 14, 18, 24, KEYHOLE_GLOW_COLOR, 0);
    const body = this.scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer, keyholeGlow]);
    const visual = { container, shadow, artLayer, body, eyes, keyholeGlow };

    this.doorVisuals.set(id, visual);

    return visual;
  }

  private updateDoorVisual(
    timeMs: number,
    door: DoorbertEnemy,
    visual: DoorVisual,
    playerPosition: SimVector
  ) {
    const { base, motion } = DOORBERT_RIG;
    const hitFlash = clamp01(door.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(door.spawnProgress)) ** 3;
    const phaseProgress = clamp01(door.phaseElapsedMs / Math.max(1, door.phaseDurationMs));
    const idleWave = Math.sin(timeMs * 0.003 + door.id);
    const shiver = door.phase === 'creak' ? Math.sin(timeMs * 0.1) * 1.8 * phaseProgress : 0;

    let squash = idleWave * (motion.idleSquash ?? 0.02) + hitFlash * (motion.hitScaleX ?? 0.08);

    if (door.phase === 'stagger') {
      squash += 0.1 * (1 - phaseProgress);
    }

    visual.container.setPosition(door.position.x + shiver, door.position.y);
    visual.container.setDepth(68 + door.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(door.spawnProgress * Math.PI) * 0.1));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);

    visual.shadow.setScale(0.85 + spawnEase * 0.15, 1);
    visual.shadow.setAlpha(0.16 + spawnEase * 0.18);

    visual.artLayer.setPosition(0, base.y + idleWave * (motion.idleBob ?? 2));
    visual.artLayer.setScale(base.scale * (1 + squash), base.scale * (1 - squash));
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);

    const windowOpen = door.phase === 'creak' || door.phase === 'burst' || door.phase === 'stagger';

    visual.keyholeGlow.setAlpha(windowOpen ? 0.5 + Math.sin(timeMs * 0.015) * 0.2 : 0);

    this.drawEyes(
      visual.eyes,
      DOORBERT_RIG,
      door.facing,
      this.doorEmotion(door, playerPosition),
      timeMs
    );
  }

  private doorEmotion(door: DoorbertEnemy, playerPosition: SimVector): string {
    if (door.hitFlashMs > 0) {
      return 'hit';
    }

    if (door.phase === 'stagger') {
      return 'dizzy';
    }

    if (door.phase === 'creak') {
      return 'aim';
    }

    if (door.phase === 'burst') {
      return 'angry';
    }

    const gap = Math.hypot(playerPosition.x - door.position.x, playerPosition.y - door.position.y);

    return gap < PLAYER_NEAR_DISTANCE ? 'scared' : 'default';
  }

  private syncKeylets(timeMs: number, keylets: readonly KeyletEnemy[]) {
    const activeIds = new Set<number>();

    for (const keylet of keylets) {
      activeIds.add(keylet.id);

      const visual = this.keyletVisuals.get(keylet.id) ?? this.createKeyletVisual(keylet.id);

      this.updateKeyletVisual(timeMs, keylet, visual);
    }

    for (const [id, visual] of this.keyletVisuals) {
      if (!activeIds.has(id)) {
        visual.container.destroy();
        this.keyletVisuals.delete(id);
      }
    }
  }

  private createKeyletVisual(id: number): KeyletVisual {
    const { base } = KEYLET_RIG;
    const shadow = this.scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.28
    );
    const body = this.scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    const eyes = this.scene.add.graphics();
    const artLayer = this.scene.add.container(0, base.y, [body, eyes]);
    const container = this.scene.add.container(0, 0, [shadow, artLayer]);
    const visual = { container, shadow, artLayer, body, eyes };

    this.keyletVisuals.set(id, visual);

    return visual;
  }

  private updateKeyletVisual(timeMs: number, keylet: KeyletEnemy, visual: KeyletVisual) {
    const { base } = KEYLET_RIG;
    const motion = KEYLET_RIG.motion as Record<string, number>;
    const hitFlash = clamp01(keylet.hitFlashMs / HIT_FLASH_MS);
    const spawnEase = 1 - (1 - clamp01(keylet.spawnProgress)) ** 3;
    const walkWave = Math.sin(keylet.walkPhase) * keylet.moveAmount;
    const squash = walkWave * 0.08 + hitFlash * (motion.hitScaleX ?? 0.08);

    visual.container.setPosition(keylet.position.x, keylet.position.y);
    visual.container.setDepth(70 + keylet.position.y / 1000);
    visual.container.setScale(Math.max(0.05, spawnEase + Math.sin(keylet.spawnProgress * Math.PI) * 0.16));
    visual.container.setAlpha(0.18 + spawnEase * 0.82);
    visual.container.setRotation(walkWave * 0.1);

    visual.shadow.setScale(0.8 + spawnEase * 0.2, 1);
    visual.shadow.setAlpha(0.12 + spawnEase * 0.16);

    visual.artLayer.setPosition(0, base.y - Math.abs(walkWave) * 3);
    visual.artLayer.setScale(base.scale * (1 + squash), base.scale * (1 - squash));
    visual.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);

    this.drawEyes(
      visual.eyes,
      KEYLET_RIG,
      keylet.facing,
      keylet.hitFlashMs > 0 ? 'hit' : 'default',
      timeMs
    );
  }

  private drawEyes(
    graphics: Phaser.GameObjects.Graphics,
    rig: typeof DOORBERT_RIG | typeof KEYLET_RIG,
    facingRaw: SimVector,
    emotionName: string,
    timeMs: number
  ) {
    const gaze = rig.gaze;
    const expressions = resolveEyeExpressions(gaze.emotions);
    const expression = expressions[emotionName] ?? expressions.default;
    const facing = normalize(facingRaw);

    graphics.clear();

    for (const name of ['left', 'right'] as const) {
      drawRuntimeEye(graphics, name, gaze.eyes[name], rig.base.imageSize, expression, {
        facingX: facing.x,
        facingY: facing.y,
        offsetScaleX: gaze.pupilOffsetScale.x,
        offsetScaleY: gaze.pupilOffsetScale.y,
        timeMs
      });
    }
  }
}
