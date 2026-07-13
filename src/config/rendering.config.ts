export type QualityPresetName = 'low' | 'default' | 'high';

export type InternalRenderHeight = 240 | 360 | 480;

export interface RenderQualityPreset {
  readonly name: QualityPresetName;
  readonly internalHeight: InternalRenderHeight;
  readonly fogEnd: 36 | 44 | 48;
  readonly dithering: boolean;
  readonly grainStrength: number;
  readonly anisotropy: 1 | 2 | 4;
  readonly normalMaps: boolean;
  /** Reserved for the proxied-light allocator introduced by the lighting phase. */
  readonly futureLightBudget: 4 | 6 | 8;
}

const low = Object.freeze({
  name: 'low',
  internalHeight: 240,
  fogEnd: 36,
  dithering: false,
  grainStrength: 0,
  anisotropy: 1,
  normalMaps: false,
  futureLightBudget: 4,
} satisfies RenderQualityPreset);

const defaultPreset = Object.freeze({
  name: 'default',
  internalHeight: 360,
  fogEnd: 44,
  dithering: true,
  grainStrength: 0.008,
  anisotropy: 2,
  normalMaps: true,
  futureLightBudget: 6,
} satisfies RenderQualityPreset);

const high = Object.freeze({
  name: 'high',
  internalHeight: 480,
  fogEnd: 48,
  dithering: true,
  grainStrength: 0.006,
  anisotropy: 4,
  normalMaps: true,
  futureLightBudget: 8,
} satisfies RenderQualityPreset);

export const renderQualityPresets: Readonly<Record<QualityPresetName, RenderQualityPreset>> =
  Object.freeze({
    low,
    default: defaultPreset,
    high,
  });

export const renderingConfig = Object.freeze({
  defaultQuality: 'default' as const,
  ditherStrength: 0.35,
  colorGradePreset: 'threshold' as const,
  cssMetricPrefix: 'pixel' as const,
});
