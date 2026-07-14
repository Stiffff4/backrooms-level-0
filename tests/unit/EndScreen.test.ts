import { describe, expect, it } from 'vitest';
import { formatSessionDuration } from '../../src/ui/EndScreen';

describe('formatSessionDuration', () => {
  it('muestra minutos y segundos con ancho estable', () => {
    expect(formatSessionDuration(0)).toBe('00:00');
    expect(formatSessionDuration(65.9)).toBe('01:05');
    expect(formatSessionDuration(18 * 60)).toBe('18:00');
  });

  it('añade horas sin perder precisión visual', () => {
    expect(formatSessionDuration(3_661)).toBe('01:01:01');
    expect(formatSessionDuration(360_061)).toBe('100:01:01');
  });

  it('normaliza duraciones inválidas para no mostrar valores rotos', () => {
    expect(formatSessionDuration(-1)).toBe('00:00');
    expect(formatSessionDuration(Number.NaN)).toBe('00:00');
    expect(formatSessionDuration(Number.POSITIVE_INFINITY)).toBe('00:00');
  });
});
