import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Constants } from '@babylonjs/core/Engines/constants';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import type { PixelPostProcessSettings, PixelRenderAdapter } from './pixelRendering.types';
import type { PixelBufferMetrics } from './pixelRenderSizing';

const SHADER_NAME = 'thresholdPixelGrade';
const SHADER_STORE_KEY = `${SHADER_NAME}FragmentShader`;

export const PIXEL_GRADE_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 internalSize;
uniform float ditherStrength;
uniform float grainStrength;

float bayer4(vec2 pixel) {
  vec2 cell = mod(floor(pixel), 4.0);
  float x = cell.x;
  float y = cell.y;

  if (y < 1.0) {
    if (x < 1.0) return 0.0 / 16.0;
    if (x < 2.0) return 8.0 / 16.0;
    if (x < 3.0) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }
  if (y < 2.0) {
    if (x < 1.0) return 12.0 / 16.0;
    if (x < 2.0) return 4.0 / 16.0;
    if (x < 3.0) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }
  if (y < 3.0) {
    if (x < 1.0) return 3.0 / 16.0;
    if (x < 2.0) return 11.0 / 16.0;
    if (x < 3.0) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }
  if (x < 1.0) return 15.0 / 16.0;
  if (x < 2.0) return 7.0 / 16.0;
  if (x < 3.0) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

float spatialNoise(vec2 pixel) {
  return fract(sin(dot(floor(pixel), vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
  vec4 source = texture2D(textureSampler, vUV);
  vec3 color = source.rgb;

  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 0.94);
  color = color * vec3(1.025, 1.018, 0.955) + vec3(0.022, 0.023, 0.016);
  color = (color - 0.5) * 1.025 + 0.5;

  vec2 stablePixel = floor(vUV * max(internalSize, vec2(1.0)));
  float threshold = bayer4(stablePixel);
  vec3 quantized = floor(clamp(color, 0.0, 1.0) * 63.0 + threshold) / 63.0;
  color = mix(color, quantized, ditherStrength);

  float grain = spatialNoise(stablePixel) - 0.5;
  color += vec3(grain * grainStrength);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
}
`;

function registerShader(): void {
  if (ShaderStore.ShadersStore[SHADER_STORE_KEY] === undefined) {
    ShaderStore.ShadersStore[SHADER_STORE_KEY] = PIXEL_GRADE_FRAGMENT_SHADER;
  }
}

export class BabylonPixelRenderAdapter implements PixelRenderAdapter {
  private readonly postProcess: PostProcess;
  private attachedCamera: Camera | null = null;
  private metrics: PixelBufferMetrics | null = null;
  private settings: PixelPostProcessSettings = Object.freeze({
    dithering: true,
    ditherStrength: 0.35,
    grainStrength: 0.008,
  });
  private disposed = false;

  public constructor(private readonly engine: AbstractEngine) {
    registerShader();
    this.engine.setHardwareScalingLevel(1);
    this.postProcess = new PostProcess('threshold-pixel-grade', SHADER_NAME, {
      uniforms: ['internalSize', 'ditherStrength', 'grainStrength'],
      size: 1,
      camera: null,
      samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      engine,
      reusable: false,
    });
    this.postProcess.enablePixelPerfectMode = true;
    this.postProcess.autoClear = false;
    this.postProcess.samples = 1;
    this.postProcess.onApply = (effect): void => {
      effect.setFloat2(
        'internalSize',
        this.metrics?.bufferWidth ?? 1,
        this.metrics?.bufferHeight ?? 1,
      );
      effect.setFloat('ditherStrength', this.settings.dithering ? this.settings.ditherStrength : 0);
      effect.setFloat('grainStrength', this.settings.grainStrength);
    };
  }

  public setBufferSize(metrics: PixelBufferMetrics): void {
    this.assertActive();
    this.metrics = metrics;
    this.engine.setSize(metrics.bufferWidth, metrics.bufferHeight, true);
  }

  public setPostProcessSettings(settings: PixelPostProcessSettings): void {
    this.assertActive();
    this.settings = Object.freeze({ ...settings });
  }

  public attach(camera: Camera): void {
    this.assertActive();
    if (this.attachedCamera === camera) {
      return;
    }
    if (this.attachedCamera !== null) {
      this.attachedCamera.detachPostProcess(this.postProcess);
    }
    camera.attachPostProcess(this.postProcess);
    this.attachedCamera = camera;
  }

  public detach(camera: Camera): void {
    if (this.disposed || this.attachedCamera !== camera) {
      return;
    }
    camera.detachPostProcess(this.postProcess);
    this.attachedCamera = null;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    if (this.attachedCamera !== null) {
      this.attachedCamera.detachPostProcess(this.postProcess);
      this.attachedCamera = null;
    }
    this.postProcess.dispose();
    this.disposed = true;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('BabylonPixelRenderAdapter has been disposed.');
    }
  }
}
