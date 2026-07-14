import { describe, expect, it } from 'vitest';
import { parseDebugOptions } from '../../src/debug/QueryParams';

describe('parseDebugOptions', () => {
  it('sanitiza y limita la seed reflejada', () => {
    const result = parseDebugOptions('?seed=%3Cimg%20src=x%3Ethreshold', 'production');

    expect(result.seed).toBe('-img-src-x-threshold');
    expect(result.seed.length).toBeLessThanOrEqual(64);
  });

  it('solo habilita exitNow en desarrollo o junto a debug en la build estática de QA', () => {
    const query = '?debug=1&exitNow=1';

    expect(parseDebugOptions('?exitNow=1', 'development').exitNow).toBe(true);
    expect(parseDebugOptions(query, 'production').exitNow).toBe(true);
    expect(parseDebugOptions(query, 'development').exitNow).toBe(true);
  });
});
