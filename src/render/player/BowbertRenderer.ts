import Phaser from 'phaser';

import bowbertBodyUrl from '../../../assets/prototype-video-crops/player/bowbert-gameplay-facing-right.png';
import bowDrawUrl from '../../../assets/prototype-video-crops/weapons/bow-full-draw.png';
import bowAimingUrl from '../../../assets/prototype-video-crops/weapons/bow-aiming.png';
import bowRelaxedUrl from '../../../assets/prototype-video-crops/weapons/bow-relaxed.png';
import type { BowbertBowPose, BowbertPlayerState, SimVector } from '../../sim/player';
import { createCornerKeyedTexture } from './keyedTexture';

const BODY_RAW_KEY = 'bowbert-body-raw';
const BODY_KEY = 'bowbert-body-keyed';
const BOW_RAW_KEYS: Record<BowbertBowPose, string> = {
  relaxed: 'bowbert-bow-relaxed-raw',
  drawing: 'bowbert-bow-draw-raw',
  release: 'bowbert-bow-release-raw'
};
const BOW_KEYS: Record<BowbertBowPose, string> = {
  relaxed: 'bowbert-bow-relaxed-keyed',
  drawing: 'bowbert-bow-draw-keyed',
  release: 'bowbert-bow-release-keyed'
};
const BODY_SCALE = 0.34;
const BOW_SCALE = 0.34;
const FIRE_RECOIL_MS = 155;
const HIT_FLASH_MS = 170;
const HIT_SQUASH_MS = 210;
const GHOST_LIFETIME_MS = 210;
const GHOST_CADENCE_MS = 34;

interface GhostAfterimage {
  readonly image: Phaser.GameObjects.Image;
  ageMs: number;
}

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
  if (!scene.textures.exists(BODY_RAW_KEY)) {
    scene.load.image(BODY_RAW_KEY, bowbertBodyUrl);
  }

  const bowAssets = [
    { key: BOW_RAW_KEYS.relaxed, url: bowRelaxedUrl },
    { key: BOW_RAW_KEYS.drawing, url: bowDrawUrl },
    { key: BOW_RAW_KEYS.release, url: bowAimingUrl }
  ];

  for (const asset of bowAssets) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.url);
    }
  }
};

export class BowbertRenderer {
  private container?: Phaser.GameObjects.Container;
  private shadow?: Phaser.GameObjects.Ellipse;
  private body?: Phaser.GameObjects.Image;
  private bow?: Phaser.GameObjects.Image;
  private readonly ghosts: GhostAfterimage[] = [];
  private ghostMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  create() {
    createCornerKeyedTexture(this.scene, BODY_RAW_KEY, BODY_KEY, { threshold: 46 });

    for (const pose of Object.keys(BOW_RAW_KEYS) as BowbertBowPose[]) {
      createCornerKeyedTexture(this.scene, BOW_RAW_KEYS[pose], BOW_KEYS[pose], { threshold: 46 });
    }

    this.shadow = this.scene.add.ellipse(0, 25, 58, 16, 0x07120d, 0.28);
    this.body = this.scene.add.image(0, -14, BODY_KEY).setOrigin(0.5).setScale(BODY_SCALE);
    this.bow = this.scene.add
      .image(34, -16, BOW_KEYS.relaxed)
      .setOrigin(0.5)
      .setScale(BOW_SCALE);

    this.container = this.scene.add.container(0, 0, [this.shadow, this.body, this.bow]);
    this.container.setDepth(80);
  }

  update(timeMs: number, deltaMs: number, state: BowbertPlayerState) {
    if (!this.container || !this.body || !this.bow || !this.shadow) {
      return;
    }

    const aim = normalize(state.aim);
    const facingSign = state.facing.x < -0.08 ? -1 : 1;
    const dodgeProgress =
      state.dodge.activeMs > 0 ? 1 - state.dodge.activeMs / Math.max(1, state.dodge.durationMs) : 0;
    const dodgeWave = state.dodge.activeMs > 0 ? Math.sin(dodgeProgress * Math.PI) : 0;
    const walkWave = Math.sin(state.walkPhase) * state.moveAmount;
    const idleWave = Math.sin(timeMs * 0.004);
    const recoil = state.fireRecoilMs / FIRE_RECOIL_MS;
    const hitFlash = state.hitFlashMs / HIT_FLASH_MS;
    const hitSquash = state.hitSquashMs / HIT_SQUASH_MS;
    const bodySquash = walkWave * 0.045 + idleWave * 0.018 + hitSquash * 0.1;
    const dodgeStretch = dodgeWave * 0.14;
    const scaleX = BODY_SCALE * (1 + Math.abs(bodySquash) + dodgeStretch);
    const scaleY = BODY_SCALE * (1 - bodySquash - dodgeStretch * 0.52);

    this.container.setPosition(state.position.x, state.position.y);
    this.container.setDepth(70 + state.position.y / 1000);
    this.container.setRotation(
      Phaser.Math.Clamp(state.velocity.x / 380, -1, 1) * 0.06 +
        state.dodge.direction.x * dodgeWave * 0.13
    );
    this.container.setAlpha(
      state.dodge.invulnerableMs > 0 && Math.sin(timeMs * 0.07) > 0 ? 0.72 : 1
    );

    this.shadow.setScale(1 + Math.abs(state.velocity.x) / 900, 1 - dodgeStretch * 0.28);
    this.shadow.setAlpha(0.24 + state.moveAmount * 0.05);

    this.body.setPosition(-aim.x * recoil * 5, -14 - Math.abs(walkWave) * 2 - aim.y * recoil * 3);
    this.body.setScale(scaleX, scaleY);
    this.body.setFlipX(facingSign < 0);
    this.body.setTint(hitFlash > 0 ? 0xfff0d4 : 0xffffff);

    this.updateBow(aim, state, recoil);
    this.updateGhosts(deltaMs, state, dodgeWave);
  }

  destroy() {
    this.container?.destroy();

    for (const ghost of this.ghosts) {
      ghost.image.destroy();
    }

    this.ghosts.length = 0;
  }

  private updateBow(aim: SimVector, state: BowbertPlayerState, recoil: number) {
    if (!this.bow) {
      return;
    }

    const textureKey = BOW_KEYS[state.bowPose];
    const releaseKick = state.bowPose === 'release' ? Math.max(0.25, recoil) : 0;
    const distance = 35 + state.drawProgress * 5 - releaseKick * 7;
    const angle = Math.atan2(aim.y, aim.x);

    if (this.bow.texture.key !== textureKey) {
      this.bow.setTexture(textureKey);
    }

    this.bow.setPosition(aim.x * distance - aim.x * recoil * 8, -15 + aim.y * 21 - aim.y * recoil * 5);
    this.bow.setRotation(angle + (state.bowPose === 'relaxed' ? 0.1 : 0));
    this.bow.setScale(BOW_SCALE * (1 + state.drawProgress * 0.05), BOW_SCALE);
    this.bow.setFlipY(aim.x < 0);
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

      ghost.image.setAlpha((1 - progress) * 0.34);
      ghost.image.setScale(
        BODY_SCALE * (1 + dodgeWave * 0.12 + progress * 0.04),
        BODY_SCALE * (1 - dodgeWave * 0.08)
      );
    }
  }

  private createGhost(state: BowbertPlayerState, dodgeWave: number) {
    const image = this.scene.add
      .image(state.position.x, state.position.y - 14, BODY_KEY)
      .setOrigin(0.5)
      .setScale(BODY_SCALE * (1 + dodgeWave * 0.08), BODY_SCALE * (1 - dodgeWave * 0.06))
      .setTint(0xb7fff2)
      .setAlpha(0.34)
      .setFlipX(state.facing.x < -0.08)
      .setDepth(66 + state.position.y / 1000);

    this.ghosts.push({
      image,
      ageMs: 0
    });
  }
}
