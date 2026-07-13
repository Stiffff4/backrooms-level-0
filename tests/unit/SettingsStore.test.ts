import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  SettingsStore,
  type GameSettings,
  type SettingsStorage,
} from '../../src/ui/SettingsStore';

class MemoryStorage implements SettingsStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('SettingsStore', () => {
  it('usa valores accesibles y jugables por defecto sin requerir localStorage', () => {
    const store = new SettingsStore(null);

    expect(store.value).toEqual(DEFAULT_SETTINGS);
    expect(store.value).not.toBe(DEFAULT_SETTINGS);
  });

  it('persiste y restaura todos los ajustes con un payload versionado', () => {
    const storage = new MemoryStorage();
    const expected: GameSettings = {
      sensitivity: 1.25,
      fov: 96,
      headBob: false,
      invertY: true,
      masterVolume: 0.55,
      ambienceVolume: 0.4,
      footstepsVolume: 0.9,
      quality: 'high',
      dithering: false,
      reducedFlashing: true,
    };

    const store = new SettingsStore(storage);
    store.update(expected);

    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      settings: expected,
    });
    expect(new SettingsStore(storage).value).toEqual(expected);
  });

  it('migra el formato temprano sin versión', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        fov: 91,
        sensitivity: 0.85,
      }),
    );

    expect(new SettingsStore(storage).value).toMatchObject({ fov: 91, sensitivity: 0.85 });
  });

  it('valida tipos y limita números procedentes de almacenamiento', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: {
          sensitivity: -4,
          fov: 300,
          headBob: 'sí',
          invertY: true,
          masterVolume: 8,
          ambienceVolume: -2,
          footstepsVolume: 0.35,
          quality: 'ultra',
          reducedFlashing: true,
        },
      }),
    );

    expect(new SettingsStore(storage).value).toEqual({
      sensitivity: 0.1,
      fov: 100,
      headBob: DEFAULT_SETTINGS.headBob,
      invertY: true,
      masterVolume: 1,
      ambienceVolume: 0,
      footstepsVolume: 0.35,
      quality: DEFAULT_SETTINGS.quality,
      dithering: DEFAULT_SETTINGS.dithering,
      reducedFlashing: true,
    });
  });

  it('recupera defaults ante JSON corrupto o una versión desconocida', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, '{sin-json');
    expect(new SettingsStore(storage).value).toEqual(DEFAULT_SETTINGS);

    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 999, settings: { fov: 90 } }));
    expect(new SettingsStore(storage).value).toEqual(DEFAULT_SETTINGS);
  });

  it('mantiene ajustes en memoria cuando leer o escribir storage falla', () => {
    const unavailableStorage: SettingsStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };

    const store = new SettingsStore(unavailableStorage);

    expect(store.value).toEqual(DEFAULT_SETTINGS);
    expect(() => store.set('fov', 92)).not.toThrow();
    expect(store.value.fov).toBe(92);
  });

  it('notifica cambios efectivos con claves tipadas y permite desuscribirse', () => {
    const store = new SettingsStore(null);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set('fov', 88);
    store.set('fov', 88);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({
      previous: { ...DEFAULT_SETTINGS },
      current: { ...DEFAULT_SETTINGS, fov: 88 },
      changedKeys: ['fov'],
    });

    unsubscribe();
    store.set('invertY', true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('restablece defaults y los persiste', () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    store.update({ fov: 95, quality: 'low', reducedFlashing: true });

    expect(store.reset()).toEqual(DEFAULT_SETTINGS);
    expect(new SettingsStore(storage).value).toEqual(DEFAULT_SETTINGS);
  });
});
