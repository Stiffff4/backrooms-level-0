import {
  renderingConfig,
  renderQualityPresets,
  type QualityPresetName,
  type RenderQualityPreset,
} from '../config/rendering.config';

export function isQualityPresetName(value: unknown): value is QualityPresetName {
  return (
    value === 'low' ||
    value === 'default' ||
    value === 'high' ||
    value === 'hd720' ||
    value === 'hd1080'
  );
}

export function getQualityPreset(name: QualityPresetName): RenderQualityPreset {
  return renderQualityPresets[name];
}

/**
 * Pure quality-state holder. Applying fog, texture filtering or render size is
 * deliberately left to their owning systems.
 */
export class QualityManager {
  private selectedName: QualityPresetName;

  public constructor(initialPreset: QualityPresetName = renderingConfig.defaultQuality) {
    this.selectedName = initialPreset;
  }

  public get presetName(): QualityPresetName {
    return this.selectedName;
  }

  public get current(): RenderQualityPreset {
    return getQualityPreset(this.selectedName);
  }

  public setPreset(name: QualityPresetName): RenderQualityPreset {
    this.selectedName = name;
    return this.current;
  }
}
