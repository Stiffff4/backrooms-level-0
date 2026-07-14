import { describe, expect, it } from 'vitest';
import { getContextRecoveryCopy } from '../../src/ui/ContextRecoveryScreen';
import { getCapabilityScreenCopy } from '../../src/ui/IncompatibilityScreen';

describe('copias de compatibilidad y recuperación', () => {
  it('explica una incompatibilidad sin jerga de implementación', () => {
    const copy = getCapabilityScreenCopy('incompatible');

    expect(copy.title).toContain('navegador');
    expect(copy.description).toContain('partida completa');
  });

  it('diferencia pérdida, reconstrucción y fallo de contexto', () => {
    expect(getContextRecoveryCopy('lost').description).toContain('pausada');
    expect(getContextRecoveryCopy('restoring').busy).toBe(true);
    expect(getContextRecoveryCopy('failed', 'Fallo controlado').description).toBe(
      'Fallo controlado',
    );
  });
});
