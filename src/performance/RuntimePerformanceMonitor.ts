import { performanceConfig, type RuntimePerformanceBudgets } from './performance.config';
import type {
  CounterWindowSummary,
  HeapWindowSummary,
  NumericWindowSummary,
  PerformanceBudgetFinding,
  RuntimePerformanceEvaluation,
  RuntimePerformanceSample,
  RuntimePerformanceSnapshot,
} from './performance.types';

const METRIC_COUNT = 8;
const FRAME_TIME = 0;
const DRAW_CALLS = 1;
const VISIBLE_TRIANGLES = 2;
const ACTIVE_MESHES = 3;
const ACTIVE_ROOMS = 4;
const DYNAMIC_LIGHTS = 5;
const AUDIO_NODES = 6;
const USED_HEAP = 7;

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
}

function percentile(sorted: Float64Array, ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const position = (sorted.length - 1) * ratio;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return lower + (upper - lower) * (position - lowerIndex);
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = Float64Array.from(values).sort();
  return percentile(sorted, 0.5);
}

function summarizeValues(values: Float64Array): NumericWindowSummary {
  if (values.length === 0) {
    return {
      latest: 0,
      average: 0,
      minimum: 0,
      maximum: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  let sum = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = 0;
  for (const value of values) {
    sum += value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const sorted = values.slice().sort();
  return {
    latest: values[values.length - 1] ?? 0,
    average: sum / values.length,
    minimum,
    maximum,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}

function createFinding(
  metric: string,
  severity: PerformanceBudgetFinding['severity'],
  observed: number,
  budget: number,
  message: string,
): PerformanceBudgetFinding {
  return Object.freeze({ metric, severity, observed, budget, message });
}

/**
 * Allocation-free recording path for frame metrics. Snapshotting is explicit
 * and may allocate because it is intended for periodic debug/QA reporting, not
 * for the render loop itself.
 */
export class RuntimePerformanceMonitor {
  private readonly samples: readonly Float64Array[];
  private writeIndex = 0;
  private sampleCountValue = 0;

  public constructor(
    public readonly capacity = performanceConfig.monitor.sampleCapacity,
    private readonly minimumEvaluationSamples = performanceConfig.monitor.minimumEvaluationSamples,
  ) {
    assertPositiveInteger(capacity, 'capacity');
    assertPositiveInteger(minimumEvaluationSamples, 'minimumEvaluationSamples');
    if (minimumEvaluationSamples > capacity) {
      throw new RangeError('minimumEvaluationSamples cannot exceed capacity.');
    }
    this.samples = Array.from({ length: METRIC_COUNT }, () => new Float64Array(capacity));
    this.samples[USED_HEAP]?.fill(Number.NaN);
  }

  public get sampleCount(): number {
    return this.sampleCountValue;
  }

  public record(sample: RuntimePerformanceSample): void {
    this.recordFrame(
      sample.frameTimeMs,
      sample.drawCalls,
      sample.visibleTriangles,
      sample.activeMeshes,
      sample.activeRooms,
      sample.dynamicLights,
      sample.audioNodes,
      sample.usedHeapBytes,
    );
  }

  public recordFrame(
    frameTimeMs: number,
    drawCalls: number,
    visibleTriangles: number,
    activeMeshes: number,
    activeRooms: number,
    dynamicLights: number,
    audioNodes: number,
    usedHeapBytes?: number,
  ): void {
    assertFiniteNonNegative(frameTimeMs, 'frameTimeMs');
    assertFiniteNonNegative(drawCalls, 'drawCalls');
    assertFiniteNonNegative(visibleTriangles, 'visibleTriangles');
    assertFiniteNonNegative(activeMeshes, 'activeMeshes');
    assertFiniteNonNegative(activeRooms, 'activeRooms');
    assertFiniteNonNegative(dynamicLights, 'dynamicLights');
    assertFiniteNonNegative(audioNodes, 'audioNodes');
    if (usedHeapBytes !== undefined) {
      assertFiniteNonNegative(usedHeapBytes, 'usedHeapBytes');
    }

    const index = this.writeIndex;
    this.writeMetric(FRAME_TIME, index, frameTimeMs);
    this.writeMetric(DRAW_CALLS, index, drawCalls);
    this.writeMetric(VISIBLE_TRIANGLES, index, visibleTriangles);
    this.writeMetric(ACTIVE_MESHES, index, activeMeshes);
    this.writeMetric(ACTIVE_ROOMS, index, activeRooms);
    this.writeMetric(DYNAMIC_LIGHTS, index, dynamicLights);
    this.writeMetric(AUDIO_NODES, index, audioNodes);
    this.writeMetric(USED_HEAP, index, usedHeapBytes ?? Number.NaN);

    this.writeIndex = (index + 1) % this.capacity;
    this.sampleCountValue = Math.min(this.sampleCountValue + 1, this.capacity);
  }

  public reset(): void {
    for (const samples of this.samples) {
      samples.fill(0);
    }
    this.samples[USED_HEAP]?.fill(Number.NaN);
    this.writeIndex = 0;
    this.sampleCountValue = 0;
  }

  public snapshot(): RuntimePerformanceSnapshot {
    const frameTimes = this.copyChronological(FRAME_TIME);
    const frameTime = summarizeValues(frameTimes);
    return Object.freeze({
      sampleCount: this.sampleCountValue,
      capacity: this.capacity,
      windowDurationMs: frameTimes.reduce((total, value) => total + value, 0),
      estimatedFramesPerSecond: frameTime.average > 0 ? 1_000 / frameTime.average : 0,
      frameTime,
      drawCalls: this.summarizeCounter(DRAW_CALLS),
      visibleTriangles: this.summarizeCounter(VISIBLE_TRIANGLES),
      activeMeshes: this.summarizeCounter(ACTIVE_MESHES),
      activeRooms: this.summarizeCounter(ACTIVE_ROOMS),
      dynamicLights: this.summarizeCounter(DYNAMIC_LIGHTS),
      audioNodes: this.summarizeCounter(AUDIO_NODES),
      heap: this.summarizeHeap(),
    });
  }

  public evaluate(
    snapshot = this.snapshot(),
    budgets: RuntimePerformanceBudgets = performanceConfig.runtime,
  ): RuntimePerformanceEvaluation {
    if (snapshot.sampleCount < this.minimumEvaluationSamples) {
      return Object.freeze({
        status: 'insufficient-data',
        sampleCount: snapshot.sampleCount,
        minimumRequiredSamples: this.minimumEvaluationSamples,
        findings: Object.freeze([]),
      });
    }

    const findings: PerformanceBudgetFinding[] = [];
    if (snapshot.frameTime.average > budgets.targetFrameTimeMs) {
      findings.push(
        createFinding(
          'frame-time-average',
          'warning',
          snapshot.frameTime.average,
          budgets.targetFrameTimeMs,
          `Average frame time misses the ${budgets.targetFramesPerSecond} FPS target.`,
        ),
      );
    }
    if (snapshot.frameTime.p95 > budgets.maximumP95FrameTimeMs) {
      findings.push(
        createFinding(
          'frame-time-p95',
          'error',
          snapshot.frameTime.p95,
          budgets.maximumP95FrameTimeMs,
          '95th-percentile frame time exceeds the production ceiling.',
        ),
      );
    }
    if (snapshot.drawCalls.maximum > budgets.idealDrawCalls) {
      findings.push(
        createFinding(
          'draw-calls-ideal',
          'warning',
          snapshot.drawCalls.maximum,
          budgets.idealDrawCalls,
          'Peak draw calls exceed the ideal default-preset budget.',
        ),
      );
    }
    this.pushMaximumFinding(
      findings,
      'draw-calls-maximum',
      snapshot.drawCalls.maximum,
      budgets.maximumDrawCalls,
      'Peak draw calls exceed the habitual maximum.',
    );
    this.pushMaximumFinding(
      findings,
      'visible-triangles',
      snapshot.visibleTriangles.maximum,
      budgets.maximumVisibleTriangles,
      'Visible triangles exceed the Level 0 render budget.',
    );
    this.pushMaximumFinding(
      findings,
      'active-meshes',
      snapshot.activeMeshes.maximum,
      budgets.maximumActiveMeshes,
      'Active meshes exceed the profiled safety ceiling.',
    );
    this.pushMaximumFinding(
      findings,
      'active-rooms',
      snapshot.activeRooms.maximum,
      budgets.maximumActiveRooms,
      'Active room geometry exceeds the streaming budget.',
    );
    this.pushMaximumFinding(
      findings,
      'dynamic-lights',
      snapshot.dynamicLights.maximum,
      budgets.maximumDynamicLights,
      'Dynamic lights exceed the pooled-light budget.',
    );
    this.pushMaximumFinding(
      findings,
      'audio-nodes',
      snapshot.audioNodes.maximum,
      budgets.maximumAudioNodes,
      'Audio node count is no longer bounded to the production voice budget.',
    );

    const heap = snapshot.heap;
    if (
      heap !== null &&
      snapshot.windowDurationMs >= budgets.minimumHeapWindowMs &&
      heap.growthBytes > budgets.heapGrowthWarningBytes &&
      heap.growthRatio > budgets.heapGrowthWarningRatio
    ) {
      findings.push(
        createFinding(
          'heap-growth',
          'warning',
          heap.growthBytes,
          budgets.heapGrowthWarningBytes,
          'Sustained heap growth needs a longer leak investigation before release.',
        ),
      );
    }

    const status = findings.some((finding) => finding.severity === 'error')
      ? 'fail'
      : findings.length > 0
        ? 'warning'
        : 'pass';
    return Object.freeze({
      status,
      sampleCount: snapshot.sampleCount,
      minimumRequiredSamples: this.minimumEvaluationSamples,
      findings: Object.freeze(findings),
    });
  }

  private copyChronological(metricIndex: number): Float64Array {
    const result = new Float64Array(this.sampleCountValue);
    const source = this.samples[metricIndex];
    if (source === undefined) {
      return result;
    }
    const firstIndex = (this.writeIndex - this.sampleCountValue + this.capacity) % this.capacity;
    for (let offset = 0; offset < this.sampleCountValue; offset += 1) {
      result[offset] = source[(firstIndex + offset) % this.capacity] ?? 0;
    }
    return result;
  }

  private writeMetric(metricIndex: number, sampleIndex: number, value: number): void {
    const metricSamples = this.samples[metricIndex];
    if (metricSamples === undefined) {
      throw new Error(`Unknown runtime performance metric: ${metricIndex}.`);
    }
    metricSamples[sampleIndex] = value;
  }

  private summarizeCounter(metricIndex: number): CounterWindowSummary {
    const values = this.copyChronological(metricIndex);
    let maximum = 0;
    for (const value of values) {
      maximum = Math.max(maximum, value);
    }
    return Object.freeze({
      latest: values[values.length - 1] ?? 0,
      maximum,
    });
  }

  private summarizeHeap(): HeapWindowSummary | null {
    const values = [...this.copyChronological(USED_HEAP)].filter(Number.isFinite);
    if (values.length < 2) {
      return null;
    }
    const comparisonSize = Math.max(1, Math.floor(values.length * 0.2));
    const firstWindowMedianBytes = median(values.slice(0, comparisonSize));
    const lastWindowMedianBytes = median(values.slice(-comparisonSize));
    const growthBytes = lastWindowMedianBytes - firstWindowMedianBytes;
    let peakBytes = 0;
    for (const value of values) {
      peakBytes = Math.max(peakBytes, value);
    }
    return Object.freeze({
      sampleCount: values.length,
      firstWindowMedianBytes,
      lastWindowMedianBytes,
      growthBytes,
      growthRatio: firstWindowMedianBytes > 0 ? growthBytes / firstWindowMedianBytes : 0,
      peakBytes,
    });
  }

  private pushMaximumFinding(
    findings: PerformanceBudgetFinding[],
    metric: string,
    observed: number,
    budget: number,
    message: string,
  ): void {
    if (observed <= budget) {
      return;
    }
    findings.push(createFinding(metric, 'error', observed, budget, message));
  }
}
