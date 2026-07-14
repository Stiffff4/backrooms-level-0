import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Observable } from '@babylonjs/core/Misc/observable';
import type { Scene } from '@babylonjs/core/scene';

export const ROOM_TEXTURE_IDS = [
  'wallPaper',
  'wallStained',
  'wallNormal',
  'carpet',
  'carpetWet',
  'carpetNormal',
  'ceilingTile',
  'trim',
  'fixtureHousing',
  'fixtureTube',
  'fixtureTubeOff',
  'column',
] as const;

export type RoomTextureId = (typeof ROOM_TEXTURE_IDS)[number];
export type RoomTextureLoadState = 'loading' | 'ready' | 'failed';

export interface RoomMaterialQuality {
  readonly normalMaps: boolean;
  readonly anisotropy: number;
}

export interface RoomTextureFailure {
  readonly id: RoomTextureId;
  readonly url: string;
  readonly critical: boolean;
  readonly message: string;
}

export interface RoomMaterialReadiness {
  readonly criticalReady: boolean;
  readonly criticalSettled: boolean;
  readonly allSettled: boolean;
  readonly readyCount: number;
  readonly pendingCount: number;
  readonly failedCount: number;
  readonly failures: readonly RoomTextureFailure[];
}

export interface RoomTextureRequest {
  readonly id: RoomTextureId;
  readonly url: string;
  readonly critical: boolean;
  readonly normalMap: boolean;
}

export type RoomTextureFactory = (
  request: RoomTextureRequest,
  scene: Scene,
  onLoad: () => void,
  onError: (message?: string, exception?: unknown) => void,
) => Texture;

export interface RoomMaterialLibraryOptions {
  readonly baseUrl?: string;
  readonly textureFactory?: RoomTextureFactory;
  readonly quality?: Partial<RoomMaterialQuality>;
}

export interface RoomMaterialSet {
  readonly wall: StandardMaterial;
  readonly wallStained: StandardMaterial;
  readonly carpet: StandardMaterial;
  readonly carpetWet: StandardMaterial;
  readonly ceiling: StandardMaterial;
  readonly trim: StandardMaterial;
  readonly ceilingGrid: StandardMaterial;
  readonly fixtureHousing: StandardMaterial;
  readonly fixtureEmitter: StandardMaterial;
  readonly fixtureEmitterOff: StandardMaterial;
  readonly column: StandardMaterial;
}

interface TextureDefinition {
  readonly id: RoomTextureId;
  readonly filename: string;
  readonly critical: boolean;
  readonly normalMap?: boolean;
}

interface MutableTextureStatus {
  readonly request: RoomTextureRequest;
  state: RoomTextureLoadState;
  error: string | null;
}

const DEFAULT_QUALITY: Readonly<RoomMaterialQuality> = Object.freeze({
  normalMaps: true,
  anisotropy: 4,
});

/**
 * Fixed fragment-shader light-loop size for every lit room material. This is
 * deliberately independent from the light pool's active budget (which can go
 * up to 12 for spatial coverage at hd720/hd1080) — see the maxSimultaneousLights
 * assignment below for why a higher shader-side ceiling breaks real hardware.
 */
const MATERIAL_LIGHT_SHADER_CEILING = 8;

const TEXTURE_DEFINITIONS: readonly TextureDefinition[] = Object.freeze([
  { id: 'wallPaper', filename: 'wall-paper.png', critical: true },
  { id: 'wallStained', filename: 'wall-stained.png', critical: false },
  { id: 'wallNormal', filename: 'wall-normal.png', critical: false, normalMap: true },
  { id: 'carpet', filename: 'carpet.png', critical: true },
  { id: 'carpetWet', filename: 'carpet-wet.png', critical: false },
  { id: 'carpetNormal', filename: 'carpet-normal.png', critical: false, normalMap: true },
  { id: 'ceilingTile', filename: 'ceiling-tile.png', critical: true },
  { id: 'trim', filename: 'trim.png', critical: true },
  { id: 'fixtureHousing', filename: 'fixture-housing.png', critical: true },
  { id: 'fixtureTube', filename: 'fixture-tube.png', critical: true },
  { id: 'fixtureTubeOff', filename: 'fixture-tube-off.png', critical: false },
  { id: 'column', filename: 'column.png', critical: true },
]);

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function textureErrorMessage(message?: string, exception?: unknown): string {
  if (exception instanceof Error && exception.message.length > 0) {
    return exception.message;
  }
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return 'Texture failed to load.';
}

function defaultTextureFactory(
  request: RoomTextureRequest,
  scene: Scene,
  onLoad: () => void,
  onError: (message?: string, exception?: unknown) => void,
): Texture {
  return new Texture(
    request.url,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
    onLoad,
    onError,
  );
}

/**
 * Owns the eleven shared room materials and every texture attached to them.
 * Geometry may come and go during streaming without creating materials or
 * texture objects per room.
 */
export class RoomMaterialLibrary implements RoomMaterialSet {
  public readonly wall: StandardMaterial;
  public readonly wallStained: StandardMaterial;
  public readonly carpet: StandardMaterial;
  public readonly carpetWet: StandardMaterial;
  public readonly ceiling: StandardMaterial;
  public readonly trim: StandardMaterial;
  public readonly ceilingGrid: StandardMaterial;
  public readonly fixtureHousing: StandardMaterial;
  public readonly fixtureEmitter: StandardMaterial;
  public readonly fixtureEmitterOff: StandardMaterial;
  public readonly column: StandardMaterial;
  public readonly onReadinessChangedObservable = new Observable<RoomMaterialReadiness>();

  private readonly owned: readonly StandardMaterial[];
  private readonly textures = new Map<RoomTextureId, Texture>();
  private readonly textureStatuses = new Map<RoomTextureId, MutableTextureStatus>();
  private readonly textureFactory: RoomTextureFactory;
  private readonly baseUrl: string;
  private readonly pendingFallbacks = new Set<RoomTextureId>();
  private readonly criticalSettledPromise: Promise<RoomMaterialReadiness>;
  private readonly allSettledPromise: Promise<RoomMaterialReadiness>;
  private resolveCriticalSettled!: (readiness: RoomMaterialReadiness) => void;
  private resolveAllSettled!: (readiness: RoomMaterialReadiness) => void;
  private criticalPromiseResolved = false;
  private allPromiseResolved = false;
  private textureRegistrationComplete = false;
  private materialsInitialized = false;
  private qualityValue: Readonly<RoomMaterialQuality> = DEFAULT_QUALITY;
  private disposed = false;

  public constructor(
    private readonly scene: Scene,
    options: RoomMaterialLibraryOptions = {},
  ) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? `${import.meta.env.BASE_URL}assets/generated/`,
    );
    this.textureFactory = options.textureFactory ?? defaultTextureFactory;
    this.criticalSettledPromise = new Promise((resolve) => {
      this.resolveCriticalSettled = resolve;
    });
    this.allSettledPromise = new Promise((resolve) => {
      this.resolveAllSettled = resolve;
    });

    for (const definition of TEXTURE_DEFINITIONS) {
      this.createTexture(definition);
    }
    this.textureRegistrationComplete = true;

    this.wall = this.create('wall', new Color3(0.98, 0.97, 0.88), new Color3(0.025, 0.024, 0.018));
    this.wallStained = this.create(
      'wall-stained',
      new Color3(0.96, 0.95, 0.86),
      new Color3(0.024, 0.023, 0.017),
    );
    this.carpet = this.create(
      'carpet',
      new Color3(0.96, 0.94, 0.86),
      new Color3(0.018, 0.016, 0.011),
    );
    this.carpetWet = this.create(
      'carpet-wet',
      new Color3(0.96, 0.94, 0.86),
      new Color3(0.018, 0.016, 0.011),
    );
    this.ceiling = this.create('ceiling', new Color3(1, 1, 0.97), new Color3(0.065, 0.064, 0.056));
    this.trim = this.create('trim', new Color3(0.78, 0.72, 0.56), new Color3(0.015, 0.013, 0.009));
    this.ceilingGrid = this.create(
      'ceiling-grid',
      new Color3(0.47, 0.47, 0.42),
      new Color3(0.012, 0.012, 0.01),
    );
    this.fixtureHousing = this.create(
      'fixture-housing',
      new Color3(0.7, 0.7, 0.64),
      new Color3(0.02, 0.02, 0.017),
    );
    this.fixtureEmitter = this.create(
      'fixture-emitter',
      new Color3(1, 1, 0.92),
      new Color3(0.96, 0.95, 0.78),
    );
    this.fixtureEmitterOff = this.create(
      'fixture-emitter-off',
      new Color3(0.34, 0.33, 0.25),
      new Color3(0.014, 0.012, 0.006),
    );
    this.column = this.create(
      'column',
      new Color3(0.98, 0.97, 0.88),
      new Color3(0.025, 0.024, 0.018),
    );

    this.wall.diffuseTexture = this.requireTexture('wallPaper');
    this.wallStained.diffuseTexture = this.requireTexture('wallStained');
    this.carpet.diffuseTexture = this.requireTexture('carpet');
    this.carpetWet.diffuseTexture = this.requireTexture('carpet');
    this.ceiling.diffuseTexture = this.requireTexture('ceilingTile');
    this.trim.diffuseTexture = this.requireTexture('trim');
    this.ceilingGrid.diffuseTexture = this.requireTexture('trim');
    this.fixtureHousing.diffuseTexture = this.requireTexture('fixtureHousing');
    this.fixtureEmitter.diffuseTexture = this.requireTexture('fixtureTube');
    this.fixtureEmitter.emissiveTexture = this.requireTexture('fixtureTube');
    this.fixtureEmitterOff.diffuseTexture = this.requireTexture('fixtureTubeOff');
    this.column.diffuseTexture = this.requireTexture('wallPaper');

    this.carpet.specularColor.set(0.015, 0.014, 0.011);
    this.carpetWet.specularColor.copyFrom(this.carpet.specularColor);
    this.carpetWet.specularPower = this.carpet.specularPower;
    this.carpetWet.roughness = this.carpet.roughness;
    this.fixtureEmitter.disableLighting = true;
    this.fixtureEmitterOff.disableLighting = true;
    for (const illuminated of [
      this.wall,
      this.wallStained,
      this.carpet,
      this.carpetWet,
      this.ceiling,
      this.trim,
      this.ceilingGrid,
      this.fixtureHousing,
      this.column,
    ]) {
      // The pool owns the live 4/6/8/10/12 budget, but the material's shader
      // light loop is intentionally capped lower: compiling a fixed-size loop
      // for 10-12 lights combined with bump mapping/specular blew past the
      // fragment shader uniform budget on real hardware (verified working at
      // 8 loop iterations, which is what 'high' already used), causing the
      // wall/floor/ceiling/column shaders to fail to compile and those
      // meshes to render nothing while the unlit fixture materials survived.
      illuminated.maxSimultaneousLights = MATERIAL_LIGHT_SHADER_CEILING;
    }
    this.owned = Object.freeze([
      this.wall,
      this.wallStained,
      this.carpet,
      this.carpetWet,
      this.ceiling,
      this.trim,
      this.ceilingGrid,
      this.fixtureHousing,
      this.fixtureEmitter,
      this.fixtureEmitterOff,
      this.column,
    ]);

    this.materialsInitialized = true;
    for (const textureId of this.pendingFallbacks) {
      this.detachFailedTexture(textureId);
    }
    this.pendingFallbacks.clear();
    this.applyQuality({ ...DEFAULT_QUALITY, ...options.quality });
    this.publishReadiness();
  }

  public get materialCount(): number {
    return this.owned.length;
  }

  public get textureCount(): number {
    return this.textures.size;
  }

  public get quality(): Readonly<RoomMaterialQuality> {
    return this.qualityValue;
  }

  public get readiness(): RoomMaterialReadiness {
    const statuses = [...this.textureStatuses.values()];
    const failures = Object.freeze(
      statuses
        .filter((status) => status.state === 'failed')
        .map((status): RoomTextureFailure =>
          Object.freeze({
            id: status.request.id,
            url: status.request.url,
            critical: status.request.critical,
            message: status.error ?? 'Texture failed to load.',
          }),
        ),
    );
    const criticalStatuses = statuses.filter((status) => status.request.critical);
    const pendingCount = statuses.filter((status) => status.state === 'loading').length;
    const criticalSettled = criticalStatuses.every((status) => status.state !== 'loading');
    return Object.freeze({
      criticalReady:
        criticalSettled && criticalStatuses.every((status) => status.state === 'ready'),
      criticalSettled,
      allSettled: pendingCount === 0,
      readyCount: statuses.filter((status) => status.state === 'ready').length,
      pendingCount,
      failedCount: failures.length,
      failures,
    });
  }

  public getTexture(id: RoomTextureId): Texture {
    this.assertActive();
    return this.requireTexture(id);
  }

  public whenCriticalTexturesSettled(): Promise<RoomMaterialReadiness> {
    return this.criticalSettledPromise;
  }

  public whenAllTexturesSettled(): Promise<RoomMaterialReadiness> {
    return this.allSettledPromise;
  }

  public applyQuality(quality: RoomMaterialQuality): void {
    this.assertActive();
    if (typeof quality.normalMaps !== 'boolean') {
      throw new TypeError('normalMaps must be a boolean.');
    }
    if (
      !Number.isInteger(quality.anisotropy) ||
      quality.anisotropy < 1 ||
      quality.anisotropy > 16
    ) {
      throw new RangeError('anisotropy must be an integer between 1 and 16.');
    }

    this.qualityValue = Object.freeze({ ...quality });
    for (const texture of this.textures.values()) {
      texture.anisotropicFilteringLevel = quality.anisotropy;
    }
    const wallNormal = this.textureIsUsable('wallNormal')
      ? this.requireTexture('wallNormal')
      : null;
    const carpetNormal = this.textureIsUsable('carpetNormal')
      ? this.requireTexture('carpetNormal')
      : null;
    this.wall.bumpTexture = quality.normalMaps ? wallNormal : null;
    this.wallStained.bumpTexture = quality.normalMaps ? wallNormal : null;
    this.carpet.bumpTexture = quality.normalMaps ? carpetNormal : null;
    this.carpetWet.bumpTexture = quality.normalMaps ? carpetNormal : null;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    for (const status of this.textureStatuses.values()) {
      if (status.state === 'loading') {
        status.state = 'failed';
        status.error = 'Material library disposed before the texture settled.';
      }
    }
    if (this.textureRegistrationComplete) {
      this.publishReadiness();
    }
    this.disposed = true;
    for (const material of this.owned) {
      material.dispose(false, false);
    }
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();
    this.onReadinessChangedObservable.clear();
  }

  private createTexture(definition: TextureDefinition): void {
    const request: RoomTextureRequest = Object.freeze({
      id: definition.id,
      url: `${this.baseUrl}${definition.filename}`,
      critical: definition.critical,
      normalMap: definition.normalMap === true,
    });
    this.textureStatuses.set(definition.id, {
      request,
      state: 'loading',
      error: null,
    });
    const texture = this.textureFactory(
      request,
      this.scene,
      () => this.settleTexture(definition.id, 'ready'),
      (message, exception) =>
        this.settleTexture(definition.id, 'failed', textureErrorMessage(message, exception)),
    );
    texture.name = `level-zero.texture.${definition.id}`;
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = DEFAULT_QUALITY.anisotropy;
    texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
    if (definition.normalMap === true) {
      texture.gammaSpace = false;
      texture.level = definition.id === 'wallNormal' ? 0.13 : 0.18;
    }
    this.textures.set(definition.id, texture);
  }

  private settleTexture(id: RoomTextureId, state: 'ready' | 'failed', error?: string): void {
    if (this.disposed) {
      return;
    }
    const status = this.textureStatuses.get(id);
    if (status === undefined || status.state !== 'loading') {
      return;
    }
    status.state = state;
    status.error = state === 'failed' ? (error ?? 'Texture failed to load.') : null;
    if (state === 'failed') {
      if (this.materialsInitialized) {
        this.detachFailedTexture(id);
      } else {
        this.pendingFallbacks.add(id);
      }
    }
    if (this.textureRegistrationComplete) {
      this.publishReadiness();
    }
  }

  private publishReadiness(): void {
    const readiness = this.readiness;
    if (readiness.criticalSettled && !this.criticalPromiseResolved) {
      this.criticalPromiseResolved = true;
      this.resolveCriticalSettled(readiness);
    }
    if (readiness.allSettled && !this.allPromiseResolved) {
      this.allPromiseResolved = true;
      this.resolveAllSettled(readiness);
    }
    this.onReadinessChangedObservable.notifyObservers(readiness);
  }

  private detachFailedTexture(id: RoomTextureId): void {
    switch (id) {
      case 'wallPaper':
        this.wall.diffuseTexture = null;
        break;
      case 'wallStained':
        this.wallStained.diffuseTexture = null;
        break;
      case 'wallNormal':
        this.wall.bumpTexture = null;
        this.wallStained.bumpTexture = null;
        break;
      case 'carpet':
        this.carpet.diffuseTexture = null;
        break;
      case 'carpetWet':
        this.carpetWet.diffuseTexture = null;
        break;
      case 'carpetNormal':
        this.carpet.bumpTexture = null;
        this.carpetWet.bumpTexture = null;
        break;
      case 'ceilingTile':
        this.ceiling.diffuseTexture = null;
        break;
      case 'trim':
        this.trim.diffuseTexture = null;
        this.ceilingGrid.diffuseTexture = null;
        break;
      case 'fixtureHousing':
        this.fixtureHousing.diffuseTexture = null;
        break;
      case 'fixtureTube':
        this.fixtureEmitter.diffuseTexture = null;
        this.fixtureEmitter.emissiveTexture = null;
        break;
      case 'fixtureTubeOff':
        this.fixtureEmitterOff.diffuseTexture = null;
        break;
      case 'column':
        this.column.diffuseTexture = null;
        break;
    }
  }

  private textureIsUsable(id: RoomTextureId): boolean {
    return this.textureStatuses.get(id)?.state !== 'failed';
  }

  private requireTexture(id: RoomTextureId): Texture {
    const texture = this.textures.get(id);
    if (texture === undefined) {
      throw new Error(`Missing owned room texture ${id}.`);
    }
    return texture;
  }

  private create(id: string, diffuse: Color3, emissive: Color3): StandardMaterial {
    const material = new StandardMaterial(`level-zero.shared.${id}`, this.scene);
    material.diffuseColor.copyFrom(diffuse);
    material.emissiveColor.copyFrom(emissive);
    material.specularColor.set(0.025, 0.023, 0.014);
    material.specularPower = 8;
    material.roughness = 0.92;
    material.backFaceCulling = true;
    return material;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('RoomMaterialLibrary has been disposed.');
    }
  }
}
