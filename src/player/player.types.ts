export interface HorizontalVelocity {
  readonly x: number;
  readonly z: number;
}

export interface PlayerSettings {
  sensitivity: number;
  fov: number;
  headBob: boolean;
  invertY: boolean;
}

export interface PlayerInputFrame {
  readonly moveX: number;
  readonly moveZ: number;
  readonly lookX: number;
  readonly lookY: number;
  readonly sprint: boolean;
  readonly pointerLocked: boolean;
}

export interface PlayerMovementFrame {
  readonly deltaSeconds: number;
  readonly distance: number;
  readonly horizontalSpeed: number;
  readonly moving: boolean;
  readonly sprinting: boolean;
  readonly grounded: boolean;
  readonly velocity: HorizontalVelocity;
}

export type PlayerMovementListener = (frame: Readonly<PlayerMovementFrame>) => void;
export type PointerLockListener = (locked: boolean) => void;
