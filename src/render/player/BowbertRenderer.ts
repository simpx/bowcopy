import Phaser from 'phaser';

import sheepbertBaseUrl from '../../../assets/characters/sheepbert/base.png';
import {
  BOWBERT_CHARACTER,
  type CharacterAttachmentSource,
  type EyeName
} from '../characters/layeredCharacterConfig';
import { resolveEyeExpressions } from '../../characters/eyeEmotionTemplates';
import { SHEEPBERT_RIG } from '../../characters/sheepbertRig';
import { drawRuntimeEye } from '../eyes/runtimeEye';
import type { BowbertPlayerState, SimVector } from '../../sim/player';
import {
  BOWBERT_BRANCH_BOW_TUNING,
  BRANCH_BOW_TEXTURE_KEY,
  drawProceduralBranchBow
} from './proceduralBranchBow';

const FIRE_RECOIL_MS = 155;
const HIT_FLASH_MS = 170;
const HIT_SQUASH_MS = 210;
const GHOST_LIFETIME_MS = 210;
const GHOST_CADENCE_MS = 34;

interface GhostAfterimage {
  readonly image: Phaser.GameObjects.Image;
  ageMs: number;
}

const EYE_NAMES: readonly EyeName[] = ['left', 'right'];
const EYE_PUPIL_COLOR = 0x151510;
const BOWBERT_EYE_SOURCE = BOWBERT_CHARACTER.attachments.eyes.source as CharacterAttachmentSource;
const HAS_RUNTIME_EYES = BOWBERT_EYE_SOURCE === 'runtime-shape';

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

export const preloadBowbertPlayerAssets = (scene: Phaser.Scene) => {
  if (!scene.textures.exists(SHEEPBERT_RIG.base.textureKey)) {
    scene.load.image(SHEEPBERT_RIG.base.textureKey, sheepbertBaseUrl);
  }

  if (!scene.textures.exists(BOWBERT_CHARACTER.base.textureKey)) {
    scene.load.image(BOWBERT_CHARACTER.base.textureKey, BOWBERT_CHARACTER.base.imageUrl);
  }
};

export class BowbertRenderer {
  private container?: Phaser.GameObjects.Container;
  private shadow?: Phaser.GameObjects.Ellipse;
  private body?: Phaser.GameObjects.Image;
  private eyeLayer?: Phaser.GameObjects.Container;
  private eyeGraphics?: Phaser.GameObjects.Graphics;
  private sheepMode = false;
  private bowTexture?: Phaser.Textures.CanvasTexture;
  private bow?: Phaser.GameObjects.Image;
  private readonly ghosts: GhostAfterimage[] = [];
  private ghostMs = 0;
  private defeatStartMs: number | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    const { base } = BOWBERT_CHARACTER;

    this.shadow = this.scene.add.ellipse(0, base.shadow.y, base.shadow.width, base.shadow.height, 0x07120d, 0.28);
    this.body = this.scene.add
      .image(0, base.y, base.textureKey)
      .setOrigin(0.5)
      .setScale(base.scale);
    this.eyeLayer = HAS_RUNTIME_EYES ? this.scene.add.container(0, base.y) : undefined;

    if (this.eyeLayer) {
      this.eyeGraphics = this.scene.add.graphics();
      this.eyeLayer.add(this.eyeGraphics);
    }

    this.bowTexture = this.createBowTexture();
    this.bow = this.scene.add
      .image(34, -16, BRANCH_BOW_TEXTURE_KEY)
      .setOrigin(
        BOWBERT_BRANCH_BOW_TUNING.texture.anchorX / BOWBERT_BRANCH_BOW_TUNING.texture.width,
        BOWBERT_BRANCH_BOW_TUNING.texture.anchorY / BOWBERT_BRANCH_BOW_TUNING.texture.height
      )
      .setScale(BOWBERT_BRANCH_BOW_TUNING.placement.scale);

    this.container = this.scene.add.container(0, 0, [
      this.shadow,
      this.body,
      this.bow,
      ...(this.eyeLayer ? [this.eyeLayer] : [])
    ]);
    this.container.setDepth(80);
  }

  /** Defeat pose: Bowbert keels over and dims while the room fades. */
  playDefeat(timeMs: number) {
    this.defeatStartMs = timeMs;
  }

  resetDefeat() {
    this.defeatStartMs = null;

    this.container?.setRotation(0);
    this.container?.setAlpha(1);
  }

  update(timeMs: number, deltaMs: number, state: BowbertPlayerState) {
    if (!this.container || !this.body || !this.bow || !this.shadow) {
      return;
    }

    if (this.defeatStartMs !== null) {
      const progress = Math.min(1, (timeMs - this.defeatStartMs) / 550);
      const eased = 1 - (1 - progress) ** 2;

      this.container.setPosition(state.position.x, state.position.y + eased * 8);
      this.container.setRotation((Math.PI / 2) * eased);
      this.container.setAlpha(1 - eased * 0.35);
      return;
    }

    const aim = normalize(state.aim);
    const dodgeProgress =
      state.dodge.activeMs > 0 ? 1 - state.dodge.activeMs / Math.max(1, state.dodge.durationMs) : 0;
    const dodgeWave = state.dodge.activeMs > 0 ? Math.sin(dodgeProgress * Math.PI) : 0;
    const walkWave = Math.sin(state.walkPhase) * state.moveAmount;
    const idleWave = Math.sin(timeMs * 0.004);
    const recoil = state.fireRecoilMs / FIRE_RECOIL_MS;
    const hitFlash = state.hitFlashMs / HIT_FLASH_MS;
    const hitSquash = state.hitSquashMs / HIT_SQUASH_MS;
    const eyeEmotion = this.getEyeEmotion(state, hitFlash, hitSquash);
    const { base, motion } = BOWBERT_CHARACTER;
    const hexed = state.hexedMs > 0;

    if (hexed !== this.sheepMode) {
      this.sheepMode = hexed;
      this.body.setTexture(hexed ? SHEEPBERT_RIG.base.textureKey : base.textureKey);
    }

    const formScale = hexed ? SHEEPBERT_RIG.base.scale : base.scale;
    const bodySquash = walkWave * motion.walkSquash + idleWave * motion.idleSquash + hitSquash * motion.hitSquash;
    const dodgeStretch = dodgeWave * motion.dodgeStretch;
    const scaleX = formScale * (1 + Math.abs(bodySquash) + dodgeStretch);
    const scaleY = formScale * (1 - bodySquash - dodgeStretch * 0.52);

    this.container.setPosition(Math.round(state.position.x), Math.round(state.position.y));
    this.container.setDepth(70 + state.position.y / 1000);
    this.container.setRotation(
      Phaser.Math.Clamp(state.velocity.x / 380, -1, 1) * motion.tiltVelocity
    );

    // Real roll: the body (and eyes) tumble a full dodgeSpin turns over the
    // dodge; the shadow stays flat because it lives outside the body.
    const spinSign = state.dodge.direction.x !== 0 ? Math.sign(state.dodge.direction.x) : 1;
    const dodgeSpin = dodgeProgress * Math.PI * 2 * motion.dodgeSpin * spinSign;

    this.container.setAlpha(
      state.dodge.invulnerableMs > 0 && Math.sin(timeMs * 0.07) > 0 ? 0.72 : 1
    );

    this.shadow.setScale(1 + Math.abs(state.velocity.x) / 900, 1 - dodgeStretch * 0.28);
    this.shadow.setAlpha(0.24 + state.moveAmount * 0.05);

    this.body.setPosition(
      -aim.x * recoil * motion.recoilX,
      base.y - Math.abs(walkWave) * motion.walkBob - aim.y * recoil * motion.recoilY
    );
    this.body.setScale(scaleX, scaleY);
    this.body.setRotation(dodgeSpin);
    this.body.setTint(hitFlash > 0 ? 0xfff0d4 : 0xffffff);
    if (this.eyeLayer) {
      this.eyeLayer.setPosition(this.body.x, this.body.y);
      this.eyeLayer.setScale(scaleX, scaleY);
      this.eyeLayer.setRotation(dodgeSpin);
      this.updateEyes(aim, eyeEmotion);
    }

    this.bow.setVisible(!hexed);

    if (!hexed) {
      this.updateBow(timeMs, aim, state, recoil);
    }
    this.updateGhosts(deltaMs, state, dodgeWave);
  }

  destroy() {
    this.container?.destroy();

    for (const ghost of this.ghosts) {
      ghost.image.destroy();
    }

    this.ghosts.length = 0;
  }

  private createBowTexture(): Phaser.Textures.CanvasTexture {
    const { width, height } = BOWBERT_BRANCH_BOW_TUNING.texture;
    const texture = this.scene.textures.exists(BRANCH_BOW_TEXTURE_KEY)
      ? (this.scene.textures.get(BRANCH_BOW_TEXTURE_KEY) as Phaser.Textures.CanvasTexture)
      : this.scene.textures.createCanvas(BRANCH_BOW_TEXTURE_KEY, width, height);

    if (!texture) {
      throw new Error('Failed to create Bowbert branch bow texture.');
    }

    drawProceduralBranchBow(texture.getContext(), {
      draw: 0.06,
      recoil: 0,
      timeSeconds: 0,
      showArrow: false,
      glow: true
    });
    texture.refresh();

    return texture;
  }

  private getEyeEmotion(
    state: BowbertPlayerState,
    hitFlash: number,
    hitSquash: number
  ): string {
    if (hitFlash > 0.05 || hitSquash > 0.05) {
      return 'hit';
    }

    if (state.dodge.activeMs > 0) {
      return 'alert';
    }

    if (state.bowPose !== 'relaxed' || state.drawProgress > 0.08 || state.isFiring) {
      return 'aim';
    }

    return 'default';
  }

  private updateEyes(aim: SimVector, eyeEmotion: string) {
    if (!this.eyeGraphics) {
      return;
    }

    const hexed = this.sheepMode;
    const gaze = hexed ? SHEEPBERT_RIG.gaze : BOWBERT_CHARACTER.gaze;
    const imageSize = hexed ? SHEEPBERT_RIG.base.imageSize : BOWBERT_CHARACTER.base.imageSize;
    const expressions = resolveEyeExpressions(gaze.emotions);
    const expression =
      (hexed ? expressions.scared : undefined) ?? expressions[eyeEmotion] ?? expressions.default;
    const aimLength = Math.hypot(aim.x, aim.y);
    const aimScale = aimLength > 1 ? 1 / aimLength : 1;

    this.eyeGraphics.clear();

    for (const name of EYE_NAMES) {
      drawRuntimeEye(
        this.eyeGraphics,
        name,
        gaze.eyes[name],
        imageSize,
        expression,
        {
          facingX: aim.x * aimScale,
          facingY: aim.y * aimScale,
          offsetScaleX: gaze.pupilOffsetScale.x,
          offsetScaleY: gaze.pupilOffsetScale.y,
          timeMs: 0
        },
        EYE_PUPIL_COLOR
      );
    }
  }

  private updateBow(timeMs: number, aim: SimVector, state: BowbertPlayerState, recoil: number) {
    if (!this.bow || !this.bowTexture) {
      return;
    }

    const placement = BOWBERT_BRANCH_BOW_TUNING.placement;
    const releaseKick = state.bowPose === 'release' ? Math.max(0.25, recoil) : 0;
    const distance = placement.distance + state.drawProgress * placement.drawDistance - releaseKick * placement.releaseKick;
    const angle = Math.atan2(aim.y, aim.x);
    const visualDraw = state.bowPose === 'release' ? 0.04 : state.drawProgress;
    const showArrow = state.bowPose === 'drawing' && state.drawProgress > 0.08;

    drawProceduralBranchBow(this.bowTexture.getContext(), {
      draw: visualDraw,
      recoil,
      timeSeconds: timeMs / 1000,
      showArrow,
      glow: true
    });
    this.bowTexture.refresh();

    this.bow.setPosition(
      placement.offsetX + aim.x * distance - aim.x * recoil * placement.recoilDistance,
      placement.offsetY + aim.y * placement.yDistance - aim.y * recoil * placement.recoilY
    );
    this.bow.setRotation(angle + Phaser.Math.DegToRad(placement.rotationOffsetDeg));
    this.bow.setScale(placement.scale * (1 + state.drawProgress * 0.05));
    this.bow.setAlpha(state.isFiring || state.bowPose !== 'relaxed' ? 1 : 0.92);
  }

  private updateGhosts(deltaMs: number, state: BowbertPlayerState, dodgeWave: number) {
    this.ghostMs -= deltaMs;

    if (state.dodge.activeMs > 0 && this.ghostMs <= 0) {
      this.createGhost(state, dodgeWave);
      this.ghostMs = GHOST_CADENCE_MS;
    }

    if (state.dodge.activeMs <= 0) {
      this.ghostMs = 0;
    }

    for (let index = this.ghosts.length - 1; index >= 0; index -= 1) {
      const ghost = this.ghosts[index];

      ghost.ageMs += deltaMs;

      if (ghost.ageMs >= GHOST_LIFETIME_MS) {
        ghost.image.destroy();
        this.ghosts.splice(index, 1);
        continue;
      }

      const progress = ghost.ageMs / GHOST_LIFETIME_MS;
      const baseScale = BOWBERT_CHARACTER.base.scale;

      ghost.image.setAlpha((1 - progress) * 0.34);
      ghost.image.setScale(
        baseScale * (1 + dodgeWave * 0.12 + progress * 0.04),
        baseScale * (1 - dodgeWave * 0.08)
      );
    }
  }

  private createGhost(state: BowbertPlayerState, dodgeWave: number) {
    const { base } = BOWBERT_CHARACTER;
    const image = this.scene.add
      .image(state.position.x, state.position.y + base.y, base.textureKey)
      .setOrigin(0.5)
      .setScale(base.scale * (1 + dodgeWave * 0.08), base.scale * (1 - dodgeWave * 0.06))
      .setTint(0xb7fff2)
      .setAlpha(0.34)
      .setDepth(66 + state.position.y / 1000);

    this.ghosts.push({
      image,
      ageMs: 0
    });
  }
}
