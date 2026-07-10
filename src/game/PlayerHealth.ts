export interface PlayerHealthState {
  readonly current: number;
  readonly max: number;
}

const HEALTH_STEP = 0.5;

const snapToHealthStep = (value: number): number =>
  Math.round(value / HEALTH_STEP) * HEALTH_STEP;

export class PlayerHealth {
  private current: number;

  constructor(private readonly max: number) {
    this.current = max;
  }

  reset() {
    this.current = this.max;
  }

  heal(amount: number): PlayerHealthState {
    this.current = Math.min(this.max, snapToHealthStep(this.current + Math.max(0, amount)));

    return this.state;
  }

  damage(amount: number): PlayerHealthState {
    this.current = Math.max(0, snapToHealthStep(this.current - Math.max(0, amount)));

    return this.state;
  }

  get state(): PlayerHealthState {
    return {
      current: this.current,
      max: this.max
    };
  }
}
