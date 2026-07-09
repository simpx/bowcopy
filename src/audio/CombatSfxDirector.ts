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
  'shroom_hit',
  'shroom_death',
  'spore_break',
  'dodge_roll',
  'walk_soft_1',
  'walk_soft_2',
  'player_damage_soft',
  'room_clear',
  'pickup',
  'equipment_toggle',
  'item_select',
  'portal_whoosh',
  'spell_bolt',
  'witchfire_ignite',
  'hex_orb_launch',
  'sheep_morph',
  'sheep_bleat',
  'ritual_channel',
  'ritual_blast',
  'shade_summon',
  'door_creak',
  'parry_wood'
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

type BoundsLike = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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
    key: 'shroom_hit',
    url: new URL('../../assets/audio/sfx/game/shroom_hit.wav', import.meta.url).href
  },
  {
    key: 'shroom_death',
    url: new URL('../../assets/audio/sfx/game/shroom_death.wav', import.meta.url).href
  },
  {
    key: 'spore_break',
    url: new URL('../../assets/audio/sfx/game/spore_break.wav', import.meta.url).href
  },
  {
    key: 'dodge_roll',
    url: new URL('../../assets/audio/sfx/game/dodge_roll.ogg', import.meta.url).href
  },
  {
    key: 'walk_soft_1',
    url: new URL('../../assets/audio/sfx/game/walk_soft_1.ogg', import.meta.url).href
  },
  {
    key: 'walk_soft_2',
    url: new URL('../../assets/audio/sfx/game/walk_soft_2.ogg', import.meta.url).href
  },
  {
    key: 'player_damage_soft',
    url: new URL('../../assets/audio/sfx/game/player_damage_soft.wav', import.meta.url).href
  },
  {
    key: 'room_clear',
    url: new URL('../../assets/audio/sfx/game/room_clear.mp3', import.meta.url).href
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
  },
  {
    key: 'portal_whoosh',
    url: new URL('../../assets/audio/sfx/game/portal_whoosh.ogg', import.meta.url).href
  },
  {
    key: 'spell_bolt',
    url: new URL('../../assets/audio/sfx/game/spell_bolt.ogg', import.meta.url).href
  },
  {
    key: 'witchfire_ignite',
    url: new URL('../../assets/audio/sfx/game/witchfire_ignite.ogg', import.meta.url).href
  },
  {
    key: 'hex_orb_launch',
    url: new URL('../../assets/audio/sfx/game/hex_orb_launch.ogg', import.meta.url).href
  },
  {
    key: 'sheep_morph',
    url: new URL('../../assets/audio/sfx/game/sheep_morph.ogg', import.meta.url).href
  },
  {
    key: 'sheep_bleat',
    url: new URL('../../assets/audio/sfx/game/sheep_bleat.ogg', import.meta.url).href
  },
  {
    key: 'ritual_channel',
    url: new URL('../../assets/audio/sfx/game/ritual_channel.ogg', import.meta.url).href
  },
  {
    key: 'ritual_blast',
    url: new URL('../../assets/audio/sfx/game/ritual_blast.ogg', import.meta.url).href
  },
  {
    key: 'shade_summon',
    url: new URL('../../assets/audio/sfx/game/shade_summon.ogg', import.meta.url).href
  },
  {
    key: 'door_creak',
    url: new URL('../../assets/audio/sfx/game/door_creak.ogg', import.meta.url).href
  },
  {
    key: 'parry_wood',
    url: new URL('../../assets/audio/sfx/game/parry_wood.ogg', import.meta.url).href
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
  shroom_hit: {
    volume: 0.12,
    volumeJitter: 0.018,
    detuneJitter: 24,
    rateJitter: 0.018,
    seekJitter: 0.01,
    cooldownMs: 90
  },
  shroom_death: {
    volume: 0.17,
    volumeJitter: 0.02,
    detuneJitter: 24,
    rateJitter: 0.018,
    seekJitter: 0.006,
    cooldownMs: 140
  },
  spore_break: {
    volume: 0.15,
    volumeJitter: 0.025,
    detuneJitter: 58,
    rateJitter: 0.035,
    seekJitter: 0.006,
    cooldownMs: 48
  },
  dodge_roll: {
    volume: 0.13,
    volumeJitter: 0.018,
    detuneJitter: 26,
    rateJitter: 0.018,
    cooldownMs: 180
  },
  walk_soft_1: {
    volume: 0.024,
    volumeJitter: 0.006,
    detuneJitter: 16,
    rateJitter: 0.012,
    cooldownMs: 150
  },
  walk_soft_2: {
    volume: 0.022,
    volumeJitter: 0.006,
    detuneJitter: 16,
    rateJitter: 0.012,
    cooldownMs: 150
  },
  player_damage_soft: {
    volume: 0.13,
    volumeJitter: 0.018,
    detuneJitter: 18,
    rateJitter: 0.012,
    cooldownMs: 95
  },
  room_clear: {
    volume: 0.16,
    volumeJitter: 0.015,
    detuneJitter: 18,
    rateJitter: 0.012,
    cooldownMs: 360
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
  },
  portal_whoosh: {
    volume: 0.26,
    volumeJitter: 0.03,
    detuneJitter: 60,
    rateJitter: 0.04,
    cooldownMs: 200
  },
  spell_bolt: {
    volume: 0.24,
    volumeJitter: 0.03,
    detuneJitter: 40,
    rateJitter: 0.03,
    cooldownMs: 240
  },
  witchfire_ignite: {
    volume: 0.24,
    volumeJitter: 0.03,
    detuneJitter: 30,
    rateJitter: 0.02,
    cooldownMs: 300
  },
  hex_orb_launch: {
    volume: 0.26,
    volumeJitter: 0.02,
    detuneJitter: 20,
    rateJitter: 0.015,
    cooldownMs: 500
  },
  sheep_morph: {
    volume: 0.28,
    volumeJitter: 0.02,
    detuneJitter: 20,
    rateJitter: 0.015,
    cooldownMs: 400
  },
  sheep_bleat: {
    volume: 0.22,
    volumeJitter: 0.03,
    detuneJitter: 70,
    rateJitter: 0.05,
    cooldownMs: 600
  },
  ritual_channel: {
    volume: 0.26,
    volumeJitter: 0.015,
    detuneJitter: 0,
    rateJitter: 0,
    cooldownMs: 2000
  },
  ritual_blast: {
    volume: 0.32,
    volumeJitter: 0.02,
    detuneJitter: 20,
    rateJitter: 0.015,
    cooldownMs: 800
  },
  shade_summon: {
    volume: 0.26,
    volumeJitter: 0.02,
    detuneJitter: 30,
    rateJitter: 0.02,
    cooldownMs: 800
  },
  door_creak: {
    volume: 0.24,
    volumeJitter: 0.025,
    detuneJitter: 30,
    rateJitter: 0.02,
    cooldownMs: 350
  },
  parry_wood: {
    volume: 0.28,
    volumeJitter: 0.03,
    detuneJitter: 40,
    rateJitter: 0.025,
    cooldownMs: 120
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
  private nextWalkAt = 0;
  private walkStepIndex = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.nextPlayableAt.clear();
    this.nextWalkAt = 0;
    this.walkStepIndex = 0;
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

  playShroomHit(pos: SimVector, damage: number): void {
    this.play('shroom_hit', { force: Phaser.Math.Clamp(0.42 + damage * 0.22, 0.42, 0.88), pos });
  }

  playShroomDeath(pos: SimVector): void {
    this.play('shroom_death', { force: 0.92, pos });
  }

  playPlayerDamage(pos: SimVector, damage: number): void {
    this.play('player_damage_soft', { force: Phaser.Math.Clamp(0.45 + damage * 0.2, 0.45, 0.78), pos });
  }

  playDodge(pos: SimVector): void {
    this.play('dodge_roll', { force: 0.7, pos });
  }

  playWalk(pos: SimVector, moveAmount: number, isDodging: boolean): void {
    const intensity = Phaser.Math.Clamp(moveAmount, 0, 1);

    if (isDodging || intensity < 0.34) return;

    const now = this.scene.time.now;
    if (now < this.nextWalkAt) return;

    this.nextWalkAt = now + Phaser.Math.Linear(340, 230, intensity);
    this.walkStepIndex = (this.walkStepIndex + 1) % 2;
    this.play(this.walkStepIndex === 0 ? 'walk_soft_1' : 'walk_soft_2', {
      force: Phaser.Math.Clamp(intensity * 0.32, 0.12, 0.36),
      pos
    });
  }

  playRoomClear(bounds: BoundsLike): void {
    this.play('room_clear', {
      force: 0.64,
      pos: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      }
    });
  }

  playDartWall(pos: SimVector): void {
    this.play('hit_sand_or_rock', { force: 0.36, pos });
  }

  playSporeBreak(pos: SimVector): void {
    this.play('spore_break', { force: 0.46, pos });
  }

  playPortal(pos: SimVector): void {
    this.play('portal_whoosh', { force: 0.66, pos });
  }

  playSpellBolt(pos: SimVector): void {
    this.play('spell_bolt', { force: 0.7, pos });
  }

  playWitchfireIgnite(pos: SimVector): void {
    this.play('witchfire_ignite', { force: 0.68, pos });
  }

  playHexOrbLaunch(pos: SimVector): void {
    this.play('hex_orb_launch', { force: 0.74, pos });
  }

  /** Polymorph lands: the poof and the sheep, together. */
  playSheepMorph(pos: SimVector): void {
    this.play('sheep_morph', { force: 0.78, pos });
    this.play('sheep_bleat', { force: 0.7, pos });
  }

  playSheepBleat(pos: SimVector): void {
    this.play('sheep_bleat', { force: 0.55, pos });
  }

  playRitualChannel(pos: SimVector): void {
    this.play('ritual_channel', { force: 0.8, pos });
  }

  playRitualBlast(pos: SimVector): void {
    this.play('ritual_blast', { force: 0.95, pos });
  }

  playShadeSummon(pos: SimVector): void {
    this.play('shade_summon', { force: 0.78, pos });
  }

  playDoorCreak(pos: SimVector): void {
    this.play('door_creak', { force: 0.68, pos });
  }

  playParry(pos: SimVector): void {
    this.play('parry_wood', { force: 0.78, pos });
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
