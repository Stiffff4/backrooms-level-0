import budgetValues from './performance-budgets.json';

export interface RuntimePerformanceBudgets {
  readonly targetFramesPerSecond: number;
  readonly targetFrameTimeMs: number;
  readonly maximumP95FrameTimeMs: number;
  readonly idealDrawCalls: number;
  readonly maximumDrawCalls: number;
  readonly maximumVisibleTriangles: number;
  readonly maximumActiveMeshes: number;
  readonly maximumActiveRooms: number;
  readonly maximumDynamicLights: number;
  readonly maximumAudioNodes: number;
  readonly heapGrowthWarningBytes: number;
  readonly heapGrowthWarningRatio: number;
  readonly minimumHeapWindowMs: number;
}

export interface BuildPerformanceBudgets {
  readonly maximumInitialTransferBytes: number;
  readonly maximumTotalTransferBytes: number;
  readonly maximumDecodedAssetBytes: number;
  readonly maximumEntryJavaScriptBytes: number;
  readonly maximumEntryJavaScriptGzipBytes: number;
  readonly maximumTotalJavaScriptBytes: number;
  readonly warningRatio: number;
}

export interface PerformanceMonitorConfig {
  readonly sampleCapacity: number;
  readonly minimumEvaluationSamples: number;
}

export interface PerformanceConfig {
  readonly runtime: RuntimePerformanceBudgets;
  readonly build: BuildPerformanceBudgets;
  readonly monitor: PerformanceMonitorConfig;
}

function freezeBudgets<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

/**
 * Production budgets derived from MASTER_PLAN.md section 19. The additional
 * JavaScript ceilings protect the small static boot path while remaining below
 * the plan's 30 MiB initial-download ceiling.
 */
export const performanceConfig: PerformanceConfig = Object.freeze({
  runtime: freezeBudgets(budgetValues.runtime),
  build: freezeBudgets(budgetValues.build),
  monitor: freezeBudgets(budgetValues.monitor),
});
