import type { InputSnapshot, InputVector } from '../../input/types';
import type { RoomBounds } from '../rooms';

export type SimVector = {
  x: number;
  y: number;
};

export type BowbertBowPose = 'relaxed' | 'drawing' | 'release';

export type BowbertPlayerEvent =
  | {
      type: 'arrow-fired';
      origin: SimVector;
      direction: SimVector;
      damage: number;
      speed: number;
    }
  | {
      type: 'dodge-started';
      direction: SimVector;
    };

export interface BowbertDodgeState {
  activeMs: number;
  durationMs: number;
  cooldownMs: number;
  invulnerableMs: number;
  direction: SimVector;
}

export interface BowbertPlayerState {
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  aim: SimVector;
  moveAmount: number;
  walkPhase: number;
  drawProgress: number;
  bowPose: BowbertBowPose;
  isFiring: boolean;
  fireRecoilMs: number;
  hitFlashMs: number;
  hitSquashMs: number;
  /** >0 while polymorphed into a sheep (Hexbrim's hex): slow, no bow. */
  hexedMs: number;
  dodge: BowbertDodgeState;
}

export interface BowbertPlayerFrame {
  state: BowbertPlayerState;
  events: BowbertPlayerEvent[];
}

const PLAYER_RADIUS = 30;
const PLAYER_SPEED = 178;
const DODGE_SPEED = 540;
const DODGE_DURATION_MS = 310;
const DODGE_COOLDOWN_MS = 680;
const DODGE_INVULNERABLE_MS = 360;
const FIRST_ARROW_MS = 0;
const ARROW_CADENCE_MS = 360;
const ARROW_DAMAGE = 1;
const ARROW_SPEED = 575;
const ARROW_MUZZLE_DISTANCE = 38;
const RELEASE_POSE_MS = 110;
const FIRE_RECOIL_MS = 155;
const HIT_FLASH_MS = 170;
const HIT_SQUASH_MS = 210;
const DEAD_ZONE = 0.001;

const copyVector = (vector: InputVector | SimVector): SimVector => ({
  x: vector.x,
  y: vector.y
});

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const vectorLength = (vector: InputVector | SimVector): number => Math.hypot(vector.x, vector.y);

const normalize = (vector: InputVector | SimVector): SimVector => {
  const length = vectorLength(vector);

  if (length <= DEAD_ZONE) {
    return zeroVector();
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const isActiveVector = (vector: InputVector | SimVector): boolean => vectorLength(vector) > DEAD_ZONE;

const clampPositionToBounds = (position: SimVector, bounds: RoomBounds): SimVector => ({
  x: Math.min(
    bounds.x + bounds.width - bounds.border - PLAYER_RADIUS,
    Math.max(bounds.x + bounds.border + PLAYER_RADIUS, position.x)
  ),
  y: Math.min(
    bounds.y + bounds.height - bounds.border - PLAYER_RADIUS,
    Math.max(bounds.y + bounds.border + PLAYER_RADIUS, position.y)
  )
});

export const createBowbertPlayerState = (position: SimVector): BowbertPlayerState => ({
  position: copyVector(position),
  velocity: zeroVector(),
  facing: { x: 1, y: 0 },
  aim: { x: 1, y: 0 },
  moveAmount: 0,
  walkPhase: 0,
  drawProgress: 0,
  bowPose: 'relaxed',
  isFiring: false,
  fireRecoilMs: 0,
  hitFlashMs: 0,
  hitSquashMs: 0,
  hexedMs: 0,
  dodge: {
    activeMs: 0,
    durationMs: DODGE_DURATION_MS,
    cooldownMs: 0,
    invulnerableMs: 0,
    direction: { x: 1, y: 0 }
  }
});

export class BowbertPlayerModel {
  readonly state: BowbertPlayerState;

  private nextArrowMs = 0;
  private drawCycleMs = FIRST_ARROW_MS;
  private wasFiring = false;
  private releasePoseMs = 0;

  constructor(startPosition: SimVector) {
    this.state = createBowbertPlayerState(startPosition);
  }

  update(snapshot: InputSnapshot, deltaMs: number, bounds: RoomBounds): BowbertPlayerFrame {
    const events: BowbertPlayerEvent[] = [];
    const deltaSeconds = deltaMs / 1000;

    this.state.hexedMs = decay(this.state.hexedMs, deltaMs);

    // A sheep cannot draw a bow; it can still waddle and tumble.
    const effectiveSnapshot: InputSnapshot =
      this.state.hexedMs > 0 ? { ...snapshot, firing: false } : snapshot;

    this.updateFacing(effectiveSnapshot);
    this.updateDodge(effectiveSnapshot, deltaMs, events);
    this.updateMovement(effectiveSnapshot, deltaSeconds, bounds);
    this.updateFiring(effectiveSnapshot, deltaMs, events);
    this.updateFeedback(deltaMs);

    return {
      state: this.state,
      events
    };
  }

  /** Hexbrim's polymorph: sheep form for `durationMs` (i-frames block it). */
  markHexed(durationMs: number) {
    if (this.state.dodge.invulnerableMs > 0) {
      return;
    }

    this.state.hexedMs = Math.max(this.state.hexedMs, durationMs);
  }

  markHit() {
    if (this.state.dodge.invulnerableMs > 0) {
      return;
    }

    this.state.hitFlashMs = HIT_FLASH_MS;
    this.state.hitSquashMs = HIT_SQUASH_MS;
  }

  private updateFacing(snapshot: InputSnapshot) {
    const aimDirection = normalize(snapshot.aim);
    const moveDirection = normalize(snapshot.move);
    const snapshotFacing = normalize(snapshot.facing);

    if (isActiveVector(aimDirection)) {
      this.state.aim = aimDirection;
      this.state.facing = aimDirection;
      return;
    }

    if (snapshot.source === 'desktop' && isActiveVector(moveDirection)) {
      this.state.facing = moveDirection;
      this.state.aim = moveDirection;
      return;
    }

    if (isActiveVector(snapshotFacing)) {
      this.state.facing = snapshotFacing;
    }

    this.state.aim = copyVector(this.state.facing);
  }

  private updateDodge(
    snapshot: InputSnapshot,
    deltaMs: number,
    events: BowbertPlayerEvent[]
  ) {
    const dodge = this.state.dodge;

    dodge.cooldownMs = decay(dodge.cooldownMs, deltaMs);
    dodge.invulnerableMs = decay(dodge.invulnerableMs, deltaMs);

    if (dodge.activeMs > 0) {
      dodge.activeMs = decay(dodge.activeMs, deltaMs);
    }

    if (!snapshot.actions.dodge || dodge.cooldownMs > 0 || dodge.activeMs > 0) {
      return;
    }

    const moveDirection = normalize(snapshot.move);
    const direction = isActiveVector(moveDirection) ? moveDirection : copyVector(this.state.facing);

    dodge.activeMs = DODGE_DURATION_MS;
    dodge.durationMs = DODGE_DURATION_MS;
    dodge.cooldownMs = DODGE_COOLDOWN_MS;
    dodge.invulnerableMs = DODGE_INVULNERABLE_MS;
    dodge.direction = direction;

    events.push({
      type: 'dodge-started',
      direction: copyVector(direction)
    });
  }

  private updateMovement(snapshot: InputSnapshot, deltaSeconds: number, bounds: RoomBounds) {
    const dodge = this.state.dodge;
    const move = copyVector(snapshot.move);
    const moveLength = Math.min(1, vectorLength(move));
    const moveDirection = moveLength > DEAD_ZONE ? normalize(move) : zeroVector();

    if (dodge.activeMs > 0) {
      const progress = 1 - dodge.activeMs / Math.max(1, dodge.durationMs);
      const easedSpeed = DODGE_SPEED * (0.78 + Math.sin(progress * Math.PI) * 0.22);

      this.state.velocity = {
        x: dodge.direction.x * easedSpeed,
        y: dodge.direction.y * easedSpeed
      };
      this.state.moveAmount = 1;
    } else {
      const speed = this.state.hexedMs > 0 ? PLAYER_SPEED * 0.55 : PLAYER_SPEED;

      this.state.velocity = {
        x: moveDirection.x * speed * moveLength,
        y: moveDirection.y * speed * moveLength
      };
      this.state.moveAmount = moveLength;
    }

    this.state.position = clampPositionToBounds(
      {
        x: this.state.position.x + this.state.velocity.x * deltaSeconds,
        y: this.state.position.y + this.state.velocity.y * deltaSeconds
      },
      bounds
    );

    const phaseSpeed = dodge.activeMs > 0 ? 0.024 : 0.014 * this.state.moveAmount;

    if (phaseSpeed > 0) {
      this.state.walkPhase += phaseSpeed * deltaSeconds * 1000;
    }
  }

  private updateFiring(
    snapshot: InputSnapshot,
    deltaMs: number,
    events: BowbertPlayerEvent[]
  ) {
    const firing = snapshot.firing;

    this.releasePoseMs = decay(this.releasePoseMs, deltaMs);
    this.state.fireRecoilMs = decay(this.state.fireRecoilMs, deltaMs);

    if (firing && !this.wasFiring) {
      this.nextArrowMs = FIRST_ARROW_MS;
      this.drawCycleMs = FIRST_ARROW_MS;
    }

    if (!firing) {
      this.nextArrowMs = 0;
      this.drawCycleMs = FIRST_ARROW_MS;
      this.state.drawProgress = 0;
      this.state.bowPose = this.releasePoseMs > 0 ? 'release' : 'relaxed';
      this.state.isFiring = false;
      this.wasFiring = false;
      return;
    }

    this.nextArrowMs -= deltaMs;
    this.state.isFiring = true;

    if (this.nextArrowMs <= 0) {
      const direction = copyVector(this.state.aim);

      events.push({
        type: 'arrow-fired',
        origin: {
          x: this.state.position.x + direction.x * ARROW_MUZZLE_DISTANCE,
          y: this.state.position.y + direction.y * ARROW_MUZZLE_DISTANCE - 8
        },
        direction,
        damage: ARROW_DAMAGE,
        speed: ARROW_SPEED
      });

      this.releasePoseMs = RELEASE_POSE_MS;
      this.state.fireRecoilMs = FIRE_RECOIL_MS;
      this.nextArrowMs += ARROW_CADENCE_MS;
      this.drawCycleMs = ARROW_CADENCE_MS;
    }

    this.state.drawProgress = clamp01(1 - this.nextArrowMs / Math.max(1, this.drawCycleMs));
    this.state.bowPose = this.releasePoseMs > 0 ? 'release' : 'drawing';
    this.wasFiring = true;
  }

  private updateFeedback(deltaMs: number) {
    this.state.hitFlashMs = decay(this.state.hitFlashMs, deltaMs);
    this.state.hitSquashMs = decay(this.state.hitSquashMs, deltaMs);
  }
}
