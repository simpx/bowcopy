import Phaser from 'phaser';

const bossLoopUrl = new URL('../../assets/audio/music/boss_loop.ogg', import.meta.url).href;
const combatLoopUrl = new URL('../../assets/audio/music/combat_loop.ogg', import.meta.url).href;

export type MusicTrack = 'combat' | 'boss';

const MUSIC_KEYS: Record<MusicTrack, string> = {
  combat: 'music_combat',
  boss: 'music_boss'
};

const BASE_VOLUME: Record<MusicTrack, number> = {
  combat: 0.16,
  boss: 0.2
};

const CROSSFADE_MS = 900;
const DUCK_DEPTH = 0.35;

export const preloadMusic = (scene: Phaser.Scene) => {
  if (!scene.cache.audio.exists(MUSIC_KEYS.combat)) {
    scene.load.audio(MUSIC_KEYS.combat, combatLoopUrl);
  }

  if (!scene.cache.audio.exists(MUSIC_KEYS.boss)) {
    scene.load.audio(MUSIC_KEYS.boss, bossLoopUrl);
  }
};

/**
 * One looping background track at a time, with crossfades between tracks and
 * a short duck under big announcements. Starting is autoplay-safe: if the
 * sound system is still locked, playback begins on Phaser's UNLOCKED event.
 */
export class MusicDirector {
  private current?: { track: MusicTrack; sound: Phaser.Sound.BaseSound };
  private pendingTrack: MusicTrack | null = null;
  private unlockHooked = false;

  constructor(private readonly scene: Phaser.Scene) {}

  play(track: MusicTrack) {
    if (this.current?.track === track) {
      return;
    }

    // Music loads in the background after boot; remember the request
    // until notifyLoaded() flushes it.
    if (!this.scene.cache.audio.exists(MUSIC_KEYS[track])) {
      this.pendingTrack = track;
      return;
    }

    if (this.scene.sound.locked) {
      this.pendingTrack = track;

      if (!this.unlockHooked) {
        this.unlockHooked = true;
        this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
          if (this.pendingTrack) {
            this.start(this.pendingTrack);
            this.pendingTrack = null;
          }
        });
      }
      return;
    }

    this.start(track);
  }

  /** Call when the deferred audio finishes loading: starts any queued track. */
  notifyLoaded() {
    if (this.pendingTrack && this.scene.cache.audio.exists(MUSIC_KEYS[this.pendingTrack])) {
      const track = this.pendingTrack;

      this.pendingTrack = null;
      this.play(track);
    }
  }

  /** Dip the volume briefly so an announcement cue can sit on top. */
  duck(holdMs = 900) {
    const active = this.current;

    if (!active || !('volume' in active.sound)) {
      return;
    }

    const sound = active.sound as Phaser.Sound.WebAudioSound;
    const base = BASE_VOLUME[active.track];

    this.scene.tweens.add({
      targets: sound,
      volume: base * DUCK_DEPTH,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: sound,
          volume: base,
          duration: 700,
          delay: holdMs,
          ease: 'Quad.easeIn'
        });
      }
    });
  }

  stop(fadeMs = CROSSFADE_MS) {
    this.pendingTrack = null;
    this.fadeOut(this.current?.sound, fadeMs);
    this.current = undefined;
  }

  destroy() {
    this.current?.sound.destroy();
    this.current = undefined;
    this.pendingTrack = null;
  }

  private start(track: MusicTrack) {
    this.fadeOut(this.current?.sound, CROSSFADE_MS);

    const sound = this.scene.sound.add(MUSIC_KEYS[track], { loop: true, volume: 0 });

    sound.play();
    this.scene.tweens.add({
      targets: sound,
      volume: BASE_VOLUME[track],
      duration: CROSSFADE_MS,
      ease: 'Quad.easeIn'
    });
    this.current = { track, sound };
  }

  private fadeOut(sound: Phaser.Sound.BaseSound | undefined, fadeMs: number) {
    if (!sound) {
      return;
    }

    this.scene.tweens.killTweensOf(sound);
    this.scene.tweens.add({
      targets: sound,
      volume: 0,
      duration: fadeMs,
      ease: 'Quad.easeOut',
      onComplete: () => sound.destroy()
    });
  }
}
