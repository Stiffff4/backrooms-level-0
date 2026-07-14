import { describe, expect, it } from 'vitest';

import { measureBrowserMemory } from '../../src/performance/browserMemory';

describe('measureBrowserMemory', () => {
  it('prefers the user-agent-specific API when available', async () => {
    const fakePerformance = {
      measureUserAgentSpecificMemory: async () => ({ bytes: 42_000 }),
      memory: { usedJSHeapSize: 12_000 },
    } as unknown as Performance;

    await expect(measureBrowserMemory(fakePerformance)).resolves.toEqual({
      source: 'user-agent-specific',
      bytes: 42_000,
    });
  });

  it('falls back to Chromium heap data when isolation measurement rejects', async () => {
    const fakePerformance = {
      measureUserAgentSpecificMemory: async () => Promise.reject(new Error('not isolated')),
      memory: { usedJSHeapSize: 12_000 },
    } as unknown as Performance;

    await expect(measureBrowserMemory(fakePerformance)).resolves.toEqual({
      source: 'chromium-heap',
      bytes: 12_000,
    });
  });

  it('returns null for unavailable or invalid browser counters', async () => {
    await expect(measureBrowserMemory({} as Performance)).resolves.toBeNull();
    await expect(
      measureBrowserMemory({ memory: { usedJSHeapSize: Number.NaN } } as unknown as Performance),
    ).resolves.toBeNull();
  });
});
