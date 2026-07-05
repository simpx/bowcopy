import type { InputSnapshot, InputSource, InputVector } from './types';

const DEFAULT_FACING: InputVector = { x: 1, y: 0 };
const DEAD_ZONE = 0.08;

const copyVector = (vector: InputVector): InputVector => ({
  x: vector.x,
  y: vector.y
});

const zeroVector = (): InputVector => ({ x: 0, y: 0 });

const magnitude = (vector: InputVector) => Math.hypot(vector.x, vector.y);

const clampUnitVector = (vector: InputVector): InputVector => {
  const length = magnitude(vector);

  if (length < DEAD_ZONE) {
    return zeroVector();
  }

  if (length <= 1) {
    return copyVector(vector);
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

const normalizeDirection = (vector: InputVector): InputVector => {
  const length = magnitude(vector);

  if (length < DEAD_ZONE) {
    return zeroVector();
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

export class InputController {
  private moveVector = zeroVector();
  private aimVector = zeroVector();
  private facingVector = copyVector(DEFAULT_FACING);
  private fireHeld = false;
  private dodgeQueued = false;
  private source: InputSource = 'desktop';

  setMoveVector(vector: InputVector, source: InputSource) {
    this.moveVector = clampUnitVector(vector);
    this.source = source;
  }

  setAimVector(vector: InputVector, source: InputSource) {
    const normalized = normalizeDirection(vector);

    this.aimVector = normalized;
    this.source = source;

    if (magnitude(normalized) > 0) {
      this.facingVector = copyVector(normalized);
    }
  }

  setFiring(firing: boolean, source: InputSource) {
    this.fireHeld = firing;
    this.source = source;
  }

  releaseAim(source: InputSource) {
    this.aimVector = zeroVector();
    this.fireHeld = false;
    this.source = source;
  }

  emitDodge(source: InputSource) {
    this.dodgeQueued = true;
    this.source = source;
  }

  consumeSnapshot(): InputSnapshot {
    const snapshot: InputSnapshot = {
      move: copyVector(this.moveVector),
      aim: copyVector(this.aimVector),
      facing: copyVector(this.facingVector),
      firing: this.fireHeld,
      actions: {
        dodge: this.dodgeQueued
      },
      source: this.source
    };

    this.dodgeQueued = false;

    return snapshot;
  }
}
