export type QualityPresetName = 'low' | 'default' | 'high' | 'hd720' | 'hd1080';

export type InternalRenderHeight = 240 | 360 | 480 | 720 | 1080;

export interface RenderQualityPreset {
  readonly name: QualityPresetName;
  readonly internalHeight: InternalRenderHeight;
  readonly fogEnd: 36 | 44 | 48 | 52 | 56;
  readonly dithering: boolean;
  readonly grainStrength: number;
  readonly anisotropy: 1 | 2 | 4 | 8 | 16;
  readonly normalMaps: boolean;
  readonly lightBudget: 4 | 6 | 8;
}

const low = Object.freeze({
  name: 'low',
  internalHeight: 240,
  fogEnd: 36,
  dithering: false,
  grainStrength: 0,
  anisotropy: 1,
  normalMaps: false,
  lightBudget: 4,
} satisfies RenderQualityPreset);

const defaultPreset = Object.freeze({
  name: 'default',
  internalHeight: 360,
  fogEnd: 44,
  dithering: true,
  grainStrength: 0.008,
  anisotropy: 2,
  normalMaps: true,
  lightBudget: 6,
} satisfies RenderQualityPreset);

const high = Object.freeze({
  name: 'high',
  internalHeight: 480,
  fogEnd: 48,
  dithering: true,
  grainStrength: 0.006,
  anisotropy: 4,
  normalMaps: true,
  lightBudget: 8,
} satisfies RenderQualityPreset);

const hd720 = Object.freeze({
  name: 'hd720',
  internalHeight: 720,
  fogEnd: 52,
  dithering: true,
  grainStrength: 0.005,
  anisotropy: 8,
  normalMaps: true,
  lightBudget: 8,
} satisfies RenderQualityPreset);

const hd1080 = Object.freeze({
  name: 'hd1080',
  internalHeight: 1080,
  fogEnd: 56,
  dithering: true,
  grainStrength: 0.004,
  anisotropy: 16,
  normalMaps: true,
  lightBudget: 8,
} satisfies RenderQualityPreset);

export const renderQualityPresets: Readonly<Record<QualityPresetName, RenderQualityPreset>> =
  Object.freeze({
    low,
    default: defaultPreset,
    high,
    hd720,
    hd1080,
  });

export const renderingConfig = Object.freeze({
  defaultQuality: 'default' as const,
  ditherStrength: 0.35,
  colorGradePreset: 'threshold' as const,
  cssMetricPrefix: 'pixel' as const,
});
