export interface BrowserMemoryMeasurement {
  readonly source: 'user-agent-specific' | 'chromium-heap';
  readonly bytes: number;
}

interface UserAgentMemoryResult {
  readonly bytes: number;
}

interface BrowserPerformanceWithMemory extends Performance {
  readonly memory?: {
    readonly usedJSHeapSize?: number;
  };
  readonly measureUserAgentSpecificMemory?: () => Promise<UserAgentMemoryResult>;
}

function validByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Reads memory only when the browser exposes a supported measurement API.
 * The asynchronous API needs a cross-origin-isolated document in Chromium;
 * the legacy heap counter remains a useful local profiling fallback.
 */
export async function measureBrowserMemory(
  performanceObject: Performance = performance,
): Promise<BrowserMemoryMeasurement | null> {
  const capable = performanceObject as BrowserPerformanceWithMemory;
  if (capable.measureUserAgentSpecificMemory !== undefined) {
    try {
      const result = await capable.measureUserAgentSpecificMemory();
      if (validByteCount(result.bytes)) {
        return Object.freeze({ source: 'user-agent-specific', bytes: result.bytes });
      }
    } catch {
      // The API rejects without cross-origin isolation; fall back when possible.
    }
  }

  const usedHeapBytes = capable.memory?.usedJSHeapSize;
  return validByteCount(usedHeapBytes)
    ? Object.freeze({ source: 'chromium-heap', bytes: usedHeapBytes })
    : null;
}
