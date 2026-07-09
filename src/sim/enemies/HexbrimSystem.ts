import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

/**
 * Hexbrim: the chapter boss, mechanically modeled on Hades II's first
 * headmistress fight — a floating witch hat + cloak with nothing inside.
 *
 * Moveset:
 * - float: drifts keeping mid-range distance from Bowbert.
 * - volley: telegraphed fan of magic bolts at Bowbert.
 * - hexcast: a telegraphed polymorph circle blooms at Bowbert's position
 *   and detonates (the sheep-hex homage; v1 detonation damages — a true
 *   player morph is an open item).
 * - teleport: vanishes into a portal, reappears elsewhere (invulnerable
 *   while gone).
 * - witchfire: sprays persistent green fire patches toward Bowbert that
 *   burn on contact for several seconds (area denial).
 * - ritual (at 66% and 33% hp): splits into the real boss plus identical
 *   1-HP illusions and ALL of them channel a ritual — hit the real one
 *   before the cast completes to interrupt it (boss staggers, punish
 *   window); let it finish and an arena-wide blast lands (dodge i-frames
 *   can still evade it).
 * - teleports are interstitial: the boss likes to blink away between
 *   attacks rather than on a schedule.
 * - phase 3 (hp <= 33%): faster cadence, wider volleys, double hexcast,
 *   wider witchfire.
 */

export type HexbrimPhase =
  | 'spawning'
  | 'float'
  | 'volley'
  | 'hexcast'
  | 'firecast'
  | 'channel'
  | 'stagger'
  | 'vanish'
  | 'reappear';

export interface HexbrimEnemy {
  readonly id: number;
  readonly isClone: boolean;
  position: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: HexbrimPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  hitFlashMs: number;
  swayPhase: number;
  /** 0..1 telegraph progress for volley/hexcast (renderer ramps). */
  telegraphProgress: number;
  visible: boolean;
}

export interface HexbrimHexOrb {
  readonly id: number;
  position: SimVector;
  lifeMs: number;
  maxLifeMs: number;
  radius: number;
}

export interface HexbrimFirePatch {
  readonly id: number;
  position: SimVector;
  radius: number;
  lifeMs: number;
  maxLifeMs: number;
}

export type HexbrimEvent =
  | { type: 'hexbrim-spawned'; id: number; position: SimVector }
  | { type: 'hexbrim-teleport-out'; id: number; position: SimVector }
  | { type: 'hexbrim-teleport-in'; id: number; position: SimVector }
  | { type: 'hexbrim-volley'; id: number; origin: SimVector; directions: SimVector[] }
  | { type: 'hexbrim-hexcast'; id: number; position: SimVector }
  | { type: 'hexbrim-hex-caught'; position: SimVector; morphMs: number }
  | { type: 'hexbrim-hex-expired'; position: SimVector }
  | { type: 'hexbrim-witchfire'; id: number; positions: SimVector[] }
  | { type: 'hexbrim-witchfire-burn'; position: SimVector; damage: number }
  | { type: 'hexbrim-channel-started'; durationMs: number }
  | { type: 'hexbrim-channel-interrupted'; position: SimVector }
  | { type: 'hexbrim-ritual-complete'; damage: number }
  | { type: 'hexbrim-clones-split'; positions: SimVector[] }
  | { type: 'hexbrim-clone-dispelled'; id: number; position: SimVector }
  | { type: 'hexbrim-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'hexbrim-killed'; id: number; position: SimVector }
  | { type: 'hexbrim-encounter-cleared' };

export interface HexbrimFrame {
  readonly events: HexbrimEvent[];
  readonly consumedArrowIds: number[];
}

export interface HexbrimEncounterOptions {
  readonly waveIndex?: number;
}

const SPAWN_DURATION_MS = 600;
const FLOAT_MS = 1700;
const FLOAT_MS_PHASE3 = 1100;
const VOLLEY_TELEGRAPH_MS = 700;
const HEXCAST_TELEGRAPH_MS = 520;
const HEX_ORB_SPEED = 150;
const HEX_ORB_LIFE_MS = 4500;
const HEX_ORB_RADIUS = 20;
const HEX_ORB_CATCH_RADIUS = 34;
const FIRECAST_TELEGRAPH_MS = 500;
const FIRE_PATCH_RADIUS = 30;
const FIRE_PATCH_LIFE_MS = 6000;
const FIRE_PATCH_SPACING = 72;
const FIRE_BURN_DAMAGE = 1;
const FIRE_BURN_COOLDOWN_MS = 900;
const CHANNEL_MS = 6000;
const RITUAL_DAMAGE = 2;
const STAGGER_MS = 1400;
const INTERSTITIAL_TELEPORT_CHANCE = 0.6;
const HEX_MORPH_MS = 4000;
const VANISH_MS = 620;
const REAPPEAR_MS = 320;
const FLOAT_SPEED = 64;
const PREFERRED_RANGE = 200;
const BOSS_HP = 64;
const CLONE_COUNT = 2;
const VOLLEY_BOLTS = 5;
const VOLLEY_BOLTS_PHASE3 = 7;
const VOLLEY_SPREAD = 0.62;
const HIT_FLASH_MS = 170;
const BOSS_RADIUS = 30;
const BOSS_HIT_RADIUS = 38;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

const distance = (a: SimVector, b: SimVector): number => Math.hypot(a.x - b.x, a.y - b.y);

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= DEAD_ZONE) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

const vectorTo = (from: SimVector, to: SimVector): SimVector =>
  normalize({ x: to.x - from.x, y: to.y - from.y });

const rotate = (vector: SimVector, angle: number): SimVector => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
};

const clampPositionToBounds = (position: SimVector, bounds: RoomBounds): SimVector => ({
  x: clamp(
    position.x,
    bounds.x + bounds.border + BOSS_RADIUS,
    bounds.x + bounds.width - bounds.border - BOSS_RADIUS
  ),
  y: clamp(
    position.y,
    bounds.y + bounds.border + BOSS_RADIUS,
    bounds.y + bounds.height - bounds.border - BOSS_RADIUS
  )
});

const getSegmentDistanceSquared = (point: SimVector, start: SimVector, end: SimVector): number => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared <= DEAD_ZONE) {
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;

    return deltaX * deltaX + deltaY * deltaY;
  }

  const projection = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
    0,
    1
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  const deltaX = point.x - closestX;
  const deltaY = point.y - closestY;

  return deltaX * deltaX + deltaY * deltaY;
};

type HexbrimAction = 'volley' | 'hexcast' | 'witchfire' | 'teleport';

export class HexbrimSystem {
  private readonly entities = new Map<number, HexbrimEnemy>();
  private readonly hexOrbs = new Map<number, HexbrimHexOrb>();
  private readonly firePatches = new Map<number, HexbrimFirePatch>();
  private burnCooldownMs = 0;
  private channelRemainingMs = 0;
  private nextId = 1;
  private encounterStarted = false;
  private encounterCleared = false;
  private pendingBossSpawn: SimVector | null = null;
  private actionRotationIndex = 0;
  private splitPhase2Done = false;
  private splitPhase3Done = false;
  private forcedAction: HexbrimAction | 'clones' | null = null;

  startEncounter(spawnPoints: readonly RoomSpawnPoint[], _options: HexbrimEncounterOptions = {}) {
    this.clear();
    this.encounterStarted = true;

    const spawn = spawnPoints[0] ?? { id: 'center', x: 0, y: 0 };

    this.pendingBossSpawn = { x: spawn.x, y: spawn.y };
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): HexbrimFrame {
    const events: HexbrimEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
    }

    if (this.pendingBossSpawn) {
      const boss = this.createEntity(this.pendingBossSpawn, false);

      this.entities.set(boss.id, boss);
      events.push({ type: 'hexbrim-spawned', id: boss.id, position: copyVector(boss.position) });
      this.pendingBossSpawn = null;
    }

    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const entity of Array.from(this.entities.values())) {
      this.updateEntity(entity, deltaMs, bounds, playerPosition, events);
    }

    // Polymorph orbs: slow homing projectiles — touch one and you're wool.
    for (const orb of Array.from(this.hexOrbs.values())) {
      orb.lifeMs -= deltaMs;

      if (orb.lifeMs <= 0) {
        this.hexOrbs.delete(orb.id);
        events.push({ type: 'hexbrim-hex-expired', position: copyVector(orb.position) });
        continue;
      }

      const chase = vectorTo(orb.position, playerPosition);
      const step = HEX_ORB_SPEED * (deltaMs / 1000);

      orb.position.x += chase.x * step;
      orb.position.y += chase.y * step;

      if (distance(orb.position, playerPosition) <= HEX_ORB_CATCH_RADIUS) {
        this.hexOrbs.delete(orb.id);
        events.push({
          type: 'hexbrim-hex-caught',
          position: copyVector(orb.position),
          morphMs: HEX_MORPH_MS
        });
      }
    }

    this.burnCooldownMs = Math.max(0, this.burnCooldownMs - deltaMs);

    for (const patch of Array.from(this.firePatches.values())) {
      patch.lifeMs -= deltaMs;

      if (patch.lifeMs <= 0) {
        this.firePatches.delete(patch.id);
        continue;
      }

      if (this.burnCooldownMs <= 0 && distance(patch.position, playerPosition) <= patch.radius) {
        this.burnCooldownMs = FIRE_BURN_COOLDOWN_MS;
        events.push({
          type: 'hexbrim-witchfire-burn',
          position: copyVector(playerPosition),
          damage: FIRE_BURN_DAMAGE
        });
      }
    }

    // Ritual channel: shared timer across the boss and its illusions.
    if (this.channelRemainingMs > 0) {
      this.channelRemainingMs -= deltaMs;

      if (this.channelRemainingMs <= 0) {
        this.channelRemainingMs = 0;
        events.push({ type: 'hexbrim-ritual-complete', damage: RITUAL_DAMAGE });

        for (const other of Array.from(this.entities.values())) {
          if (other.isClone) {
            this.entities.delete(other.id);
            events.push({
              type: 'hexbrim-clone-dispelled',
              id: other.id,
              position: copyVector(other.position)
            });
          }
        }

        const boss = this.boss();

        if (boss) {
          this.enterPhase(boss, 'vanish');
        }
      }
    }

    if (!this.pendingBossSpawn && this.boss() === undefined && !this.encounterCleared) {
      this.encounterCleared = true;
      events.push({ type: 'hexbrim-encounter-cleared' });
    }

    return { events, consumedArrowIds: Array.from(consumedArrowIds) };
  }

  getActiveEntities(): readonly HexbrimEnemy[] {
    return Array.from(this.entities.values());
  }

  getActiveHexOrbs(): readonly HexbrimHexOrb[] {
    return Array.from(this.hexOrbs.values());
  }

  getActiveFirePatches(): readonly HexbrimFirePatch[] {
    return Array.from(this.firePatches.values());
  }

  /** 0..1 while a ritual channel is running (renderer ramps the dread). */
  channelProgress(): number {
    return this.channelRemainingMs > 0 ? 1 - this.channelRemainingMs / CHANNEL_MS : 0;
  }

  activeEnemyCount(): number {
    return this.boss() ? 1 : 0;
  }

  bossHpFraction(): number {
    const boss = this.boss();

    return boss ? boss.hp / boss.maxHp : 0;
  }

  bossStatus(): { hp: number; maxHp: number } | null {
    const boss = this.boss();

    return boss ? { hp: boss.hp, maxHp: boss.maxHp } : null;
  }

  hasEncounterStarted(): boolean {
    return this.encounterStarted;
  }

  isEncounterCleared(): boolean {
    return this.encounterCleared;
  }

  debugForce(action: HexbrimAction | 'clones') {
    this.forcedAction = action;
  }

  clear() {
    this.entities.clear();
    this.hexOrbs.clear();
    this.nextId = 1;
    this.encounterStarted = false;
    this.encounterCleared = false;
    this.pendingBossSpawn = null;
    this.actionRotationIndex = 0;
    this.splitPhase2Done = false;
    this.splitPhase3Done = false;
    this.forcedAction = null;
    this.firePatches.clear();
    this.burnCooldownMs = 0;
    this.channelRemainingMs = 0;
  }

  private boss(): HexbrimEnemy | undefined {
    return Array.from(this.entities.values()).find((entity) => !entity.isClone);
  }

  private phase3(): boolean {
    const boss = this.boss();

    return boss !== undefined && boss.hp <= boss.maxHp * 0.34;
  }

  private phase2(): boolean {
    const boss = this.boss();

    return boss !== undefined && boss.hp <= boss.maxHp * 0.67;
  }

  private createEntity(position: SimVector, isClone: boolean): HexbrimEnemy {
    return {
      id: this.nextId++,
      isClone,
      position: copyVector(position),
      facing: { x: 0, y: 1 },
      hp: isClone ? 1 : BOSS_HP,
      maxHp: isClone ? 1 : BOSS_HP,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      hitFlashMs: 0,
      swayPhase: Math.random() * Math.PI * 2,
      telegraphProgress: 0,
      visible: true
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: HexbrimEvent[],
    consumedArrowIds: Set<number>
  ) {
    const hitRadiusSquared = BOSS_HIT_RADIUS * BOSS_HIT_RADIUS;

    for (const entity of Array.from(this.entities.values())) {
      if (!entity.visible) {
        continue;
      }

      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        if (
          getSegmentDistanceSquared(entity.position, arrow.previousPosition, arrow.position) >
          hitRadiusSquared
        ) {
          continue;
        }

        consumedArrowIds.add(arrow.id);

        if (entity.isClone) {
          this.entities.delete(entity.id);
          events.push({
            type: 'hexbrim-clone-dispelled',
            id: entity.id,
            position: copyVector(entity.position)
          });
          break;
        }

        entity.hp -= arrow.damage;
        entity.hitFlashMs = HIT_FLASH_MS;

        if (entity.phase === 'channel' && this.channelRemainingMs > 0) {
          // Found the real one: ritual interrupted, illusions collapse,
          // the boss reels — the punish window.
          this.channelRemainingMs = 0;
          events.push({
            type: 'hexbrim-channel-interrupted',
            position: copyVector(entity.position)
          });

          for (const other of Array.from(this.entities.values())) {
            if (other.isClone) {
              this.entities.delete(other.id);
              events.push({
                type: 'hexbrim-clone-dispelled',
                id: other.id,
                position: copyVector(other.position)
              });
            }
          }

          this.enterPhase(entity, 'stagger');
        }

        if (entity.hp <= 0) {
          this.entities.delete(entity.id);

          // The illusions die with their caster.
          for (const other of Array.from(this.entities.values())) {
            if (other.isClone) {
              this.entities.delete(other.id);
              events.push({
                type: 'hexbrim-clone-dispelled',
                id: other.id,
                position: copyVector(other.position)
              });
            }
          }

          events.push({ type: 'hexbrim-killed', id: entity.id, position: copyVector(entity.position) });
          break;
        }

        events.push({
          type: 'hexbrim-hit',
          id: entity.id,
          arrowId: arrow.id,
          position: copyVector(entity.position),
          hp: entity.hp,
          damage: arrow.damage
        });
      }
    }
  }

  private enterPhase(entity: HexbrimEnemy, phase: HexbrimPhase) {
    entity.phase = phase;
    entity.phaseElapsedMs = 0;
    entity.telegraphProgress = 0;
    entity.phaseDurationMs =
      phase === 'spawning'
        ? SPAWN_DURATION_MS
        : phase === 'float'
          ? (this.phase3() ? FLOAT_MS_PHASE3 : FLOAT_MS) * (0.85 + Math.random() * 0.3)
          : phase === 'volley'
            ? VOLLEY_TELEGRAPH_MS
            : phase === 'hexcast'
              ? HEXCAST_TELEGRAPH_MS
              : phase === 'firecast'
                ? FIRECAST_TELEGRAPH_MS
                : phase === 'channel'
                  ? CHANNEL_MS
                  : phase === 'stagger'
                    ? STAGGER_MS
                    : phase === 'vanish'
                ? VANISH_MS
                : REAPPEAR_MS;
  }

  private pickAction(): HexbrimAction {
    if (this.forcedAction && this.forcedAction !== 'clones') {
      return this.forcedAction;
    }

    const rotation: HexbrimAction[] = this.phase2()
      ? ['volley', 'witchfire', 'hexcast', 'volley', 'witchfire']
      : ['volley', 'hexcast', 'volley', 'witchfire'];
    const action = rotation[this.actionRotationIndex % rotation.length];

    this.actionRotationIndex += 1;

    return action;
  }

  private updateEntity(
    entity: HexbrimEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: HexbrimEvent[]
  ) {
    entity.phaseElapsedMs += deltaMs;
    entity.hitFlashMs = Math.max(0, entity.hitFlashMs - deltaMs);
    entity.facing = vectorTo(entity.position, playerPosition);
    entity.swayPhase += deltaMs * 0.004;

    if (entity.phase === 'spawning') {
      entity.spawnProgress = clamp01(entity.phaseElapsedMs / entity.phaseDurationMs);

      if (entity.phaseElapsedMs >= entity.phaseDurationMs) {
        this.enterPhase(entity, 'float');
      }

      return;
    }

    if (entity.phase === 'float') {
      // Keep mid-range: drift toward/away to hold PREFERRED_RANGE, orbiting.
      const gap = distance(entity.position, playerPosition);
      const toPlayer = vectorTo(entity.position, playerPosition);
      const orbit = rotate(toPlayer, Math.PI / 2);
      const radial = gap > PREFERRED_RANGE + 30 ? 1 : gap < PREFERRED_RANGE - 30 ? -1 : 0;

      entity.position.x += (toPlayer.x * radial + orbit.x * 0.7) * FLOAT_SPEED * (deltaMs / 1000);
      entity.position.y += (toPlayer.y * radial + orbit.y * 0.7) * FLOAT_SPEED * (deltaMs / 1000);
      entity.position = clampPositionToBounds(entity.position, bounds);

      const forced = this.forcedAction !== null;

      if (entity.phaseElapsedMs >= entity.phaseDurationMs || forced) {
        if (entity.isClone) {
          entity.phaseElapsedMs = 0;
          return;
        }

        const wantsSplit =
          this.forcedAction === 'clones' ||
          (this.phase2() && !this.splitPhase2Done) ||
          (this.phase3() && !this.splitPhase3Done);

        if (wantsSplit && !this.anyClones()) {
          if (this.phase3()) {
            this.splitPhase3Done = true;
            this.splitPhase2Done = true;
          } else {
            this.splitPhase2Done = true;
          }

          this.forcedAction = null;
          this.startRitual(entity, bounds, events);
          return;
        }

        const action = this.pickAction();

        this.forcedAction = null;
        this.enterPhase(
          entity,
          action === 'teleport' ? 'vanish' : action === 'witchfire' ? 'firecast' : action
        );
      }

      return;
    }

    if (entity.phase === 'volley') {
      entity.telegraphProgress = clamp01(entity.phaseElapsedMs / entity.phaseDurationMs);

      if (entity.phaseElapsedMs < entity.phaseDurationMs) {
        return;
      }

      const bolts = this.phase3() ? VOLLEY_BOLTS_PHASE3 : VOLLEY_BOLTS;
      const aim = vectorTo(entity.position, playerPosition);
      const directions: SimVector[] = [];

      for (let index = 0; index < bolts; index += 1) {
        const angle = (index / (bolts - 1) - 0.5) * VOLLEY_SPREAD;

        directions.push(rotate(aim, angle));
      }

      events.push({
        type: 'hexbrim-volley',
        id: entity.id,
        origin: copyVector(entity.position),
        directions
      });
      this.finishAction(entity);
      return;
    }

    if (entity.phase === 'hexcast') {
      entity.telegraphProgress = clamp01(entity.phaseElapsedMs / entity.phaseDurationMs);

      if (entity.phaseElapsedMs < entity.phaseDurationMs) {
        return;
      }

      const casts = this.phase3() ? 2 : 1;

      for (let index = 0; index < casts; index += 1) {
        const offset = rotate(vectorTo(entity.position, playerPosition), (index - (casts - 1) / 2) * 0.5);
        const orb: HexbrimHexOrb = {
          id: this.nextId++,
          position: {
            x: entity.position.x + offset.x * 34,
            y: entity.position.y + offset.y * 34
          },
          lifeMs: HEX_ORB_LIFE_MS,
          maxLifeMs: HEX_ORB_LIFE_MS,
          radius: HEX_ORB_RADIUS
        };

        this.hexOrbs.set(orb.id, orb);
        events.push({ type: 'hexbrim-hexcast', id: entity.id, position: copyVector(orb.position) });
      }

      this.finishAction(entity);
      return;
    }

    if (entity.phase === 'firecast') {
      entity.telegraphProgress = clamp01(entity.phaseElapsedMs / entity.phaseDurationMs);

      if (entity.phaseElapsedMs < entity.phaseDurationMs) {
        return;
      }

      // Spray a trail of witchfire from the boss toward Bowbert.
      const aim = vectorTo(entity.position, playerPosition);
      const patchCount = this.phase3() ? 5 : 4;
      const positions: SimVector[] = [];

      for (let index = 1; index <= patchCount; index += 1) {
        const wobble = rotate(aim, (Math.random() - 0.5) * 0.3);
        const position = clampPositionToBounds(
          {
            x: entity.position.x + wobble.x * FIRE_PATCH_SPACING * index,
            y: entity.position.y + wobble.y * FIRE_PATCH_SPACING * index
          },
          bounds
        );
        const patch: HexbrimFirePatch = {
          id: this.nextId++,
          position,
          radius: FIRE_PATCH_RADIUS,
          lifeMs: FIRE_PATCH_LIFE_MS,
          maxLifeMs: FIRE_PATCH_LIFE_MS
        };

        this.firePatches.set(patch.id, patch);
        positions.push(copyVector(position));
      }

      events.push({ type: 'hexbrim-witchfire', id: entity.id, positions });
      this.finishAction(entity);
      return;
    }

    if (entity.phase === 'channel') {
      // Held by the shared ritual timer; interruption/completion handled
      // in update()/applyArrowHits.
      entity.telegraphProgress = this.channelProgress();

      if (this.channelRemainingMs <= 0 && entity.phaseElapsedMs >= entity.phaseDurationMs) {
        this.enterPhase(entity, 'float');
      }

      return;
    }

    if (entity.phase === 'stagger') {
      if (entity.phaseElapsedMs >= entity.phaseDurationMs) {
        this.enterPhase(entity, 'float');
      }

      return;
    }

    if (entity.phase === 'vanish') {
      if (entity.visible) {
        entity.visible = false;
        events.push({
          type: 'hexbrim-teleport-out',
          id: entity.id,
          position: copyVector(entity.position)
        });
      }

      if (entity.phaseElapsedMs < entity.phaseDurationMs) {
        return;
      }

      // Reappear away from the player.
      const away = rotate(vectorTo(playerPosition, entity.position), (Math.random() - 0.5) * 1.6);

      entity.position = clampPositionToBounds(
        {
          x: playerPosition.x + away.x * (PREFERRED_RANGE + 60),
          y: playerPosition.y + away.y * (PREFERRED_RANGE + 60)
        },
        bounds
      );
      entity.visible = true;
      events.push({
        type: 'hexbrim-teleport-in',
        id: entity.id,
        position: copyVector(entity.position)
      });
      this.enterPhase(entity, 'reappear');
      return;
    }

    if (entity.phase === 'reappear' && entity.phaseElapsedMs >= entity.phaseDurationMs) {
      this.enterPhase(entity, 'float');
    }
  }

  private anyClones(): boolean {
    return Array.from(this.entities.values()).some((entity) => entity.isClone);
  }

  private startRitual(boss: HexbrimEnemy, bounds: RoomBounds, events: HexbrimEvent[]) {
    const positions: SimVector[] = [copyVector(boss.position)];

    for (let index = 0; index < CLONE_COUNT; index += 1) {
      const angle = ((index + 1) / (CLONE_COUNT + 1)) * Math.PI * 2;
      const position = clampPositionToBounds(
        {
          x: boss.position.x + Math.cos(angle) * 185,
          y: boss.position.y + Math.sin(angle) * 135
        },
        bounds
      );
      const clone = this.createEntity(position, true);

      clone.phase = 'channel';
      clone.phaseElapsedMs = 0;
      clone.phaseDurationMs = CHANNEL_MS;
      clone.spawnProgress = 1;
      this.entities.set(clone.id, clone);
      positions.push(copyVector(position));
    }

    events.push({ type: 'hexbrim-clones-split', positions });
    this.enterPhase(boss, 'channel');
    this.channelRemainingMs = CHANNEL_MS;
    events.push({ type: 'hexbrim-channel-started', durationMs: CHANNEL_MS });
  }

  /** Post-attack: the boss likes to blink away before its next move. */
  private finishAction(entity: HexbrimEnemy) {
    if (!entity.isClone && Math.random() < INTERSTITIAL_TELEPORT_CHANCE) {
      this.enterPhase(entity, 'vanish');
      return;
    }

    this.enterPhase(entity, 'float');
  }
}

/** Teleport is triggered through the vanish phase. */
export type { HexbrimAction };
