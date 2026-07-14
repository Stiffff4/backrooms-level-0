export interface DebugOptions {
  seed: string;
  debug: boolean;
  quality: 'low' | 'default' | 'high' | null;
  exitNow: boolean;
  noAudio: boolean;
}

const maximumSeedLength = 64;

function normalizeSeed(value: string | null): string {
  const trimmed = value?.trim().slice(0, maximumSeedLength) ?? '';
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
  return safe || `threshold-${new Date().toISOString().slice(0, 10)}`;
}

export function parseDebugOptions(
  search: string,
  environment: 'development' | 'production' = import.meta.env.DEV ? 'development' : 'production',
): DebugOptions {
  const params = new URLSearchParams(search);
  const debug = params.get('debug') === '1';
  const requestedQuality = params.get('quality');
  const quality =
    requestedQuality === 'low' || requestedQuality === 'default' || requestedQuality === 'high'
      ? requestedQuality
      : null;

  return {
    seed: normalizeSeed(params.get('seed')),
    debug,
    quality,
    exitNow: (environment === 'development' || debug) && params.get('exitNow') === '1',
    noAudio: params.get('noAudio') === '1',
  };
}
