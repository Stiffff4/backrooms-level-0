import { describe, expect, it } from 'vitest';
import { renderQualityPresets, type QualityPresetName } from '../../src/config/rendering.config';
import {
  getQualityPreset,
  isQualityPresetName,
  QualityManager,
} from '../../src/rendering/QualityManager';

describe('QualityManager', () => {
  it('expone los tres presets completos e inmutables', () => {
    expect(renderQualityPresets.low).toEqual({
      name: 'low',
      internalHeight: 240,
      fogEnd: 36,
      dithering: false,
      grainStrength: 0,
      anisotropy: 1,
      normalMaps: false,
      lightBudget: 4,
    });
    expect(renderQualityPresets.default).toEqual({
      name: 'default',
      internalHeight: 360,
      fogEnd: 44,
      dithering: true,
      grainStrength: 0.008,
      anisotropy: 2,
      normalMaps: true,
      lightBudget: 6,
    });
    expect(renderQualityPresets.high).toEqual({
      name: 'high',
      internalHeight: 480,
      fogEnd: 48,
      dithering: true,
      grainStrength: 0.006,
      anisotropy: 4,
      normalMaps: true,
      lightBudget: 8,
    });
    expect(Object.isFrozen(renderQualityPresets)).toBe(true);
    expect(Object.isFrozen(renderQualityPresets.default)).toBe(true);
  });

  it('mantiene estado puro y devuelve el preset seleccionado', () => {
    const manager = new QualityManager();
    expect(manager.presetName).toBe('default');
    expect(manager.current).toBe(renderQualityPresets.default);

    expect(manager.setPreset('low')).toBe(renderQualityPresets.low);
    expect(manager.presetName).toBe('low');
    expect(manager.current).toBe(renderQualityPresets.low);

    expect(manager.setPreset('high')).toBe(renderQualityPresets.high);
    expect(getQualityPreset('high')).toBe(manager.current);
  });

  it('valida nombres procedentes de settings persistidos', () => {
    const candidates: unknown[] = ['low', 'default', 'high', 'ultra', 360, null];
    const valid = candidates.filter(isQualityPresetName);
    expect(valid).toEqual<QualityPresetName[]>(['low', 'default', 'high']);
  });
});
