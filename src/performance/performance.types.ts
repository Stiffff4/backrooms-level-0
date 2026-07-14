export interface RuntimePerformanceSample {
  readonly frameTimeMs: number;
  readonly drawCalls: number;
  readonly visibleTriangles: number;
  readonly activeMeshes: number;
  readonly activeRooms: number;
  readonly dynamicLights: number;
  readonly audioNodes: number;
  readonly usedHeapBytes?: number;
}

export interface NumericWindowSummary {
  readonly latest: number;
  readonly average: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export interface CounterWindowSummary {
  readonly latest: number;
  readonly maximum: number;
}

export interface HeapWindowSummary {
  readonly sampleCount: number;
  readonly firstWindowMedianBytes: number;
  readonly lastWindowMedianBytes: number;
  readonly growthBytes: number;
  readonly growthRatio: number;
  readonly peakBytes: number;
}

export interface RuntimePerformanceSnapshot {
  readonly sampleCount: number;
  readonly capacity: number;
  readonly windowDurationMs: number;
  readonly estimatedFramesPerSecond: number;
  readonly frameTime: NumericWindowSummary;
  readonly drawCalls: CounterWindowSummary;
  readonly visibleTriangles: CounterWindowSummary;
  readonly activeMeshes: CounterWindowSummary;
  readonly activeRooms: CounterWindowSummary;
  readonly dynamicLights: CounterWindowSummary;
  readonly audioNodes: CounterWindowSummary;
  readonly heap: HeapWindowSummary | null;
}

export type PerformanceFindingSeverity = 'warning' | 'error';

export interface PerformanceBudgetFinding {
  readonly metric: string;
  readonly severity: PerformanceFindingSeverity;
  readonly observed: number;
  readonly budget: number;
  readonly message: string;
}

export type RuntimePerformanceStatus = 'insufficient-data' | 'pass' | 'warning' | 'fail';

export interface RuntimePerformanceEvaluation {
  readonly status: RuntimePerformanceStatus;
  readonly sampleCount: number;
  readonly minimumRequiredSamples: number;
  readonly findings: readonly PerformanceBudgetFinding[];
}
