import { describe, expect, it } from 'vitest';

import { performanceConfig } from '../../src/performance/performance.config';
import { RuntimePerformanceMonitor } from '../../src/performance/RuntimePerformanceMonitor';

function recordHealthyFrame(
  monitor: RuntimePerformanceMonitor,
  frameTimeMs = 16,
  usedHeapBytes?: number,
): void {
  monitor.recordFrame(frameTimeMs, 120, 180_000, 300, 42, 6, 40, usedHeapBytes);
}

describe('RuntimePerformanceMonitor', () => {
  it('publishes immutable budgets derived from the production plan', () => {
    expect(performanceConfig.runtime).toMatchObject({
      targetFramesPerSecond: 60,
      idealDrawCalls: 150,
      maximumDrawCalls: 250,
      maximumVisibleTriangles: 250_000,
      maximumActiveMeshes: 400,
      maximumActiveRooms: 60,
      maximumDynamicLights: 8,
      maximumAudioNodes: 80,
    });
    expect(performanceConfig.build.maximumInitialTransferBytes).toBe(30 * 1_024 * 1_024);
    expect(performanceConfig.build.maximumTotalTransferBytes).toBe(80 * 1_024 * 1_024);
    expect(performanceConfig.build.maximumDecodedAssetBytes).toBe(250 * 1_024 * 1_024);
    expect(Object.isFrozen(performanceConfig)).toBe(true);
    expect(Object.isFrozen(performanceConfig.runtime)).toBe(true);
  });

  it('validates bounded ring settings and frame metrics', () => {
    expect(() => new RuntimePerformanceMonitor(0)).toThrow(/positive integer/i);
    expect(() => new RuntimePerformanceMonitor(10, 11)).toThrow(/cannot exceed/i);

    const monitor = new RuntimePerformanceMonitor(4, 2);
    expect(() => monitor.recordFrame(Number.NaN, 1, 1, 1, 1, 1, 1)).toThrow(/frameTimeMs/i);
    expect(() => monitor.recordFrame(16, -1, 1, 1, 1, 1, 1)).toThrow(/drawCalls/i);
  });

  it('keeps only the newest fixed-capacity window in chronological order', () => {
    const monitor = new RuntimePerformanceMonitor(4, 2);
    for (const frameTime of [10, 20, 30, 40, 50]) {
      monitor.recordFrame(frameTime, frameTime, 1, 1, 1, 1, 1);
    }

    const snapshot = monitor.snapshot();
    expect(snapshot.sampleCount).toBe(4);
    expect(snapshot.capacity).toBe(4);
    expect(snapshot.windowDurationMs).toBe(140);
    expect(snapshot.frameTime.latest).toBe(50);
    expect(snapshot.frameTime.minimum).toBe(20);
    expect(snapshot.frameTime.maximum).toBe(50);
    expect(snapshot.frameTime.average).toBe(35);
    expect(snapshot.frameTime.p50).toBe(35);
    expect(snapshot.drawCalls).toEqual({ latest: 50, maximum: 50 });
  });

  it('requires a meaningful sample window before evaluating', () => {
    const monitor = new RuntimePerformanceMonitor(120, 120);
    recordHealthyFrame(monitor);

    expect(monitor.evaluate()).toEqual({
      status: 'insufficient-data',
      sampleCount: 1,
      minimumRequiredSamples: 120,
      findings: [],
    });
  });

  it('passes a stable default-preset window and warns before a hard ceiling', () => {
    const healthy = new RuntimePerformanceMonitor(120, 120);
    for (let index = 0; index < 120; index += 1) {
      recordHealthyFrame(healthy);
    }
    expect(healthy.evaluate()).toMatchObject({ status: 'pass', findings: [] });
    expect(healthy.snapshot().estimatedFramesPerSecond).toBeCloseTo(62.5);

    const warning = new RuntimePerformanceMonitor(120, 120);
    for (let index = 0; index < 120; index += 1) {
      warning.recordFrame(17, 170, 180_000, 300, 42, 6, 40);
    }
    const warningEvaluation = warning.evaluate();
    expect(warningEvaluation.status).toBe('warning');
    expect(warningEvaluation.findings.map((finding) => finding.metric)).toEqual([
      'frame-time-average',
      'draw-calls-ideal',
    ]);
  });

  it('fails hard render, streaming, lighting and audio budget regressions', () => {
    const monitor = new RuntimePerformanceMonitor(120, 120);
    for (let index = 0; index < 120; index += 1) {
      monitor.recordFrame(21, 251, 250_001, 401, 61, 9, 81);
    }

    const evaluation = monitor.evaluate();
    expect(evaluation.status).toBe('fail');
    expect(evaluation.findings.filter((finding) => finding.severity === 'error')).toHaveLength(7);
    expect(evaluation.findings.map((finding) => finding.metric)).toEqual(
      expect.arrayContaining([
        'frame-time-p95',
        'draw-calls-maximum',
        'visible-triangles',
        'active-meshes',
        'active-rooms',
        'dynamic-lights',
        'audio-nodes',
      ]),
    );
  });

  it('uses robust edge-window medians to flag sustained heap growth', () => {
    const monitor = new RuntimePerformanceMonitor(120, 120);
    const mebibyte = 1_024 * 1_024;
    for (let index = 0; index < 120; index += 1) {
      const heap = index < 24 ? 100 * mebibyte : index >= 96 ? 150 * mebibyte : 112 * mebibyte;
      monitor.recordFrame(500, 120, 180_000, 300, 42, 6, 40, heap);
    }

    const snapshot = monitor.snapshot();
    expect(snapshot.heap).toMatchObject({
      sampleCount: 120,
      firstWindowMedianBytes: 100 * mebibyte,
      lastWindowMedianBytes: 150 * mebibyte,
      growthBytes: 50 * mebibyte,
    });
    expect(snapshot.heap?.growthRatio).toBeCloseTo(0.5);
    const evaluation = monitor.evaluate(snapshot, {
      ...performanceConfig.runtime,
      targetFrameTimeMs: 1_000,
      maximumP95FrameTimeMs: 1_000,
    });
    expect(evaluation.status).toBe('warning');
    expect(evaluation.findings).toEqual([
      expect.objectContaining({ metric: 'heap-growth', severity: 'warning' }),
    ]);
  });

  it('resets every ring without retaining a previous session', () => {
    const monitor = new RuntimePerformanceMonitor(4, 2);
    recordHealthyFrame(monitor, 16, 10_000);
    monitor.reset();

    expect(monitor.sampleCount).toBe(0);
    expect(monitor.snapshot()).toMatchObject({
      sampleCount: 0,
      windowDurationMs: 0,
      estimatedFramesPerSecond: 0,
      heap: null,
    });
  });
});
