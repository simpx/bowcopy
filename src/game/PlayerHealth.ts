export interface PlayerHealthState {
  readonly current: number;
  readonly max: number;
}

export class PlayerHealth {
  private current: number;

  constructor(private readonly max: number) {
    this.current = max;
  }

  reset() {
    this.current = this.max;
  }

  damage(amount: number): PlayerHealthState {
    this.current = Math.max(0, this.current - Math.max(0, amount));

    return this.state;
  }

  get state(): PlayerHealthState {
    return {
      current: this.current,
      max: this.max
    };
  }
}
