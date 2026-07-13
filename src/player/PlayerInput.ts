import type { PlayerInputFrame, PointerLockListener } from './player.types';

const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);

export class PlayerInput {
  private readonly pressedCodes = new Set<string>();
  private readonly pointerLockListeners = new Set<PointerLockListener>();
  private lookX = 0;
  private lookY = 0;
  private enabled = true;
  private disposed = false;
  private pointerLocked: boolean;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.pointerLocked = document.pointerLockElement === this.canvas;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  public get isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    if (this.disposed || this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    if (!enabled) {
      this.clearTransientState();
    }
  }

  public async requestPointerLock(): Promise<boolean> {
    if (this.disposed || !this.enabled) {
      return false;
    }

    if (document.pointerLockElement === this.canvas) {
      return true;
    }

    try {
      await this.canvas.requestPointerLock();
      return document.pointerLockElement === this.canvas;
    } catch {
      return false;
    }
  }

  public releasePointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  public consumeFrame(): PlayerInputFrame {
    const lookX = this.lookX;
    const lookY = this.lookY;
    this.lookX = 0;
    this.lookY = 0;

    const active = this.enabled && this.pointerLocked && !this.disposed;
    if (!active) {
      return {
        moveX: 0,
        moveZ: 0,
        lookX: 0,
        lookY: 0,
        sprint: false,
        pointerLocked: false,
      };
    }

    return {
      moveX: Number(this.pressedCodes.has('KeyD')) - Number(this.pressedCodes.has('KeyA')),
      moveZ: Number(this.pressedCodes.has('KeyW')) - Number(this.pressedCodes.has('KeyS')),
      lookX,
      lookY,
      sprint: this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight'),
      pointerLocked: true,
    };
  }

  public subscribePointerLock(listener: PointerLockListener): () => void {
    this.pointerLockListeners.add(listener);
    return () => this.pointerLockListeners.delete(listener);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.releasePointerLock();
    this.clearTransientState();
    this.pointerLockListeners.clear();

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || !this.pointerLocked || !MOVEMENT_CODES.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedCodes.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!MOVEMENT_CODES.has(event.code)) {
      return;
    }

    this.pressedCodes.delete(event.code);
    if (this.pointerLocked) {
      event.preventDefault();
    }
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || !this.pointerLocked) {
      return;
    }

    this.lookX += event.movementX;
    this.lookY += event.movementY;
  };

  private readonly handlePointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    if (locked === this.pointerLocked) {
      return;
    }

    this.pointerLocked = locked;
    if (!locked) {
      this.clearTransientState();
    }

    for (const listener of this.pointerLockListeners) {
      listener(locked);
    }
  };

  private readonly handleBlur = (): void => this.clearTransientState();

  private clearTransientState(): void {
    this.pressedCodes.clear();
    this.lookX = 0;
    this.lookY = 0;
  }
}
