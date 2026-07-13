export type QualityPreset = 'low' | 'default' | 'high';

export interface GameSettings {
  sensitivity: number;
  fov: number;
  headBob: boolean;
  invertY: boolean;
  masterVolume: number;
  ambienceVolume: number;
  footstepsVolume: number;
  quality: QualityPreset;
  reducedFlashing: boolean;
}

export type SettingsKey = keyof GameSettings;

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SettingsChange {
  previous: Readonly<GameSettings>;
  current: Readonly<GameSettings>;
  changedKeys: readonly SettingsKey[];
}

export type SettingsListener = (change: SettingsChange) => void;

export const SETTINGS_STORAGE_KEY = 'threshold.settings.v1';

export const SETTINGS_LIMITS = {
  sensitivity: { min: 0.1, max: 2, step: 0.05 },
  fov: { min: 65, max: 100, step: 1 },
  volume: { min: 0, max: 1, step: 0.05 },
} as const;

export const DEFAULT_SETTINGS: Readonly<GameSettings> = Object.freeze({
  sensitivity: 0.5,
  fov: 80,
  headBob: true,
  invertY: false,
  masterVolume: 0.8,
  ambienceVolume: 0.75,
  footstepsVolume: 0.8,
  quality: 'default',
  reducedFlashing: false,
});

const SETTINGS_VERSION = 1;

const SETTINGS_KEYS = [
  'sensitivity',
  'fov',
  'headBob',
  'invertY',
  'masterVolume',
  'ambienceVolume',
  'footstepsVolume',
  'quality',
  'reducedFlashing',
] as const satisfies readonly SettingsKey[];

interface PersistedSettings {
  version: typeof SETTINGS_VERSION;
  settings: GameSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function readNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, minimum, maximum)
    : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readQuality(value: unknown, fallback: QualityPreset): QualityPreset {
  return value === 'low' || value === 'default' || value === 'high' ? value : fallback;
}

function sanitizeSettings(value: unknown, fallback: Readonly<GameSettings>): GameSettings {
  const source = isRecord(value) ? value : {};

  return {
    sensitivity: readNumber(
      source.sensitivity,
      fallback.sensitivity,
      SETTINGS_LIMITS.sensitivity.min,
      SETTINGS_LIMITS.sensitivity.max,
    ),
    fov: readNumber(source.fov, fallback.fov, SETTINGS_LIMITS.fov.min, SETTINGS_LIMITS.fov.max),
    headBob: readBoolean(source.headBob, fallback.headBob),
    invertY: readBoolean(source.invertY, fallback.invertY),
    masterVolume: readNumber(
      source.masterVolume,
      fallback.masterVolume,
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
    ),
    ambienceVolume: readNumber(
      source.ambienceVolume,
      fallback.ambienceVolume,
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
    ),
    footstepsVolume: readNumber(
      source.footstepsVolume,
      fallback.footstepsVolume,
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
    ),
    quality: readQuality(source.quality, fallback.quality),
    reducedFlashing: readBoolean(source.reducedFlashing, fallback.reducedFlashing),
  };
}

function settingsFromPersistedValue(value: unknown): GameSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  if ('version' in value || 'settings' in value) {
    if (value.version !== SETTINGS_VERSION || !isRecord(value.settings)) {
      return { ...DEFAULT_SETTINGS };
    }

    return sanitizeSettings(value.settings, DEFAULT_SETTINGS);
  }

  // Accept the unversioned Phase 0 shape so early local builds migrate cleanly.
  return sanitizeSettings(value, DEFAULT_SETTINGS);
}

function browserStorage(): SettingsStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function copySettings(settings: Readonly<GameSettings>): GameSettings {
  return { ...settings };
}

function settingsAreEqual(left: Readonly<GameSettings>, right: Readonly<GameSettings>): boolean {
  return SETTINGS_KEYS.every((key) => left[key] === right[key]);
}

export class SettingsStore {
  private currentSettings: GameSettings;
  private readonly listeners = new Set<SettingsListener>();

  public constructor(private readonly storage: SettingsStorage | null = browserStorage()) {
    this.currentSettings = this.readPersistedSettings();
  }

  public get value(): Readonly<GameSettings> {
    return copySettings(this.currentSettings);
  }

  public getSnapshot(): Readonly<GameSettings> {
    return copySettings(this.currentSettings);
  }

  public set<K extends SettingsKey>(key: K, value: GameSettings[K]): Readonly<GameSettings> {
    return this.update({ [key]: value } as Pick<GameSettings, K>);
  }

  public update(patch: Partial<GameSettings>): Readonly<GameSettings> {
    const previous = copySettings(this.currentSettings);
    const next = sanitizeSettings({ ...this.currentSettings, ...patch }, this.currentSettings);

    if (settingsAreEqual(previous, next)) {
      return copySettings(this.currentSettings);
    }

    const changedKeys = SETTINGS_KEYS.filter((key) => previous[key] !== next[key]);
    this.currentSettings = next;
    this.persist();
    this.notify(previous, changedKeys);

    return copySettings(this.currentSettings);
  }

  public reset(): Readonly<GameSettings> {
    return this.replace(DEFAULT_SETTINGS);
  }

  public reload(): Readonly<GameSettings> {
    return this.replace(this.readPersistedSettings(), false);
  }

  public subscribe(listener: SettingsListener, emitCurrent = false): () => void {
    this.listeners.add(listener);

    if (emitCurrent) {
      const current = copySettings(this.currentSettings);
      listener({ previous: current, current: copySettings(current), changedKeys: [] });
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private replace(settings: Readonly<GameSettings>, persist = true): Readonly<GameSettings> {
    const previous = copySettings(this.currentSettings);
    const next = sanitizeSettings(settings, DEFAULT_SETTINGS);

    if (settingsAreEqual(previous, next)) {
      return copySettings(this.currentSettings);
    }

    const changedKeys = SETTINGS_KEYS.filter((key) => previous[key] !== next[key]);
    this.currentSettings = next;

    if (persist) {
      this.persist();
    }

    this.notify(previous, changedKeys);
    return copySettings(this.currentSettings);
  }

  private readPersistedSettings(): GameSettings {
    if (!this.storage) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (stored === null) {
        return { ...DEFAULT_SETTINGS };
      }

      return settingsFromPersistedValue(JSON.parse(stored) as unknown);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }

    const payload: PersistedSettings = {
      version: SETTINGS_VERSION,
      settings: copySettings(this.currentSettings),
    };

    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage can be denied or full. Runtime settings remain usable in memory.
    }
  }

  private notify(previous: Readonly<GameSettings>, changedKeys: readonly SettingsKey[]): void {
    const current = copySettings(this.currentSettings);

    for (const listener of this.listeners) {
      listener({
        previous: copySettings(previous),
        current: copySettings(current),
        changedKeys: [...changedKeys],
      });
    }
  }
}
