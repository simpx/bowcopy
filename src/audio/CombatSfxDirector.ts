import Phaser from 'phaser';

import type { SimVector } from '../sim/player';

export const COMBAT_SFX_KEYS = [
  'shoot_arrow',
  'empty_bow_release',
  'hit_wood_board',
  'hit_sand_or_rock',
  'hit_rock_break_full',
  'hit_rock_chip',
  'hit_actor',
  'hit_hard_dirt',
  'hit_harder_dirt',
  'pickup',
  'equipment_toggle',
  'item_select'
] as const;

type CombatSfxKey = (typeof COMBAT_SFX_KEYS)[number];

type CombatSfxAsset = {
  readonly key: CombatSfxKey;
  readonly url: string;
};

type CueProfile = {
  readonly volume: number;
  readonly volumeJitter: number;
  readonly detuneJitter: number;
  readonly rateJitter: number;
  readonly seekStart: number;
  readonly seekJitter: number;
  readonly cooldownMs: number;
};

type CueOptions = {
  readonly force?: number;
  readonly pos?: SimVector;
};

const COMBAT_SFX_ASSETS: readonly CombatSfxAsset[] = [
  {
    key: 'shoot_arrow',
    url: new URL('../../assets/audio/sfx/game/shoot_arrow.ogg', import.meta.url).href
  },
  {
    key: 'empty_bow_release',
    url: new URL('../../assets/audio/sfx/game/empty_bow_release.wav', import.meta.url).href
  },
  {
    key: 'hit_wood_board',
    url: new URL('../../assets/audio/sfx/game/hit_wood_board.wav', import.meta.url).href
  },
  {
    key: 'hit_sand_or_rock',
    url: new URL('../../assets/audio/sfx/game/hit_sand_or_rock.ogg', import.meta.url).href
  },
  {
    key: 'hit_rock_break_full',
    url: new URL('../../assets/audio/sfx/game/hit_rock_break_full.ogg', import.meta.url).href
  },
  {
    key: 'hit_rock_chip',
    url: new URL('../../assets/audio/sfx/game/hit_rock_chip.ogg', import.meta.url).href
  },
  {
    key: 'hit_actor',
    url: new URL('../../assets/audio/sfx/game/hit_actor.wav', import.meta.url).href
  },
  {
    key: 'hit_hard_dirt',
    url: new URL('../../assets/audio/sfx/game/hit_hard_dirt.wav', import.meta.url).href
  },
  {
    key: 'hit_harder_dirt',
    url: new URL('../../assets/audio/sfx/game/hit_harder_dirt.mp3', import.meta.url).href
  },
  {
    key: 'pickup',
    url: new URL('../../assets/audio/sfx/game/pickup.ogg', import.meta.url).href
  },
  {
    key: 'equipment_toggle',
    url: new URL('../../assets/audio/sfx/game/equipment_toggle.ogg', import.meta.url).href
  },
  {
    key: 'item_select',
    url: new URL('../../assets/audio/sfx/game/item_select.ogg', import.meta.url).href
  }
];

const DEFAULT_PROFILE: CueProfile = {
  volume: 0.28,
  volumeJitter: 0.03,
  detuneJitter: 30,
  rateJitter: 0.02,
  seekStart: 0,
  seekJitter: 0,
  cooldownMs: 60
};

const CUE_PROFILES: Partial<Record<CombatSfxKey, Partial<CueProfile>>> = {
  shoot_arrow: {
    volume: 0.34,
    volumeJitter: 0.035,
    detuneJitter: 28,
    rateJitter: 0.018,
    cooldownMs: 85
  },
  empty_bow_release: {
    volume: 0.24,
    volumeJitter: 0.025,
    detuneJitter: 24,
    rateJitter: 0.012,
    cooldownMs: 130
  },
  hit_actor: {
    volume: 0.22,
    volumeJitter: 0.03,
    detuneJitter: 38,
    rateJitter: 0.03,
    cooldownMs: 80
  },
  hit_wood_board: {
    volume: 0.28,
    volumeJitter: 0.03,
    detuneJitter: 34,
    rateJitter: 0.02,
    cooldownMs: 85
  },
  hit_sand_or_rock: {
    volume: 0.18,
    volumeJitter: 0.035,
    detuneJitter: 55,
    rateJitter: 0.035,
    seekJitter: 0.012,
    cooldownMs: 65
  },
  hit_hard_dirt: {
    volume: 0.18,
    volumeJitter: 0.03,
    detuneJitter: 48,
    rateJitter: 0.03,
    seekJitter: 0.01,
    cooldownMs: 65
  },
  hit_harder_dirt: {
    volume: 0.2,
    volumeJitter: 0.03,
    detuneJitter: 42,
    rateJitter: 0.025,
    seekJitter: 0.008,
    cooldownMs: 70
  },
  hit_rock_chip: {
    volume: 0.22,
    volumeJitter: 0.035,
    detuneJitter: 60,
    rateJitter: 0.04,
    seekJitter: 0.01,
    cooldownMs: 85
  },
  hit_rock_break_full: {
    volume: 0.28,
    volumeJitter: 0.035,
    detuneJitter: 42,
    rateJitter: 0.025,
    cooldownMs: 140
  },
  pickup: {
    volume: 0.2,
    volumeJitter: 0.025,
    detuneJitter: 34,
    rateJitter: 0.025,
    cooldownMs: 55
  },
  equipment_toggle: {
    volume: 0.18,
    volumeJitter: 0.02,
    detuneJitter: 18,
    rateJitter: 0.012,
    cooldownMs: 90
  },
  item_select: {
    volume: 0.18,
    volumeJitter: 0.02,
    detuneJitter: 18,
    rateJitter: 0.012,
    cooldownMs: 90
  }
};

export function preloadCombatSfx(scene: Phaser.Scene): void {
  for (const asset of COMBAT_SFX_ASSETS) {
    if (scene.cache.audio.exists(asset.key)) continue;
    scene.load.audio(asset.key, asset.url);
  }
}

export class CombatSfxDirector {
  private readonly nextPlayableAt = new Map<CombatSfxKey, number>();

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.nextPlayableAt.clear();
  }

  playArrowFire(pos: SimVector): void {
    this.play('shoot_arrow', { force: 0.72, pos });
  }

  playArrowWall(pos: SimVector): void {
    this.play('hit_wood_board', { force: 0.72, pos });
  }

  playEnemyHit(pos: SimVector, damage: number): void {
    this.play('hit_wood_board', { force: Phaser.Math.Clamp(0.45 + damage * 0.24, 0.45, 0.92), pos });
  }

  playEnemyDeath(pos: SimVector): void {
    this.play('hit_wood_board', { force: 0.96, pos });
  }

  playPlayerDamage(pos: SimVector, damage: number): void {
    this.play('hit_actor', { force: Phaser.Math.Clamp(0.58 + damage * 0.22, 0.58, 1), pos });
  }

  playDartWall(pos: SimVector): void {
    this.play('hit_sand_or_rock', { force: 0.36, pos });
  }

  private play(key: CombatSfxKey, options: CueOptions = {}): void {
    if (!this.scene.cache.audio.exists(key)) return;

    const now = this.scene.time.now;
    if (now < (this.nextPlayableAt.get(key) ?? 0)) return;

    const profile = profileFor(key);
    this.nextPlayableAt.set(key, now + profile.cooldownMs);

    const force = Phaser.Math.Clamp(options.force ?? 0.5, 0, 1);
    const config: Phaser.Types.Sound.SoundConfig = {
      volume: Phaser.Math.Clamp(profile.volume * (0.78 + force * 0.34) + randomSigned(profile.volumeJitter), 0, 1),
      rate: Phaser.Math.Clamp(1 + randomSigned(profile.rateJitter), 0.85, 1.15),
      detune: randomSigned(profile.detuneJitter),
      pan: this.panFor(options.pos)
    };

    if (profile.seekStart > 0 || profile.seekJitter > 0) {
      config.seek = profile.seekStart + randomRange(0, profile.seekJitter);
    }

    this.scene.sound.play(key, config);
  }

  private panFor(pos?: SimVector): number {
    if (!pos) return 0;

    const view = this.scene.cameras.main.worldView;
    if (view.width <= 0) return 0;

    const centerX = view.x + view.width / 2;
    return Phaser.Math.Clamp(((pos.x - centerX) / (view.width / 2)) * 0.45, -0.45, 0.45);
  }
}

function profileFor(key: CombatSfxKey): CueProfile {
  return {
    ...DEFAULT_PROFILE,
    ...CUE_PROFILES[key]
  };
}

function randomSigned(amount: number): number {
  return Phaser.Math.FloatBetween(-amount, amount);
}

function randomRange(min: number, max: number): number {
  return Phaser.Math.FloatBetween(min, max);
}
