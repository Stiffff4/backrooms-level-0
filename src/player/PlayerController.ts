import '@babylonjs/core/Collisions/collisionCoordinator';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { gameConfig } from '../config/game.config';
import { PlayerInput } from './PlayerInput';
import type {
  HorizontalVelocity,
  PlayerMovementFrame,
  PlayerMovementListener,
  PlayerSettings,
  PointerLockListener,
} from './player.types';

const MAX_DELTA_SECONDS = 1 / 20;
const MAX_FALL_SPEED = 35;
const MOUSE_RADIANS_PER_PIXEL = 0.0025;
const MAX_PITCH = Math.PI / 2 - 0.04;
const MOVEMENT_EPSILON = 0.000_01;
const GROUND_COLLISION_EPSILON = 0.000_1;
const HEAD_BOB_RESPONSE = 22;
const MIN_SENSITIVITY = 0.1;
const MAX_SENSITIVITY = 2;

const ZERO_VELOCITY: HorizontalVelocity = { x: 0, z: 0 };

export function approachHorizontalVelocity(
  current: Readonly<HorizontalVelocity>,
  target: Readonly<HorizontalVelocity>,
  maxDelta: number,
): HorizontalVelocity {
  const deltaX = target.x - current.x;
  const deltaZ = target.z - current.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const safeMaxDelta = Math.max(0, maxDelta);

  if (distance <= safeMaxDelta || distance <= Number.EPSILON) {
    return { x: target.x, z: target.z };
  }

  const scale = safeMaxDelta / distance;
  return {
    x: current.x + deltaX * scale,
    z: current.z + deltaZ * scale,
  };
}

export function smoothHorizontalVelocity(
  current: Readonly<HorizontalVelocity>,
  target: Readonly<HorizontalVelocity>,
  acceleration: number,
  braking: number,
  deltaSeconds: number,
): HorizontalVelocity {
  const targetIsMoving = Math.hypot(target.x, target.z) > MOVEMENT_EPSILON;
  const rate = targetIsMoving ? acceleration : braking;
  return approachHorizontalVelocity(current, target, Math.max(0, rate) * Math.max(0, deltaSeconds));
}

export function calculateDesiredHorizontalVelocity(
  moveX: number,
  moveZ: number,
  yaw: number,
  speed: number,
): HorizontalVelocity {
  const inputLength = Math.hypot(moveX, moveZ);
  if (inputLength <= Number.EPSILON || speed <= 0) {
    return { ...ZERO_VELOCITY };
  }

  const inputScale = 1 / Math.max(1, inputLength);
  const localX = moveX * inputScale;
  const localZ = moveZ * inputScale;
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  return {
    x: (localX * cosYaw + localZ * sinYaw) * speed,
    z: (localZ * cosYaw - localX * sinYaw) * speed,
  };
}

export class PlayerController {
  public readonly camera: FreeCamera;
  public readonly input: PlayerInput;

  private readonly collider: Mesh;
  private readonly movementListeners = new Set<PlayerMovementListener>();
  private readonly previousActiveCamera: Camera | null;
  private readonly collisionsWereEnabled: boolean;
  private settings: PlayerSettings;
  private horizontalVelocity: HorizontalVelocity = { ...ZERO_VELOCITY };
  private verticalVelocity = 0;
  private yaw = 0;
  private pitch = 0;
  private headBobPhase = 0;
  private headBobX = 0;
  private headBobY = 0;
  private enabled = true;
  private grounded = false;
  private disposed = false;
  private lastMovementFrame: PlayerMovementFrame = {
    deltaSeconds: 0,
    distance: 0,
    horizontalSpeed: 0,
    moving: false,
    sprinting: false,
    grounded: false,
    velocity: { ...ZERO_VELOCITY },
  };

  public constructor(
    private readonly scene: Scene,
    canvas: HTMLCanvasElement,
    spawnPosition: Readonly<Vector3> = Vector3.Zero(),
    settings: Partial<PlayerSettings> = {},
  ) {
    this.settings = sanitizeSettings(settings);
    this.previousActiveCamera = scene.activeCamera;
    this.collisionsWereEnabled = scene.collisionsEnabled;
    scene.collisionsEnabled = true;

    this.collider = new Mesh('player-collider', scene);
    this.collider.position.copyFrom(spawnPosition);
    this.collider.ellipsoid.set(
      gameConfig.movement.colliderRadius,
      gameConfig.movement.colliderHeight / 2,
      gameConfig.movement.colliderRadius,
    );
    this.collider.ellipsoidOffset.set(0, gameConfig.movement.colliderHeight / 2, 0);
    this.collider.checkCollisions = true;
    this.collider.isPickable = false;
    this.collider.isVisible = false;

    this.camera = new FreeCamera('player-camera', Vector3.Zero(), scene);
    this.camera.parent = this.collider;
    this.camera.inputs.clear();
    this.camera.minZ = 0.04;
    this.camera.maxZ = 180;
    this.camera.position.set(0, gameConfig.movement.eyeHeight, 0);
    this.camera.rotation.set(0, 0, 0);
    scene.activeCamera = this.camera;

    this.input = new PlayerInput(canvas);
    this.applyCameraSettings();
  }

  public get movementFrame(): Readonly<PlayerMovementFrame> {
    return this.lastMovementFrame;
  }

  public get position(): Vector3 {
    return this.collider.position.clone();
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public get isGrounded(): boolean {
    return this.grounded;
  }

  public get currentSettings(): Readonly<PlayerSettings> {
    return this.settings;
  }

  public async requestPointerLock(): Promise<boolean> {
    return this.input.requestPointerLock();
  }

  public releasePointerLock(): void {
    this.input.releasePointerLock();
  }

  public subscribePointerLock(listener: PointerLockListener): () => void {
    return this.input.subscribePointerLock(listener);
  }

  public subscribeMovement(listener: PlayerMovementListener): () => void {
    this.movementListeners.add(listener);
    return () => this.movementListeners.delete(listener);
  }

  public setEnabled(enabled: boolean): void {
    if (this.disposed || this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    this.input.setEnabled(enabled);
    this.horizontalVelocity = { ...ZERO_VELOCITY };
    if (!enabled) {
      this.verticalVelocity = 0;
      this.resetHeadBob();
    }
  }

  public updateSettings(settings: Partial<PlayerSettings>): Readonly<PlayerSettings> {
    this.settings = sanitizeSettings({ ...this.settings, ...settings });
    this.applyCameraSettings();
    if (!this.settings.headBob) {
      this.resetHeadBob();
    }
    return this.settings;
  }

  public setPosition(position: Readonly<Vector3>, resetVelocity = true): void {
    this.collider.position.copyFrom(position);
    if (resetVelocity) {
      this.horizontalVelocity = { ...ZERO_VELOCITY };
      this.verticalVelocity = 0;
      this.grounded = false;
    }
  }

  public setLookRotation(yaw: number, pitch = 0): void {
    this.yaw = normalizeAngle(yaw);
    this.pitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
    this.applyCameraRotation();
  }

  public update(deltaSeconds: number): Readonly<PlayerMovementFrame> {
    const inputFrame = this.input.consumeFrame();
    const safeDelta = clamp(deltaSeconds, 0, MAX_DELTA_SECONDS);

    if (this.disposed || !this.enabled || !inputFrame.pointerLocked || safeDelta <= 0) {
      this.horizontalVelocity = { ...ZERO_VELOCITY };
      return this.publishMovementFrame(safeDelta, 0, false);
    }

    this.applyLook(inputFrame.lookX, inputFrame.lookY);

    const targetSpeed = inputFrame.sprint
      ? gameConfig.movement.sprintSpeed
      : gameConfig.movement.walkSpeed;
    const targetVelocity = calculateDesiredHorizontalVelocity(
      inputFrame.moveX,
      inputFrame.moveZ,
      this.yaw,
      targetSpeed,
    );
    this.horizontalVelocity = smoothHorizontalVelocity(
      this.horizontalVelocity,
      targetVelocity,
      gameConfig.movement.acceleration,
      gameConfig.movement.braking,
      safeDelta,
    );

    this.verticalVelocity = Math.max(
      this.verticalVelocity - gameConfig.movement.gravity * safeDelta,
      -MAX_FALL_SPEED,
    );

    const previousPosition = this.collider.position.clone();
    const requestedVerticalDisplacement = this.verticalVelocity * safeDelta;
    this.collider.moveWithCollisions(
      new Vector3(
        this.horizontalVelocity.x * safeDelta,
        requestedVerticalDisplacement,
        this.horizontalVelocity.z * safeDelta,
      ),
    );

    const actualX = this.collider.position.x - previousPosition.x;
    const actualY = this.collider.position.y - previousPosition.y;
    const actualZ = this.collider.position.z - previousPosition.z;
    const distance = Math.hypot(actualX, actualZ);
    this.grounded =
      requestedVerticalDisplacement < 0 &&
      actualY > requestedVerticalDisplacement + GROUND_COLLISION_EPSILON;
    if (this.grounded) {
      this.verticalVelocity = 0;
    }

    const moving = distance > MOVEMENT_EPSILON;
    const sprinting = moving && inputFrame.sprint;
    this.updateHeadBob(safeDelta, moving, sprinting);

    return this.publishMovementFrame(safeDelta, distance, sprinting);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.movementListeners.clear();
    this.input.dispose();

    if (this.scene.activeCamera === this.camera) {
      this.scene.activeCamera = this.previousActiveCamera;
    }
    this.camera.parent = null;
    this.camera.dispose();
    this.collider.dispose();
    this.scene.collisionsEnabled = this.collisionsWereEnabled;
  }

  private applyLook(lookX: number, lookY: number): void {
    const sensitivity = this.settings.sensitivity * MOUSE_RADIANS_PER_PIXEL;
    this.yaw = normalizeAngle(this.yaw + lookX * sensitivity);
    const verticalDirection = this.settings.invertY ? -1 : 1;
    this.pitch = clamp(this.pitch + lookY * sensitivity * verticalDirection, -MAX_PITCH, MAX_PITCH);
    this.applyCameraRotation();
  }

  private applyCameraRotation(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private applyCameraSettings(): void {
    this.camera.fov = degreesToRadians(this.settings.fov);
  }

  private updateHeadBob(deltaSeconds: number, moving: boolean, sprinting: boolean): void {
    let targetX = 0;
    let targetY = 0;

    if (this.settings.headBob && moving && this.grounded) {
      const frequency = sprinting
        ? gameConfig.movement.headBobSprintFrequency
        : gameConfig.movement.headBobWalkFrequency;
      const amplitude = sprinting
        ? gameConfig.movement.headBobSprintAmplitude
        : gameConfig.movement.headBobWalkAmplitude;
      this.headBobPhase = (this.headBobPhase + frequency * deltaSeconds) % (Math.PI * 4);
      targetX = Math.cos(this.headBobPhase * 0.5) * amplitude * 0.22;
      targetY = Math.sin(this.headBobPhase) * amplitude;
    }

    const response = 1 - Math.exp(-HEAD_BOB_RESPONSE * deltaSeconds);
    this.headBobX += (targetX - this.headBobX) * response;
    this.headBobY += (targetY - this.headBobY) * response;
    this.camera.position.set(this.headBobX, gameConfig.movement.eyeHeight + this.headBobY, 0);
  }

  private resetHeadBob(): void {
    this.headBobPhase = 0;
    this.headBobX = 0;
    this.headBobY = 0;
    this.camera.position.set(0, gameConfig.movement.eyeHeight, 0);
  }

  private publishMovementFrame(
    deltaSeconds: number,
    distance: number,
    sprinting: boolean,
  ): Readonly<PlayerMovementFrame> {
    const moving = distance > MOVEMENT_EPSILON;
    this.lastMovementFrame = {
      deltaSeconds,
      distance,
      horizontalSpeed: deltaSeconds > 0 ? distance / deltaSeconds : 0,
      moving,
      sprinting: moving && sprinting,
      grounded: this.grounded,
      velocity: { ...this.horizontalVelocity },
    };

    for (const listener of this.movementListeners) {
      listener(this.lastMovementFrame);
    }

    return this.lastMovementFrame;
  }
}

function sanitizeSettings(settings: Partial<PlayerSettings>): PlayerSettings {
  return {
    sensitivity: clamp(
      finiteOr(settings.sensitivity, gameConfig.camera.defaultSensitivity),
      MIN_SENSITIVITY,
      MAX_SENSITIVITY,
    ),
    fov: clamp(
      finiteOr(settings.fov, gameConfig.camera.defaultFov),
      gameConfig.camera.minFov,
      gameConfig.camera.maxFov,
    ),
    headBob: settings.headBob ?? true,
    invertY: settings.invertY ?? false,
  };
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
