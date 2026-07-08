import Phaser from 'phaser';

import backboardBaseUrl from '../../assets/characters/backboard/base.png';
import doorbertBaseUrl from '../../assets/characters/doorbert/base.png';
import switcherooBaseUrl from '../../assets/characters/switcheroo/base.png';
import { BACKBOARD_RIG } from '../characters/backboardRig';
import { DOORBERT_RIG } from '../characters/doorbertRig';
import { resolveEyeExpressions } from '../characters/eyeEmotionTemplates';
import type { EyeContainerTuning, EyeName } from '../characters/rigSchema';
import { SWITCHEROO_RIG } from '../characters/switcherooRig';
import { drawRuntimeEye } from '../render/eyes/runtimeEye';
import type { CombatFeedbackRenderer } from '../render/feedback';
import type { SimVector } from '../sim/player';

import type { WorkbenchCell, WorkbenchSlot } from './slots';

/**
 * Display stand for characters that are rigged but not yet integrated as an
 * enemy kit: driven purely by rig.json runtime (base + gaze + a generic idle
 * wobble), with the real eye system tracking the review cursor and real
 * feedback on hit/kill. This is the bridge between `rigged` and `tuned` —
 * a character earns a game sim later, but it can be reviewed and face-tuned
 * the moment its rig exists.
 */

interface DisplayRig {
  readonly base: {
    readonly textureKey: string;
    readonly imageSize: { readonly width: number; readonly height: number };
    readonly scale: number;
    readonly y: number;
    readonly shadow: { readonly width: number; readonly height: number; readonly y: number };
  };
  readonly gaze: {
    readonly eyes: Record<EyeName, EyeContainerTuning>;
    readonly pupilOffsetScale: { readonly x: number; readonly y: number };
    readonly emotions: { readonly template: string };
  };
  readonly motion?: Record<string, number | undefined>;
}

const HIT_FLASH_MS = 180;
const RESPAWN_MS = 1200;
const DISPLAY_HP = 3;

export class DisplaySlot implements WorkbenchSlot {
  readonly kind = 'enemy' as const;

  private cell!: WorkbenchCell;
  private feedback!: CombatFeedbackRenderer;
  private container?: Phaser.GameObjects.Container;
  private artLayer?: Phaser.GameObjects.Container;
  private body?: Phaser.GameObjects.Image;
  private eyes?: Phaser.GameObjects.Graphics;
  private shadow?: Phaser.GameObjects.Ellipse;

  private alive = true;
  private hp = DISPLAY_HP;
  private hitFlashMs = 0;
  private respawnMs = -1;

  constructor(
    readonly id: string,
    readonly label: string,
    private readonly rig: DisplayRig,
    private readonly baseUrl: string
  ) {}

  preload(scene: Phaser.Scene) {
    if (!scene.textures.exists(this.rig.base.textureKey)) {
      scene.load.image(this.rig.base.textureKey, this.baseUrl);
    }
  }

  create(scene: Phaser.Scene, cell: WorkbenchCell, feedback: CombatFeedbackRenderer) {
    this.cell = cell;
    this.feedback = feedback;

    const { base } = this.rig;

    this.shadow = scene.add.ellipse(
      0,
      base.shadow.y,
      base.shadow.width,
      base.shadow.height,
      0x07120d,
      0.3
    );
    this.body = scene.add.image(0, 0, base.textureKey).setOrigin(0.5);
    this.eyes = scene.add.graphics();
    this.artLayer = scene.add.container(0, base.y, [this.body, this.eyes]);
    this.container = scene.add
      .container(cell.center.x, cell.center.y, [this.shadow, this.artLayer])
      .setDepth(60);

    this.start();
  }

  start() {
    this.alive = true;
    this.hp = DISPLAY_HP;
    this.hitFlashMs = 0;
    this.respawnMs = -1;
    this.container?.setVisible(true);
    this.feedback?.playEnemySpawn(this.cell.center);
  }

  hit(damage: number) {
    if (!this.alive) {
      return;
    }

    this.hp -= damage;
    this.hitFlashMs = HIT_FLASH_MS;
    this.feedback.playArrowEnemy(this.cell.center, Math.min(damage, 99));

    if (this.hp <= 0) {
      this.alive = false;
      this.respawnMs = RESPAWN_MS;
      this.container?.setVisible(false);
      this.feedback.playEnemyDeath(this.cell.center);
    }
  }

  aliveCount(): number {
    return this.alive ? 1 : 0;
  }

  update(timeMs: number, deltaMs: number, target: SimVector) {
    if (!this.container || !this.artLayer || !this.body || !this.eyes) {
      return;
    }

    if (!this.alive) {
      if (this.respawnMs > 0) {
        this.respawnMs -= deltaMs;

        if (this.respawnMs <= 0) {
          this.start();
        }
      }

      return;
    }

    this.hitFlashMs = Math.max(0, this.hitFlashMs - deltaMs);

    const { base, gaze, motion } = this.rig;
    const hitFlash = this.hitFlashMs / HIT_FLASH_MS;
    const bobAmp = motion?.idleBob ?? motion?.hoverBob ?? 2;
    const squashAmp = motion?.idleSquash ?? 0.02;
    const wave = Math.sin(timeMs * 0.003 + this.cell.center.x * 0.01);
    const squash = wave * squashAmp + hitFlash * 0.08;

    this.artLayer.setPosition(0, base.y + wave * bobAmp);
    this.artLayer.setScale(base.scale * (1 + squash), base.scale * (1 - squash));
    this.body.setTint(hitFlash > 0 ? 0xfff0df : 0xffffff);

    const dx = target.x - this.cell.center.x;
    const dy = target.y - this.cell.center.y;
    const length = Math.hypot(dx, dy) || 1;
    const expressions = resolveEyeExpressions(gaze.emotions);
    const expression = (hitFlash > 0.05 ? expressions.hit : undefined) ?? expressions.default;

    this.eyes.clear();

    for (const name of ['left', 'right'] as const) {
      drawRuntimeEye(this.eyes, name, gaze.eyes[name], base.imageSize, expression, {
        facingX: dx / length,
        facingY: dy / length,
        offsetScaleX: gaze.pupilOffsetScale.x,
        offsetScaleY: gaze.pupilOffsetScale.y,
        timeMs
      });
    }
  }

  destroy() {
    this.container?.destroy();
    this.container = undefined;
  }
}

export const createDisplaySlots = (): DisplaySlot[] => [
  new DisplaySlot('backboard', 'Backboard', BACKBOARD_RIG as unknown as DisplayRig, backboardBaseUrl),
  new DisplaySlot('switcheroo', 'Switcheroo', SWITCHEROO_RIG as unknown as DisplayRig, switcherooBaseUrl),
  new DisplaySlot('doorbert', 'Doorbert', DOORBERT_RIG as unknown as DisplayRig, doorbertBaseUrl)
];

export const preloadDisplaySlotAssets = (scene: Phaser.Scene, focusId?: string) => {
  for (const slot of createDisplaySlots()) {
    if (!focusId || slot.id === focusId) {
      slot.preload(scene);
    }
  }
};
