export type InputSource = 'desktop' | 'touch';

export type InputVector = {
  readonly x: number;
  readonly y: number;
};

export type InputActions = {
  readonly dodge: boolean;
};

export type InputSnapshot = {
  readonly move: InputVector;
  readonly aim: InputVector;
  readonly facing: InputVector;
  readonly firing: boolean;
  readonly actions: InputActions;
  readonly source: InputSource;
};
