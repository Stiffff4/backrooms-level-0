import { describe, expect, it } from 'vitest';
import type { ExitWallPlacement } from '../../src/exit/exit.presentation.types';
import { insetExitWallPlacement } from '../../src/exit/ExitPlacement';

const nominalPlacement: ExitWallPlacement = {
  roomId: 'room-test',
  surfaceId: 'north-wall',
  center: { x: 4, y: 1.15, z: 8 },
  inwardNormal: { x: 0, y: 0, z: -2 },
  width: 2.8,
  height: 2.45,
  seed: 'placement-test',
};

describe('insetExitWallPlacement', () => {
  it('moves the whole placement from the logical boundary to the visible wall face', () => {
    const inset = insetExitWallPlacement(nominalPlacement, 0.2);

    expect(inset.center).toEqual({ x: 4, y: 1.15, z: 7.8 });
    expect(inset.inwardNormal).toEqual({ x: 0, y: 0, z: -1 });
    expect(nominalPlacement.center).toEqual({ x: 4, y: 1.15, z: 8 });
  });

  it('rejects negative or non-finite inset distances', () => {
    expect(() => insetExitWallPlacement(nominalPlacement, -0.01)).toThrow(/non-negative/i);
    expect(() => insetExitWallPlacement(nominalPlacement, Number.NaN)).toThrow(RangeError);
  });
});
